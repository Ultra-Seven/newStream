import random
import struct
import json
import flask
import time
import numpy as np
from threading import Thread
from Queue import Queue
from StringIO import StringIO
from ds import *

from flask import Flask, render_template, Response, request, stream_with_context
from flask_socketio import SocketIO, send, emit

app = Flask(__name__)
flask.val = 0
flask.dist = []
flask.dist_update_time = None
flask.queries = {}

@app.route("/")
def index():
  return render_template("index.html")



  

@app.route("/setval")
def setval():
  print json.loads(request.args['val'])
  flask.val = 9 
  return Response("ok", mimetype="application/wu")

@app.route("/register/querytemplate", methods=["post"])
def register_qtemplate():
  data = json.loads(request.data)
  flask.queries[data["qid"]] = data
  if data.get("name") == "cubequery":
    print "got a cube query template"
  return Response("ok", mimetype="application/wu")

@app.route("/distribution/set", methods=["post"])
def dist_set():
  flask.dist = json.loads(request.data)
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
  manager = Manager()
  # manager.add_data_structure()
  #return Response(manager(), mimetype="text/event-stream")

  q = "SELECT a - a%:a, avg(d)::int FROM data WHERE b = :b GROUP BY a - a%:a"
  pp = ProgressivePrecompute(None, [q])
  #s = pp.lookup_bytes(text(q), dict(a=1, b=0))
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


class Manager(object):
  def __init__(self):
    self.data_structs = []
    self.block_size = 50

  def add_data_structure(self, ds):
    self.data_structs.append(ds)

  def __call__(self):
    while 1:
      time.sleep(0.001)
      if flask.dist == None: continue

      (query, prob) = tuple(max(flask.dist, key=lambda pair: pair[1]))
      qid = query['qid']
      flask.dist = None
      if prob == 0: continue

      # magically turn query into the appropriate data structure key...
      ds, iterable = self.get_iterable(query, prob)
      if iterable is None: continue
      for block in iterable:
        # write the header: length of the block and the data structure's encoding id
        yield struct.pack("2I", len(block), ds.id)
        yield block


  def get_iterable(self, query, prob):
    """
    returns the data structure and an a result iterable, or (None, None) if query can't be answered
    """
    costs = [(ds, ds.cost_est(q)) for ds in self.data_structs]
    costs = filter(lambda ds, c: c is not None, costs)
    if not costs: return None, None
    ds, min_cost = min(costs, key=lambda ds, c: c)
    return ds, ds.get_iter(query, self.blocksize)


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
  app.run(host="localhost", port=5000, debug=1, threaded=1)#