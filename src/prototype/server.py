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
from py.debug import *
from py.ringbuf import *
from py.latency import Latency

import datetime


app = Flask(__name__)
app.config.from_object('configure.Config')
# Latency(app)

# ------------------------------------
# latency simulation
# 
def before_latency():
  t = 0.1
  time.sleep(t)

# def after_latency(response):
#   t = 1
#   time.sleep(t)
#   return response

app.before_request(before_latency)
# app.after_request(after_latency)

# ------------------------------------
# stop logging HTTP logs for debug
# 
# import logging
# log = logging.getLogger('werkzeug')
# log.setLevel(logging.ERROR)

# ------------------------------------
# Global variables
#
flask.DEBUG = app.config.get('DEBUG', False)
flask.val = 0
flask.dist = []
flask.dist_update_time = None
flask.queries = {}
flask.default_ringbuf_size = app.config['DEFAULT_RINGBUF_SIZE']
flask.db = create_engine(app.config['DB_PATH'])
flask.manager = Manager()

if flask.DEBUG:
  flask.logger = DebugLogger(toFile=True, logPath=app.config['LOG_PATH'])

# logger configurations
flask.log_scheduler = app.config['LOG_SCHEDULER']
flask.log_ringbuf = app.config['LOG_RINGBUF']
flask.log_send_data = app.config['LOG_SEND_DATA']
flask.log_get_dist = app.config['LOG_GET_DIST']

@app.route("/")
def index():
  return render_template("index.html")

@app.route("/attr/map", methods=["post", "get"])
def map_stats():
  """
  Used by client to get the domain of the x and y axis expressions/attributes

  opts: {
    table: <table name>
    attrs: {
        <attrname>: <data type> ("continuous" | "discrete")
    }
  }
  """
  sql = "SELECT %s FROM %s WHERE %s"

  opts = json.loads(request.data)
  table = opts['table']
  s = ["%s AS %s" % (expr, alias) for alias, expr in opts['select'].items()]
  s = ", ".join(s)
  where = ["true"]
  contattrs = []
  ret = {}
  for attr, value in opts.get("attrs", {}).items():
    like = "'%" + "z" + str(value) + "%'"
    where.append("%s LIKE %s" % (attr, like))
  where = where and " AND ".join(where)
  q = text(sql % (s, table, where))
  all_result = flask.db.execute(q).fetchall()
  all_list = []
  for x in xrange(0, len(all_result)):
    result_dict = {}
    result_list = list(all_result[x])
    i = 0
    for alias, expr in opts['select'].items():
      result_dict[alias] = result_list[i]
      i = i + 1
    ret[str(x)] = result_dict
    all_list.append(result_dict)
  return Response(json.dumps(all_list))


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
  flask.queries[template["tid"]] = template
  tid = template['tid']
  if flask.manager.has_data_structure(tid): 
    return Response("ok", mimetype="application/wu")

  for ds_klass in ds_klasses:
    if ds_klass.can_answer(template):
      try:
        ds = ds_klass(None, template)
        ds.id = tid
        flask.manager.add_data_structure(ds)
      except Exception as e:
        print e
        continue

  return Response("ok", mimetype="application/wu")

@app.route("/register/ringbuffersize", methods=["post"])
def register_ringbuf_size():
  """
  Registers the size of the ring buffer of the client. Create a ring buffer
  at server side with the same size.
  """
  args = json.loads(request.data)
  size = args.get('size', flask.default_ringbuf_size)
  if flask.manager.ringbuf == None and flask.manager.use_ringbuf:
    flask.manager.ringbuf = ringbuf(size)
  if flask.DEBUG:
    flask.logger.log("4 : set ringbuffer size to %d bytes" % size)
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
  if flask.DEBUG and flask.log_get_dist:
    # print "got query distribution"
    flask.logger.log('1 : get dist: %s' % [(t, len(flask.dist[t])) for t in flask.dist.keys()])
    # flask.logger.writeLog()
  return Response("ok", mimetype="application/wu")


@app.route("/log/write", methods=["post"])
def writeLogToFile():
  """
  TODO
  """
  data = json.loads(request.data)
  fileName = './test/' + data["file"] + ".txt"
  with open(fileName, 'w') as outfile:
    json.dump(data["data"], outfile)
  return Response("ok", mimetype="application/wu")

@app.route("/log/getMouse", methods=["post"])
def getMouseFromFile():
  """
  TODO
  """
  data = json.loads(request.data)
  with open('./test/' + data["file"]) as data_file:    
    data = json.load(data_file)
  return Response(json.dumps(data))

@app.route("/log/writeResults", methods=["post"])
def drawPredictorResults():
  """
  TODO
  """
  data = json.loads(request.data)
  fileName = './test/' + data["file"] + ".txt"
  rawFileName = './test/' + data["file"] + "_raw.txt"
  with open(fileName, 'w') as outfile:
    json.dump(data["data"], outfile)
  with open(rawFileName, 'w') as outfile:
    json.dump(data["raw"], outfile)
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