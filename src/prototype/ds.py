import struct
import json
import flask
import time
from threading import Thread
from Queue import Queue
from StringIO import StringIO

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
      yield self.encode_table(schema, rows)
    return f()

  def decode_table(self, buf):
    schema = self.decode_schema(buf)
    cols = []
    for attr in schema:
      cols.append(self.decode_col(buf))
    return schema, cols

  def decode_schema(self, buf):
    nattrs, = struct.unpack("I", buf.read(4))
    attrs = []
    for i in xrange(nattrs):
      slen, = struct.unpack("I", buf.read(4))
      attr, = struct.unpack("%ss"%slen, buf.read(slen))
      attrs.append(attr)
    return attrs

  def decode_col(self, buf):
    nrows, = struct.unpack("I", buf.read(4))
    col = struct.unpack("%dI" % nrows, buf.read(4*nrows))
    return col

  def encode_table(self, schema, rows):
    """
    assume everything is uints
    @schema list of attr names
    @rows 
    """
    cols = zip(*rows)
    bschema = self.encode_schema(schema)
    buf = StringIO()
    buf.write(bschema)
    for col in cols:
      bcol = self.encode_col(col)
      buf.write(bcol)
    return buf.getvalue()

  def encode_col(self, col):
    buf = StringIO()
    buf.write(struct.pack("I", len(col)))
    buf.write(struct.pack("%dI" % len(col), *col))
    val = buf.getvalue()
    buf.close()
    return val

  def encode_schema(self, schema):
    schema_buf = StringIO()
    schema_buf.write(struct.pack("I", len(schema)))
    for attr in schema:
      schema_buf.write(struct.pack("I", len(attr)))
      schema_buf.write(struct.pack("%ds" % len(attr), attr))
    val = schema_buf.getvalue()
    schema_buf.close()
    return val


