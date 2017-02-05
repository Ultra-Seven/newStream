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

  def add_data_structure(self, ds):
    self.data_structs[ds.id] = ds
    print "added data structure id %d" % ds.id

  def has_data_structure(self, qid):
    return qid in self.data_structs

  def __call__(self):
    while 1:
      time.sleep(0.001)
      if not flask.dist: continue

      (query, prob) = tuple(max(flask.dist, key=lambda pair: pair[1]))
      flask.dist = None
      if prob == 0: continue

      # magically turn query into the appropriate data structure key...
      ds, iterable = self.get_iterable(query, prob)
      if iterable is None: continue
      for block in iterable:
        # write the header: length of the block and the data structure's encoding id
        print "\n\nds.id: %d\tenc: %d\tlen: %d" % (ds.id, ds.encoding, len(block))
        yield struct.pack("2I", len(block), ds.encoding)
        yield block


  def get_iterable(self, query, prob):
    """
    returns the data structure and an a result iterable, or (None, None) if query can't be answered
    """
    template = query['template']
    qid = template['qid']
    args = query["data"]
    if qid not in self.data_structs: return None, None
    ds = self.data_structs[qid]
    costs = [(ds, ds.cost_est(args))]
    print costs
    costs = filter(lambda (ds, c): c is not None, costs)
    if not costs: return None, None
    ds, min_cost = min(costs, key=lambda (ds, c): c)
    return ds, ds.get_iter(args)


