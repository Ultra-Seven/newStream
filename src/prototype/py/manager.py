import random
import struct
import json
import flask
import time
import math
import numpy as np
from collections import defaultdict


class Manager(object):
  def __init__(self):

    # Keeps 
    self.data_structs = defaultdict(list)

    # default block size in bytes for sending back to client
    self.block_size = 500

    # when was the last distribution from the client?
    self.prev_dist_update_time = None

    # the ring buffer setting
    self.use_ringbuf = True
    self.ringbuf = None

  def add_data_structure(self, ds):
    self.data_structs[ds.id].append(ds)
    if flask.DEBUG:
      print "added data structure id %d" % ds.id

  def has_data_structure(self, tid):
    return tid in self.data_structs

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
        # todo: change this to make the system work like a stream
        continue

      if flask.DEBUG and flask.log_scheduler:
        flask.logger.log('2 : before scheduler')

      # result = self.naive_schedule()
      result = self.proportion_schedule(True)
      # result = self.test_schedule(True);
      for header, content in result:
        yield header
        yield content

      if flask.DEBUG and flask.log_scheduler:
        flask.logger.log('3 : after scheduler')
      if flask.DEBUG:
        flask.logger.writeLog()

  def test_schedule(self, use_ringbuf=False):
    dist = flask.dist
    times = sorted(dist.keys(), key=lambda x:int(x))
    if len(times) == 1:
      return self.proportion_schedule(use_ringbuf)
    else:
      return []

  def proportion_schedule(self, use_ringbuf=False):
    """
    proportion_schedule

    What queries to answer:
      answer all query whose probability is not zero.
    
    How many to send:
      memory allocation for each time frame is in a logarithmic fashion.
      In each time frame, send back data that is proportional to probability.

    Which parts to send:
      1. Use a dictionary in DS object to track which to send next, in a
         circular manner.
      2. Use ring buffer synchronization to determine which to send.

    """
    dist = flask.dist
    times = sorted(dist.keys(), key=lambda x:int(x))
    remain_size = self.block_size
    size = 0
    total_time = int(times[-1])
    num_times = len(times)
    print times
    for i in range(num_times):
      time = times[i]
      if i == num_times - 1 or int(time) == 0:
        # last time frame or exact query
        size = remain_size
        print i, num_times, int(time)
      else:
        # logarithmic allocation of memory
        size = remain_size * (1 - float(time)/total_time)
        print i, time, total_time, size

      if flask.DEBUG and flask.log_scheduler:
        flask.logger.log("105 : allocate %d bytes for time %s" % (size, time))

      remain_size = remain_size - size
      s = size

      Dist = sorted(dist[time], key=lambda pair: pair[1])
      self.prev_dist_update_time = flask.dist_update_time
      for d in Dist:
        (query, prob) = tuple(d)
        if prob == 0:
          break

        bs = math.floor(size * prob)
        if use_ringbuf and self.ringbuf:
          ds, iterable = self.get_iterable(query, prob, block_size=bs, restart=False, ringbuf_sync=True, ringbuf=self.ringbuf)
        else:
          ds, iterable = self.get_iterable(query, prob, block_size=bs, restart=False)
        for block in iterable:
          # write the header: length of the block and the data structure's encoding id
          # if flask.DEBUG:
            # print "ds.id: %d\tenc: %d\tlen: %d" % (ds.id, ds.encoding, len(block))
          yield (struct.pack("2I", len(block), ds.encoding), block)
          if flask.DEBUG and flask.log_send_data:
            flask.logger.log("104 : send data %d bytes for prob %f" % (len(block), prob))

          s = s - len(block) - 8
          if s <= 0: break


  def naive_schedule(self):
    """
    Naive scheduling

    What queries to answer:
      Only answer the query in the nearest future with the largest probability.
    
    How many to send:
      Send all data for one query.

    Which parts to send:
      All the parts
    """
    key = min(flask.dist.keys(), key=lambda x:int(x))
    (query, prob) = tuple(max(flask.dist[key], key=lambda pair: pair[1]))
    self.prev_dist_update_time = flask.dist_update_time
    if prob == 0: 
      return

    ds, iterable = self.get_iterable(query, prob)
    if iterable is None: return
    for block in iterable:
      # write the header: length of the block and the data structure's encoding id
      if flask.DEBUG:
        print "\n\nds.id: %d\tenc: %d\tlen: %d" % (ds.id, ds.encoding, len(block))
      yield (struct.pack("2I", len(block), ds.encoding), block)

  def get_iterable(self, query, prob, **kwargs):
    """
    Picks the best data structure to answer this query and returns an iterator of byte blocks.

    We currently make a strong assumption that each query request is accompanied by
    a query template id that directly matches <= 1 data structure id
    on the server.

    XXX: note that we ignore prob right now, and that get_iter() returns full results

    @returns if a data structure can answer the query, 
             then returns a tuple (data structure, result iterable), 
             or (None, None) if query can't be answered
    """
    template = query['template']
    tid = template['tid']
    name = template['name']
    args = query["data"]

    if tid not in self.data_structs: 
      return None, None

    # find the data struture with the minimum cost
    dses = self.data_structs[tid]
    costs = [(ds.cost_est(args), ds) for ds in dses]
    costs = filter(lambda (cost, ds): cost is not None, costs)
    if not costs: 
      return None, None

    mincost, best_ds = min(costs)
    # TODO: you probably will want to change the signature of get_iter() in order to control 
    #       partial results.
    return best_ds, best_ds.get_iter(args, **kwargs)




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
  block_size = 50
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



