import bsddb3
import struct
import json
import flask
import time
from threading import Thread
from Queue import Queue
from StringIO import StringIO
from sqlalchemy import text
from sqlalchemy.sql.elements import TextClause
from table_pb2 import *

"""
Data structures need to

* have an id

They need to provide server methods

    cost_est(q):float or None
    get_data_for(q):iter<bytearray>  // each block is good enough to "quer"

They need to provide client methods

    __call__(q, bytearay_block)

"""

"""
Normal Queries

    cost_est = 1
    get_data_for(q): [result byte array]
    run_query(q, bytearray) = decode(bytearray)

"""
class DS(object):
  id = 0
  def __init__(self):
    self.id = DS.id
    DS.id += 1

  def setup(self):
    """
    setup any offline data structures
    """
    pass

  def cost_est(self, q):
    return None


class CubeDataStruct(DS):
  def __init__(self, db, select, fr, groupby):
    self.name = "cubequery"

class ProgressivePrecompute(DS):
  """
  Precomputes templated queries
  """

  def __init__(self, db, query_templates):
    super(ProgressivePrecompute, self).__init__()
    def to_text(qstr):
      if not isinstance(qstr, TextClause):
        return text(qstr)
      return qstr

    self.name = "progprecompute"
    self.db = db
    self.query_templates = map(to_text, query_templates)
    self.cache = bsddb3.hashopen("./pprecompute.cache")

  def __call__(self, query, block_size=50):
    for q in self.query_templates:
      res = self.lookup(q, query)
      if res: return res
    return None

  def get_iter(self, query, block_size=50):
    for q in self.query_templates:
      res = self.lookup(q, query)
      if res: return res
    return None

  def setup_cache(self, param_ranges):
    """
    This is called ahead of time to create data structures

    @param_ranges dictionary of param name --> iterable of assignable values
    """
    from itertools import product
    names = param_ranges.keys()
    iters = map(param_ranges.get, names)
    for i, vals in enumerate(product(*iters)):
      args = dict(zip(names, vals))
      self.cache_query_with_args(args)

      if i % 50 == 0: print args
    print "cache contains %d items" % len(self.cache)

  def key(self, q, args):
    keys = tuple([c.key for c in q.get_children()])
    return "%d%d" % (hash(keys), hash(tuple(map(args.get, keys))))

  def cache_query_with_args(self, args):
    for q in self.query_templates:
      key = self.key(q, args)
      if key in self.cache: continue
      cur = self.db.execute(q, args)
      schema = cur.keys()
      rows = cur.fetchall()
      self.cache[key] = encode_table(schema, rows)

  def lookup(self, q, args):
    s = self.lookup_bytes(q, args)
    if not s: return None, None
    return decode_table(s)

  def lookup_bytes(self, q, args):
    key = self.key(q, args)
    if key in self.cache:
      return self.cache[key]
    return None



class NaiveQuery(DS):
  def __init__(self):
    super(NaiveQuery, self).__init__()
    self.name = "naivequery"

  def cost_est(self, q): 
    return 1

  def __call__(self, q): 
    schema = ["a", "b", "c"]
    rows = [[x*y for y in xrange(3)] for x in xrange(20)]
    def f():
      yield encode_table(schema, rows)
    return f()



def decode_table(buf):
  table = Table()
  table.ParseFromString(buf)
  return table

def encode_table(schema, rows):
  """
  assume everything is uints
  @schema list of attr names
  @rows 
  """
  s = Table.Schema()
  s.name.extend(schema)
  table = Table(schema=s)
  table.cols.extend(Table.Col(val=col) for col in zip(*rows))
  return table.SerializeToString()
