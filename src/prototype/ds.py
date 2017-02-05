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
from itertools import product, chain, combinations


def powerset(iterable):
  "powerset([1,2,3]) --> () (1,) (2,) (3,) (1,2) (1,3) (2,3) (1,2,3)"
  s = list(iterable)
  return chain.from_iterable(combinations(s, r) for r in range(len(s)+1))


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




class DS(object):
  """
  Data structures need to

  * have an id

  They need to provide server methods

      cost_est(q):float or None
      get_data_for(q):iter<bytearray>  // each block is good enough to "quer"

  They need to provide client methods

      __call__(q, bytearay_block)

  """

  def __init__(self):
    # this id is the template id
    self.id = None

    # the encoding identifier.  unique to a data structure class
    self.encoding = 0

  def setup(self):
    """
    setup any offline data structures
    """
    pass

  def cost_est(self, args):
    """
    args is the "data" attribute in the output of the client's
    Query.toWire()
    """
    return None




class Precompute(DS):
  """
  Precomputes templated queries
  """
  name = "precompute"

  def __init__(self, db, *args, **kwargs):
    super(Precompute, self).__init__()
    self.name = Precompute.name
    self.db = db
    self.fname = kwargs.get("fname", "precompute.cache")
    self.cache = bsddb3.hashopen(self.fname)

    print "loaded Precompute file %s" % self.fname
    print "%d items" % len(self.cache)

  def __call__(self, args, block_size=50):
    return self.lookup(self.key(args))

  def get_iter(self, args, block_size=50):
    block = self.lookup_bytes(self.key(args))
    if block:
      key = self.key(args)
      print "write out key: ", key, self.id
      buf = StringIO()
      buf.write(struct.pack("2I", len(key), self.id))
      buf.write(struct.pack("%ds" % len(key), key))
      buf.write(block)
      yield buf.getvalue()
      buf.close()

  def key(self, args):
    return json.dumps(sorted(args.items())).replace(" ", "")

  def setup_cache(self, query_iterable):
    """
    This is called ahead of time to create data structures

    query_iterable is an iterator that yields pairs of (key, db.exec args) to run
    """
    for key, exec_args in query_iterable:
      cur = self.db.execute(*exec_args)
      schema = cur.keys()
      rows = cur.fetchall()
      self.cache[key] = encode_table(schema, rows)

  def lookup(self, key):
    s = self.lookup_bytes(key)
    if not s: return None, None
    return decode_table(s)

  def lookup_bytes(self, key):
    return self.cache.get(key, None)

  def cost_est(self, args):
    print "cost_est", self.key(args)
    if self.key(args) in self.cache:
      return 1
    return None



class CubeDataStruct(Precompute):
  name = "cubequery"
  def __init__(self, db, spec, *args, **kwargs):
    """
    spec = {
        select: { alias: expr },
        fr: <tablename>,
        groupby: [ "expr", ... ],
        params: { attr: <data type "num" or "str"> }
    }
    """
    fname = "cube_%s.cache" % ",".join(spec["groupby"])
    kwargs['fname'] = kwargs.get("fname", fname)
    super(CubeDataStruct, self).__init__(db, *args, **kwargs)

    self.name = CubeDataStruct.name
    self.spec = spec
    self.encoding = 1

  def spec_to_sql(self, params):
    qtemplate = """ SELECT %s FROM %s WHERE %s GROUP BY %s """
    s = ["%s AS %s" % (expr, alias) for alias, expr in self.spec['select'].items()]
    s = ", ".join(s)
    g = ", ".join(self.spec["groupby"])
    w = ["true"]
    for attr, val in params.iteritems():
      if attr in self.spec['params']:
        if self.spec['params'][attr] == "num":
          w.append("%s = %s" % (attr, val))
        else:
          w.append("%s = '%s'" % (attr, val))
    w = w and " AND ".join(w) 
    q = text(qtemplate % (s, self.spec["fr"], w, g))
    return q

  def setup_cache(self, param_ranges):
    def f():
      all_names = param_ranges.keys()
      for names in powerset(all_names):
        print names
        iters = map(param_ranges.get, names)
        for i, vals in enumerate(product(*iters)):
          args = dict(zip(names, vals))
          key = self.key(args)
          q = self.spec_to_sql(args)
          yield key, [q]

    Precompute.setup_cache(self, f())



class SQLTemplates(Precompute):
  """
  Precomputes templated queries

  The query template is expresed as a SQL string with parameters
  """
  name = "templates"

  def __init__(self, db, query_templates, *args, **kwargs):
    super(SQLTemplates, self).__init__(db, *args, **kwargs)
    def to_text(qstr):
      if not isinstance(qstr, TextClause):
        return text(qstr)
      return qstr

    self.name = SQLTemplates.name
    self.query_template = to_text(query_template)
    self.encoding = 2

  def key(self, args):
    keys = tuple([c.key for c in q.get_children()])
    return hash(tuple(map(args.get, keys)))

  def setup_cache(self, param_ranges):
    """
    This is called ahead of time to create data structures

    @param_ranges dictionary of param name --> iterable of assignable values
    """
    def f():
      names = param_ranges.keys()
      iters = map(param_ranges.get, names)
      for i, vals in enumerate(product(*iters)):
        args = dict(zip(names, vals))
        yield self.key(args), [self.query_template, args]

        if i % 50 == 0: print args
      print "cache contains %d items" % len(self.cache)
    return Precompute.setup_cache(self, f())




# register relevant data structer classes
ds_klasses = [CubeDataStruct, SQLTemplates]

