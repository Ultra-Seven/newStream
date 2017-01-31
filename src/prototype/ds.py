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

"""
Data structures need to

* have an id

They need to provide server methods

    cost_est(q):float or None
    get_data_for(q):iter<bytearray>  // each block is good enough to "quer"

They need to provide client methods

    run_query(q, bytearay_block)

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


class ProgressivePrecompute(DS):
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

  def __call__(self, args):
    for q in self.query_templates:
      return self.lookup(q, args)

  def setup_cache(self, param_ranges):
    """
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
    return decode_table(StringIO(s))

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
  schema = decode_schema(buf)
  cols = []
  for attr in schema:
    cols.append(decode_col(buf))
  return schema, cols

def decode_schema(buf):
  nattrs, = struct.unpack("b", buf.read(1))
  attrs = []
  for i in xrange(nattrs):
    slen, = struct.unpack("b", buf.read(1))
    attr, = struct.unpack("%ss"%slen, buf.read(slen))
    attrs.append(attr)
  return attrs

def decode_col(buf):
  nrows, = struct.unpack("I", buf.read(4))
  col = struct.unpack("%dI" % nrows, buf.read(4*nrows))
  return col

def encode_table(schema, rows):
  """
  assume everything is uints
  @schema list of attr names
  @rows 
  """
  cols = zip(*rows)
  bschema = encode_schema(schema)
  buf = StringIO()
  buf.write(bschema)
  for col in cols:
    bcol = encode_col(col)
    buf.write(bcol)
  return buf.getvalue()

def encode_col(col):
  buf = StringIO()
  buf.write(struct.pack("I", len(col)))
  buf.write(struct.pack("%dI" % len(col), *col))
  val = buf.getvalue()
  buf.close()
  return val

def encode_schema(schema):
  schema_buf = StringIO()
  schema_buf.write(struct.pack("b", len(schema)))
  for attr in schema:
    schema_buf.write(struct.pack("b", len(attr)))
    schema_buf.write(struct.pack("%ds" % len(attr), str(attr)))
  val = schema_buf.getvalue()
  schema_buf.close()
  return val


