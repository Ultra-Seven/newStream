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

import math


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

  @staticmethod
  def can_answer(query_template):
    """
    @query_template is the output of the client's QueryTemplate.toWire() method.
    """
    return False

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

  def get_iter(self, data, **kwargs):
    """
    XXX: note that it ignores block_size right now
    """
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
    THESE FUNCTIONS MUST MATCH!!
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
      return 100
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

  @staticmethod
  def can_answer(query_template):
    """
    @query_template is the output of the client's QueryTemplate.toWire() method.
    """
    return query_template.get('name') == GBDataStruct.name



class ProgressiveDataStruct(Precompute):
  """
  Python version of js/progds.js

  The signature and spec are the same as GBdataStruct, however it encodes data progressively
  TODO: the data structure that you will implement and fill in
  TODO: write a custom get_iter() in order to return blocks of partial results
  """
  name = "progressive"

  def __init__(self, db, spec, *args, **kwargs):
    """
    spec = {
        select: { alias: expr },
        fr: <tablename>,
        groupby: [ "expr", ... ],
        params: { attr: <data type "num" or "str"> }
    }
    """

    # name of the file cache
    fname = "prog_%s.cache" % ",".join(spec["groupby"])
    kwargs['fname'] = kwargs.get("fname", fname)
    super(ProgressiveDataStruct, self).__init__(db, *args, **kwargs)

    self.name = ProgressiveDataStruct.name
    self.spec = spec
    self.encoding = 2
    self.pos = {}

  def cost_est(self, data):
    """
    Force the cost estimate for progressive data structure to be 
    lower than group by data structure (10 vs 100)
    """
    if self.key(data) in self.cache:
      return 10
    return None


  def spec_to_sql(self, params):
    """
    Translates query parameters into an actual SQL string
    Identical to function in GBDataStruct
    """
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
      """
      This generator yields all SQL queries that should be precomputed
      """
      all_names = param_ranges.keys()
      for names in powerset(all_names):
        print names
        iters = map(param_ranges.get, names)
        for i, vals in enumerate(product(*iters)):
          data = dict(zip(names, vals))
          key = self.key(data)
          q = self.spec_to_sql(data)
          yield key, [q]

    for key, exec_args in f():
      cur = self.db.execute(*exec_args)
      schema = cur.keys()
      rows = cur.fetchall()
      self.cache[key] = self.progressively_encode_table(schema, rows)
    print "cache contains %d items" % len(self.cache)

  def progressively_encode_table(self, schema, rows):
    """
    You can byte encode the progressive data using protocol buffers, or something custom.
    If you plan to do things custom, take a look at StringIO and struct.pack/unpack
    There are examples above
    """
    # TODO: implement me
    raise Exception("Implement Me!")

  def get_iter(self, data, **kwargs):
    """
    get_iter function to get blocks to send back
    
    block_size: size limit, -1 means no limit
    """
    non_stateful = kwargs.get('non_stateful', False)
    ringbuf_sync = kwargs.get('ringbuf_sync', False)
    it = None
    if ringbuf_sync:
      it = self.get_iter_ringbuf_sync(data, **kwargs)
    else:
      it = self.get_iter_non_stateful(data, **kwargs)

    for block in it:
      yield block

  def get_iter_ringbuf_sync(self, data, **kwargs):
    key = self.key(data)
    block_size = kwargs.get('block_size', -1)
    ringbuf = kwargs.get('ringbuf', None)

    block = self.lookup_bytes(key)
    if block and ringbuf:
      saved_blocks = ringbuf.retrive(
        lambda x: True if x['key']==key else False,
        lambda x: x['id']
        )
      table = ProgressiveTable()
      table.ParseFromString(block)

      indices = [i for i in range(len(table.blocks)) if i not in saved_blocks]
      size = 0
      for i in indices:
        if size > block_size and block_size > 0:
          return
        vsize, val, meta = encode_block(key, table, i)
        # add 8 for header 
        ringbuf.add(vsize + 8, meta)
        yield val
        vsize = size + vsize

  def get_iter_non_stateful(self, data, **kwargs):
    key = self.key(data)
    block_size = kwargs.get('block_size', -1)
    restart = kwargs.get('restart', True)

    block = self.lookup_bytes(key)
    if block:
      startFrom = self.pos[key] if (key in self.pos) and not restart else 0
      table = ProgressiveTable()
      table.ParseFromString(block)
      size = 0
      index = startFrom
      l = len(table.blocks)
      while True:
        # send enough data OR send all data
        if (size > block_size and block_size > 0) or (index == startFrom and size > 0):
          self.pos[key] = index
          return
        vsize, val, meta = encode_block(key, table, index)
        yield val
        size = size + vsize
        index = (index + 1) % l

  def encode_block(self, key, table, index):
    b = table.blocks[index]
    t = ProgressiveTable(blocks=[b])
    buf = StringIO()
    buf.write(struct.pack("2I", len(key), self.id))
    buf.write(struct.pack("%ds" % len(key), key))
    buf.write(t.SerializeToString())
    val = buf.getvalue()
    size = len(val)
    buf.close()
    return (size, val, {'key':key, 'id':index})

  @staticmethod
  def can_answer(query_template):
    """
    @query_template is the output of the client's QueryTemplate.toWire() method.
    """
    return query_template.get('name') in (GBDataStruct.name, ProgressiveDataStruct.name)


