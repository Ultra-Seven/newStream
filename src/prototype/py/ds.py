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
  Data structures are parameterized so that they are able to answer particular classes of queries.
  The encoding number specifies the _type_ of data structure (the class)
  The id specifies a particular instance of the data struture.  

  For example, a datacube data structure with encoding 2 may be instantiated
  for queries grouped by (lat, lon, hour), and queries grouped by (hour, month)

  Given a data structure, we can represent a query simply with set of parameter values.

  Data structures expose methods for offline setup and online serving.
  Offline:

    setup()

  Online:

    cost_est(data)
    __call__(data) 
    get_iter(data)
  """

  def __init__(self):
    self.id = None
    self.encoding = None

  def setup(self):
    """
    setup any offline data structures
    """
    pass

  def __call__(self, data):
    return None

  def get_iter(self, data):
    return None

  def cost_est(self, data):
    """
    data is the "data" attribute in the output of the client's Query.toWire()
    Currently, it's a dictionary mapping param names to their values
    """
    return None




class Precompute(DS):
  """
  Helper model for data structuruse that pre-compute and cache results
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

  def __call__(self, data, block_size=50):
    return self.lookup(self.key(data))

  def get_iter(self, data, block_size=50):
    block = self.lookup_bytes(self.key(data))
    if block:
      key = self.key(data)
      buf = StringIO()
      buf.write(struct.pack("2I", len(key), self.id))
      buf.write(struct.pack("%ds" % len(key), key))
      buf.write(block)
      yield buf.getvalue()
      buf.close()

  def key(self, data):
    """
    This maps the query data to a unique key.
    The analagous function in javascript is js/datastruct.js:queryToKey()
    These two functions _must_ match
    """
    return json.dumps(sorted(data.items())).replace(" ", "")

  def setup_cache(self, query_iterable):
    """
    This is called ahead of time to create data structures

    query_iterable is an iterator that yields pairs of (key, db.exec data) to run
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

  def cost_est(self, data):
    if self.key(data) in self.cache:
      return 1
    return None



class GBDataStruct(Precompute):
  name = "gbquery"

  def __init__(self, db, spec, *args, **kwargs):
    """
    spec = {
        select: { alias: expr },
        fr: <tablename>,
        groupby: [ "expr", ... ],
        params: { attr: <data type "num" or "str"> }
    }
    """
    fname = "gb_%s.cache" % ",".join(spec["groupby"])
    kwargs['fname'] = kwargs.get("fname", fname)
    super(GBDataStruct, self).__init__(db, *args, **kwargs)

    self.name = GBDataStruct.name
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
          data = dict(zip(names, vals))
          key = self.key(data)
          q = self.spec_to_sql(data)
          yield key, [q]

    Precompute.setup_cache(self, f())



class SQLTemplates(Precompute):
  """
  Precomputes templated queries

  The query template is expresed as a SQL string with parameters

    SELECT a - a%:a, avg(d)::int 
    FROM data 
    WHERE b = :b 
    GROUP BY a - a%:a

  The above parameterized query can vary the filter condition
  and the discretization of the group by attribute

  TODO: use this data structure
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

  def key(self, data):
    keys = tuple([c.key for c in q.get_children()])
    return hash(tuple(map(data.get, keys)))

  def setup_cache(self, param_ranges):
    """
    This is called ahead of time to create data structures

    @param_ranges dictionary of param name --> iterable of assignable values
    """
    def f():
      names = param_ranges.keys()
      iters = map(param_ranges.get, names)
      for i, vals in enumerate(product(*iters)):
        data = dict(zip(names, vals))
        yield self.key(data), [self.query_template, data]

      print "cache contains %d items" % len(self.cache)
    return Precompute.setup_cache(self, f())




# register relevant data structer classes
ds_klasses = [GBDataStruct, SQLTemplates]

