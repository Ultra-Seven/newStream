"""
Sets up all offline data structures
"""
import os
import random
from itertools import product
from sqlalchemy import *
from sqlalchemy.sql import text

from ds import *
from table_pb2 import *
import sys


def gen_csv_file(outf, dims, measures, scale=100):
  """
  @outf file descriptor
  @dims list of (attribute, allowed values) pairs that define the GROUP BY groups
  @measures list of attributes, we will randomly pick its values
  @scale number of rows to generate per group
  """
  names, iters = zip(*dims)
  nrows = 0
  for dim_vals in product(*iters):
    groups = dict(zip(names, dim_vals))
    means = [random.randint(0, 90) for a in measures]
    for i in xrange(scale):
      m_vals = [random.randint(0, 20) - 10 + mean for mean, attr in zip(means, measures)]
      row = list(dim_vals)
      row.extend(m_vals)
      outf.write(",".join(map(str, row)))
      outf.write("\n")
      nrows += 1


def setup_db(db, dims, measures, scale=50, csv=None, bcsv=True, bdb=True):
  """
  Generate CSV file and load into psotgres database

  @dims list of dimension attribute names and their values [(attr, [vals...]), ...]
  @measures list of attribute names, we will generate random numbers for them
  @scale number of tuples per dim combination
  @bcsv write CSV file containing the data?
  @bdb  reload database table?
  @csv provide csv data already?
  """
  if csv == None:
    allattrs = list(zip(*dims)[0]) + list(measures)
    if bcsv:
      with file("data.csv", "w") as f:
        gen_csv_file(f, dims, measures, scale=scale)
        sql_str = "DROP TABLE IF EXISTS data; CREATE TABLE data(%s)" % ",".join(["%s int" % a for a in  allattrs])
        path = os.path.join(os.path.abspath("."), "data.csv")
  elif "GDP" in csv:
    allattrs = ["Metro VARCHAR(50)","Latitude FLOAT", "Longitude FLOAT", "Type int", "Year int", "GDP int"]
    sql_str = "DROP TABLE IF EXISTS data; CREATE TABLE data(%s)" % ",".join(["%s" % a for a in  allattrs])
    path = os.path.join(os.path.abspath("."), csv)
  else:
    allattrs = ["Zip_Code VARCHAR(10)", "Latitude FLOAT", "Longitude FLOAT", "City VARCHAR(50)", "State VARCHAR(50)", "Country VARCHAR(50)"]
    sql_str = "DROP TABLE IF EXISTS data; CREATE TABLE data(%s)" % ",".join(["%s" % a for a in  allattrs])
    path = os.path.join(os.path.abspath("."), csv)

  if bdb:
    if not db:
      raise Exception("need db connection to load database")
  
    db.execute(sql_str)
    os.system("psql test -c \"copy data from '%s' with csv; \"" % path)
    print db.execute("SELECT count(*) from data").fetchone()

def setup_spec(db, spec):
  """
  Given a visualization spec that mirrors the setup in the client (static/js/index.js),
  generate all the relevant data structures to answer the queries
  """
  if spec['name'] == "gbquery":

    # figure out the valid values for the parameters
    param_vals = dict()
    for expr in spec["params"]:
      q = "SELECT distinct %s FROM %s" % (expr, spec["fr"])
      vals = zip(*db.execute(q).fetchall())[0]
      param_vals[expr] = list(vals)
    # setup the data struture
    ds = GBDataStruct(db, spec)
    ds.setup_cache(param_vals)

  if spec['name'] == "like":
    param_vals = dict()
    for expr in spec["params"]:
      param_vals[expr] = spec["like"][expr]
    # setup the data struture
    ds = LikeStruct(db, spec)
    ds.setup_cache(param_vals)

    # TODO: setup your incrementally encoded data structure
    # ds2 = SampleProgDataStruct(db, spec, chunkSize=16)
    # ds2.setup_cache(param_vals)

    # ds3 = WaveletProgDataStruct(db, spec, chunkSize=16)
    # ds3.setup_cache(param_vals)


def setup_specs(db, specs):
  for spec in specs:
    spec = spec['template']
    setup_spec(db, spec)

if __name__ == "__main__":

  # Literally a copy of the client visualization setup in static/js/index.js
  dims = []
  measures = []
  if len(sys.argv) <= 1:
    print "Please input like: python <filename> <vizName: simple, barchart, complex>"
  else:
    vizName = sys.argv[1]
    if vizName == "simple":
      viz_setup = [
        dict(
          id="#simpleviz",
          template=dict(
            name="gbquery",
            select=dict(
              x="Latitude",
              y="Longitude",
            ),
            fr="data",
            groupby=["Longitude", "Latitude"],
            params=dict(
              State = "str"
            ),
            vizName = "SimpleViz"
          ),
        ),
        dict(
          id="#simpleviz",
          template=dict(
            name="gbquery",
            select=dict(
              x="avg(Latitude)",
              y="avg(Longitude)",
            ),
            fr="data",
            groupby=["State"],
            params=dict(
              State = "str"
            ),
            vizName = "SimpleViz"
          ),
        )
      ]
      csv_file = "data/zip_codes_states.csv"
    elif vizName == "barchart":
      viz_setup = [
        dict(
          id="#viz1",
          template=dict(
            name="gbquery",
            select=dict(
              x="a",
              y="avg(d)::int"
            ),
            fr="data",
            groupby=["a"],
            params=dict(
              b="num", c="num"
            ),
            vizName = "barchart"
          ),
        ),
        dict(
          id="#viz2",
          template=dict(
            name="gbquery",
            select=dict(
              x="b",
              y="avg(e)::int"
            ),
            fr="data",
            groupby=["b"],
            params=dict(
              a="num", c="num"
            ),
            vizName = "barchart"
          ),
        ),
        dict(
          id="#viz3",
          template=dict(
            name="gbquery",
            select=dict(
              x="c",
              y="avg(e)::int"
            ),
            fr="data",
            groupby=["c"],
            params=dict(
              a="num", b="num"
            ),
            vizName = "barchart"
          ),
        )
      ]
      dims = [
      ('a', range(50)),
      ('b', range(50)),
      ('c', range(30))
      ]
      measures = ['d', 'e', 'f']
      csv_file = None
    elif vizName == "complex":
      viz_setup = [
        dict(
          id="#linechart_detail",
          template=dict(
            name="gbquery",
            select=dict(
              x="Year",
              y="SUM(GDP)::int"
            ),
            fr="data",
            groupby=["Year"],
            params=dict(
              Type="num", Metro="str"
            ),
            vizName = "ComplexViz"
          ),
        ),

        dict(
          id="#piechart_detail",
          template=dict(
            name="gbquery",
            select=dict(
              x="Type",
              y="SUM(GDP)"
            ),
            fr="data",
            groupby=["Type"],
            params=dict(
              Year="num", Metro="str"
            ),
            vizName = "ComplexViz"
          )
        )
      ]
      csv_file = "data/realGDP_metro_years.csv"
    else:
      print "Please input like: python <filename> <vizName: simple, barchart, complex>"
      sys.exit(0)
    

    db = create_engine("postgresql://localhost/test")

    ## Uncomment to re-generate dataset and repopulate database
    setup_db(db, dims, measures, 5, csv_file)

    ## Uncomment to recompute offline data structures
    # setup_specs(db, viz_setup)

    # ds = GBDataStruct(db, viz_setup[1]["template"])
    # print ds(dict(c=1))


