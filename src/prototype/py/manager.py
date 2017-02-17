import random
import struct
import json
import flask
import time
import numpy as np


class Manager(object):
  def __init__(self):
    self.data_structs = {}
    self.block_size = 50
    self.prev_dist_update_time = None

  def add_data_structure(self, ds):
    self.data_structs[ds.id] = ds
    if flask.DEBUG:
      print "added data structure id %d" % ds.id

  def has_data_structure(self, qid):
    return qid in self.data_structs

  def __call__(self):
    """
    Infinite loop that reads the current query distribution and decides what bytes to send over the stream.
    Currently, it just takes the highest probability query and blindly sends it (if there is data)
    """
    while 1:
      time.sleep(0.001)
      if not flask.dist: 
        continue
      if self.prev_dist_update_time == flask.dist_update_time:
        continue

      (query, prob) = tuple(max(flask.dist, key=lambda pair: pair[1]))
      self.prev_dist_update_time = flask.dist_update_time
      if prob == 0: 
        continue

      ds, iterable = self.get_iterable(query, prob)
      if iterable is None: continue
      for block in iterable:
        # write the header: length of the block and the data structure's encoding id
        if flask.DEBUG:
          print "\n\nds.id: %d\tenc: %d\tlen: %d" % (ds.id, ds.encoding, len(block))
        yield struct.pack("2I", len(block), ds.encoding)
        yield block


  def get_iterable(self, query, prob):
    """
    Picks the best data structure to answer this query and returns an iterator of byte blocks.

    We currently make a strong assumption that each query request is accompanied by
    a query template id that directly matches <= 1 data structure id
    on the server.

    @returns if a data structure can answer the query, 
             then returns a tuple (data structure, result iterable), 
             or (None, None) if query can't be answered
    """
    template = query['template']
    qid = template['qid']
    args = query["data"]
    if qid not in self.data_structs: 
      return None, None

    # TODO: support multiple data structures that may answer the query
    ds = self.data_structs[qid]
    cost = ds.cost_est(args)
    if cost is None: 
      return None, None
    return ds, ds.get_iter(args)











def round_robin_manager(dist):
  """
  OLD CODE

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



