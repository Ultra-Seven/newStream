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

@app.route("/")
def index():
  return render_template("index.html")


def round_robin_manager(dist):
  """
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



  

@app.route("/setval")
def setval():
  print json.loads(request.args['val'])
  flask.val = 9 
  return Response("ok", mimetype="application/wu")

@app.route("/distribution/set")
def dist_set():
  flask.dist = json.loads(request.args['dist'])
  return Response("ok", mimetype="application/wu")


@app.route("/data")
def data():
  q = "SELECT a - a%:a, avg(d)::int FROM data WHERE b = :b GROUP BY a - a%:a"
  pp = ProgressivePrecompute(None, [q])
  s = pp.lookup_bytes(text(q), dict(a=1, b=0))
  #s = encode_table(["a", "b"], zip(range(10), range(10)))
  def f():
    #yield struct.pack("2s", "hi")
    #return
    for i in xrange(5000):
      yield struct.pack("2I", 0, len(s))
      yield s
  return Response(f(),
                  mimetype="text/event-stream")



def gen_fake_data():
  arr = np.zeros(10000).astype(np.uint8)
  bstr = arr.tobytes()
  start = time.time()
  while (time.time() - start) < 5:
    yield bstr
    time.sleep(0.001)
    if arr[0] != flask.val:
      #print "setting ", arr[0], " to ", flask.val
      arr[:] = flask.val
      bstr = arr.tobytes()

  #import json
  #yield json.dumps("[1,2]")
  #return


if __name__ == '__main__':
  app.run(host="localhost", port=5000, debug=1, threaded=1)#