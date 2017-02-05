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
from flask_socketio import SocketIO, send, emit

from ds import *
from manager import *


app = Flask(__name__)
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
  opts: {
    table: <str>
    attrs: {
        <attrname>: <data type> ("continuous" | "discrete")
    }
  }
  """
  discq = "SELECT DISTINCT %s FROM %s ORDER BY %s" 

  opts = json.loads(request.data)
  table = opts['table']
  contattrs = []
  ret = {}
  for attr, typ in opts.get("attrs", {}).items():
    if typ == "discrete":
      q = discq % (attr, table, attr)
      ret[attr] = zip(*flask.db.execute(q).fetchall())[0]
    else:
      contattrs.append(attr)

  if contattrs:
    s = ["min(%s), max(%s)" % (a, a) for a in contattrs]
    s = ", ".join(s)
    q = "SELECT %s FROM %s" % (s, table)
    row = flask.db.execute(q).fetchone()
    for i, a in enumerate(contattrs):
      minv, maxv = row[i*2], row[i*2+1]
      ret[a] = [minv, maxv]

  return Response(json.dumps(ret))

@app.route("/setval")
def setval():
  print json.loads(request.args['val'])
  flask.val = 9 
  return Response("ok", mimetype="application/wu")

@app.route("/register/querytemplate", methods=["post"])
def register_qtemplate():
  template = json.loads(request.data)
  flask.queries[template["qid"]] = template
  qid = template['qid']
  if flask.manager.has_data_structure(qid): 
    return Response("ok", mimetype="application/wu")

  print template
  for ds_klass in ds_klasses:
    if template.get('name') == ds_klass.name:
      ds = ds_klass(None, template)
      ds.id = template['qid']
      flask.manager.add_data_structure(ds)
      print "got a cube query template"
  return Response("ok", mimetype="application/wu")

@app.route("/distribution/set", methods=["post"])
def dist_set():
  """
  A distribution is a list of [query, probability]
  where query is a dictionary:  {
    template: <output of js template's .toWire()>
    data: { paramname: val }
  }
  """
  flask.dist = json.loads(request.data)
  for pair in flask.dist:
    q = pair[0]
    t = q['template']
    print "dist/set: ", t['qid'], flask.queries.get(t['qid'], None)
  return Response("ok", mimetype="application/wu")


@app.route("/data")
def data():
  """
  This API opens the data stream and starts sending data.
  It currently just sits around in an infinite loop and when it detects that the 
  query distribution has been set, tries to send back the results for the highest probability query.

  In effect, this implements a basic request-response model of interaction.


  """
  # actual code could
  # 1. look at look at the distribution
  # 2. pick top prob and return it
  # 3. clear the distribution
  # 

  return Response(flask.manager(), mimetype="test/event-stream")
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



def round_robin_manager(dist):
  """
  The pseudocode for a naive manager that uses the available data strutures to map each query to _some_ iterable.
  It then randomly samples from the iterables with respect to the current query distribution.
  There isn't anything in place to change policies based on a new query distribution.

  dist: [query, prob]
  query can be SPJA queries
  q = table |
      { select: attrs, from: [qs], where: [preds], gb: [attrs] }


  output is interleaves as blocks.  The encoding is simple:
    [[encoding id] [block size] [..data...]]*
  """
  data_structs = []
  iters = []
  block_size = 50 # bytes
  for q, prob in dist:
    costs = [(ds, ds.cost_est(q)) for ds in data_structs]
    costs = filter(lambda ds, c: c is not None, costs)
    ds, min_cost = min(costs, key=lambda ds, c: c)
    d_iter = ds.get_iter(q, block_size)
    iters.append((d_iter, prob))

  repl_iters = []
  for i, p in dist:
    for _ in xrange(p * 100):
      repl_iters.append(i)
   
  # interleave blocks from the iterators
  while repl_iters:
    idx = int(random() * len(repl_iters))
    i = repl_iters[idx]
    if i.has_next():
      yield(i.next())
    if not i.has_next():
      # remove all i
      sidx = eidx = idx
      while repl_iters[sidx] == i:
        sidx -= 1
      while repl_iters[eidx] == i:
        eidx += 1
      repl_iters = repl_iters[:sidx+1] + repl_iters[eidx-1:]





if __name__ == '__main__':
  import psycopg2
  DEC2FLOAT = psycopg2.extensions.new_type(
    psycopg2.extensions.DECIMAL.values,
    'DEC2FLOAT',
    lambda value, curs: float(value) if value is not None else None)
  psycopg2.extensions.register_type(DEC2FLOAT)
  app.run(host="localhost", port=5000, debug=1, threaded=1)#