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


def setup_db(db, dims, measures, scale=50, bcsv=True, bdb=True):
  """
  Generate CSV file and load into psotgres database

  @dims list of dimension attribute names and their values [(attr, [vals...]), ...]
  @measures list of attribute names, we will generate random numbers for them
  @scale number of tuples per dim combination
  @bcsv write CSV file containing the data?
  @bdb  reload database table?
  """
  allattrs = list(zip(*dims)[0]) + list(measures)
  if bcsv:
    with file("data.csv", "w") as f:
      gen_csv_file(f, dims, measures, scale=scale)

  if bdb:
    if not db:
      raise Exception("need db connection to load database")
    path = os.path.join(os.path.abspath("."), "data.csv")
    db.execute("DROP TABLE IF EXISTS data; CREATE TABLE data(%s)" % ",".join(["%s int" % a for a in  allattrs]))
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
      q = "SELECT distinct %s::int FROM %s" % (expr, spec["fr"])
      vals = zip(*db.execute(q).fetchall())[0]
      param_vals[expr] = list(vals)

    # setup the data struture
    ds = GBDataStruct(db, spec)
    ds.setup_cache(param_vals)



    # TODO: setup your incrementally encoded data structure
    ds2 = ProgressiveDataStruct(db, spec)
    ds.setup_cache(param_vals)




def setup_specs(db, specs):
  for spec in specs:
    spec = spec['template']
    setup_spec(db, spec)

if __name__ == "__main__":

  # Literally a copy of the client visualization setup in static/js/index.js
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
        )
      )
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
        )
      )
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
        )
      )
    )

  ]
   


  dims = [
    ('a', range(50)),
    ('b', range(50)),
    ('c', range(30))
  ]
  measures = ['d', 'e', 'f']


  db = create_engine("postgresql://localhost/test")

  ## Uncomment to re-generate dataset and repopulate database
  setup_db(db, dims, measures, 5)

  ## Uncomment to recompute offline data structures
  setup_specs(db, viz_setup)

  ds = GBDataStruct(db, viz_setup[1]["template"])
  print ds(dict(c=1))


