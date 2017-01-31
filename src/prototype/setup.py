import os
import random
from ds import *
from sqlalchemy import *
from sqlalchemy.sql import text


def gen_csv_file(outf, param_ranges, attrs, n=100):
  from itertools import product
  names, iters = zip(*param_ranges)
  for param_vals in product(*iters):
    groups = dict(zip(names, param_vals))

    for i in xrange(n):
      attr_vals = [random.randint(0, 100) for attr in attrs]
      row = list(param_vals) + attr_vals
      outf.write(",".join(map(str, row)))
      outf.write("\n")



db = create_engine("postgresql://localhost/test")
q = text("""SELECT a - a%:a, avg(d)::int FROM data WHERE b = :b GROUP BY a - a%:a""")
pp = ProgressivePrecompute(db, [q])

param_ranges = [
  ('a', range(100)),
  ('b', range(100)),
  ('c', range(4))
]
attrs = ['d', 'e', 'f']
allattrs = list(zip(*param_ranges)[0]) + list(attrs)

if 0:
  with file("data.csv", "w") as f:
    gen_csv_file(f, param_ranges, attrs)

if 0:
  db.execute("DROP TABLE IF EXISTS data; CREATE TABLE data(%s)" % ",".join(["%s int" % a for a in  allattrs]))
  os.system("psql test -c \"copy data from '/Users/ewu/research/stream/src/prototype/data.csv' with csv; \"")

if 1:
  print db.execute("SELECT count(*) from data").fetchone()
  pp.setup_cache(dict(a=[1, 10, 20], b=range(10)))

print pp.key(q, dict(a=1, b=0))
print pp(dict(a=1, b=0))
print pp(dict(a=10, b=0))
print pp(dict(a=20, b=0))
