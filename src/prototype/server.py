import random
import struct
import json
import flask
import time
import numpy as np
from collections import defaultdict
from threading import Thread
from Queue import Queue
from StringIO import StringIO
from sqlalchemy import create_engine
from flask import Flask, render_template, Response, request, stream_with_context

from py.ds import *
from py.manager import *


app = Flask(__name__)

#
# Global variables
#
flask.DEBUG = False
flask.val = 0
flask.dist = []
flask.dist_update_time = None
flask.queries = {}
flask.db = create_engine("postgresql://localhost/test")
flask.manager = Manager()

@app.route("/")
def index():
  return render_template("index.html")


@app.route("/attr/stats", methods=["post", "get"])
def table_stats():
  """
  Used by client to get the domain of the x and y axis expressions/attributes

  opts: {
    table: <table name>
    attrs: {
        <attrname>: <data type> ("continuous" | "discrete")
    }
  }
  """
  discq = "SELECT DISTINCT %s FROM %s ORDER BY %s" 
  contq = "SELECT min(%s), max(%s) FROM %s"

  opts = json.loads(request.data)
  table = opts['table']
  contattrs = []
  ret = {}
  for attr, typ in opts.get("attrs", {}).items():
    if typ == "discrete":
      q = discq % (attr, table, attr)
      ret[attr] = zip(*flask.db.execute(q).fetchall())[0]
    else:
      q = contq % (attr, attr, table)
      ret[attr] = list(flask.db.execute(q).fetchone())

  return Response(json.dumps(ret))


@app.route("/register/querytemplate", methods=["post"])
def register_qtemplate():
  """
  Registers a query template.  Uses the query template name to instantiate (if possible)
  the corresponding data structure based on those in ds_klasses
  """
  template = json.loads(request.data)
  flask.queries[template["qid"]] = template
  qid = template['qid']
  if flask.manager.has_data_structure(qid): 
    return Response("ok", mimetype="application/wu")

  for ds_klass in ds_klasses:
    if template.get('name') == ds_klass.name:
      ds = ds_klass(None, template)
      ds.id = qid
      flask.manager.add_data_structure(ds)

  return Response("ok", mimetype="application/wu")

@app.route("/distribution/set", methods=["post"])
def dist_set():
  """
  Set the current query distribution

  A distribution is currently defined as a list of [query, probability]
  where query is a dictionary:  {
    template: <output of js template's .toWire()>
    data: { paramname: val }
  }

  The corresponding client files are in js/dist.js
  """
  flask.dist = json.loads(request.data)
  flask.dist_update_time = time.time()
  if flask.DEBUG:
    print "got query distribution"
  return Response("ok", mimetype="application/wu")


@app.route("/data")
def data():
  """
  This API opens the data stream and starts sending data via the Manager object.
  The current implementation doesn't take advantage of the streaming nature and simply implements:
  1. waits for a new query distribution,
  2. picks the highest non-zero probability query
  3. sends the cached data to the client

  In effect, this implements a basic request-response model of interaction.


  Details:
    The data stream has a simple encoding:

        [length of payload (32 bits)][encoding id (32 bits)][payload (a byte array)]

    The payload is encoded based on the particular data structure
  """
  return Response(flask.manager(), mimetype="test/event-stream")


@app.route("/fakedata")
def fake_data():
  s = encode_table(["a", "b"], zip(range(10), range(10)))
  header = struct.pack("2I", len(s), 0)

  def f():
    while 1:
      for j in xrange(random.randint(1, 10)):
        yield header
        yield s
      time.sleep(0.001)
      break
  return Response(f(),
                  mimetype="text/event-stream")


if __name__ == '__main__':
  import psycopg2
  DEC2FLOAT = psycopg2.extensions.new_type(
    psycopg2.extensions.DECIMAL.values,
    'DEC2FLOAT',
    lambda value, curs: float(value) if value is not None else None)
  psycopg2.extensions.register_type(DEC2FLOAT)


  app.run(host="localhost", port=5000, debug=0, threaded=1)#