class SampleProgDataStruct(ProgressiveDataStruct):
  """
  Progressive Data Structure using sampling encoding
  """

  name = "SampleProg"

  def __init__(self, db, spec, *args, **kwargs):
        # name of the file cache
    fname = "sampleprog_%s.cache" % ",".join(spec["groupby"])
    kwargs['fname'] = kwargs.get("fname", fname)

    super(SampleProgDataStruct, self).__init__(db, spec, *args, **kwargs)

    self.name = SampleProgDataStruct.name
    self.spec = spec
    self.chunkSize = kwargs.get("chunkSize", 16)
    self.encoding = 3

  def progressively_encode_table(self, schema, rows):
    srows = sorted(rows, key=(lambda x: x[1]))
    table = ProgressiveTable()
    lower = srows[0][1]
    higher = srows[-1][1]

    ca = map(lambda x: x[0], srows)
    l = len(ca)
    step = 1
    while(l > self.chunkSize):
      l = math.ceil(l / 2)
      step = step * 2

    blocks = [[] for i in range(step)]
    for i, n in enumerate(ca):
      blocks[i % step].append(n)

    for i, b in enumerate(blocks):
      block = table.blocks.add()
      block.schema.name.extend(schema)
      block.lower = lower
      block.higher = higher
      block.id = i
      block.val.extend(b)

    return table.SerializeToString()

  @staticmethod
  def can_answer(query_template):
    return query_template.get('name') in (GBDataStruct.name, ProgressiveDataStruct, SampleProgDataStruct.name)

class WaveletProgDataStruct(ProgressiveDataStruct):
  """
  Progressive Data Struct using haar wavelet encoding
  """
  name = "WaveletProg"

  def __init__(self, arg):
    super(WaveletProgDataStruct, self).__init__()
    self.arg = arg
    self.encoding = 4

  # TODO: complete this
  def progressively_encode_table(self, schema, rows):
    pass

  @staticmethod
  def can_answer(query_template):
    return query_template.get('name') in (GBDataStruct.name, ProgressiveDataStruct.name, WaveletProgDataStruct.name)

# Currently deprecated
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
# ds_klasses = [GBDataStruct, SQLTemplates]
ds_klasses = [GBDataStruct, SampleProgDataStruct, SQLTemplates]
# ds_klasses = [GBdataStruct, SampleProgDataStruct, WaveletProgDataStruct, SQLTemplates]

