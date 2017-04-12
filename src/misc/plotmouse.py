from sklearn.cluster import MiniBatchKMeans
import numpy as np
from collections import *
from pygg import *
from wuutils import *
from math import cos, sin, radians
import random
import bsddb3
import click
import json

random.seed(0)

def zeroit(xs):
  if not xs: return xs
  x0 = xs[0]
  return [x-x0 for x in xs]


def split(trace, cutoff=2000):
  """
  If there is a pause > cutoff between two points in a trace, split it.
  """
  ts = trace['ts']
  si, ei = 0, 0
  pt = ts[0]
  for ei, t in enumerate(ts):
    if t > pt + cutoff:
      print si, ei
      yield dict(
          xs=trace['xs'][si:ei],
          ys=trace['ys'][si:ei],
          ts=trace['ts'][si:ei],
          actions=trace['actions'][si:ei]
      )
      si = ei
    pt = t
  yield dict(
      xs=trace['xs'][si:ei],
      ys=trace['ys'][si:ei],
      ts=trace['ts'][si:ei],
      actions=trace['actions'][si:ei]
  )

def rotate_trace(trace):
  """
  trace is a list of dicts
  normalize the magnitude of the traces to be the same, 
  and (try) to rotate them into the same direction
  """
  xs = [d['x'] for d in trace]
  ys = [d['y'] for d in trace]
  pts = zip(xs, ys)
  pts = map(np.array, pts)

  # find max norm and normalize trace
  maxnorm, maxpt = max([(np.linalg.norm(pt), pt) for pt in pts], key=lambda p: p[0])
  if maxnorm == 0: 
    return trace
  pts = [pt / maxnorm for pt in pts]
  maxpt = maxpt / maxnorm

  angle = np.arccos(np.clip(np.dot(maxpt, [1., 0]), -1.0, 1.0))
  #angle = -angle
  #theta = radians(angle)
  theta = angle
  print maxpt, angle, theta
  rotate = lambda (x,y): ((x*cos(theta) + y*sin(theta)), 
                          (x*sin(theta) + y*cos(theta)))
  pts = map(rotate, pts)
  for d, (x,y) in zip(trace, pts):
    d['x'] = x
    d['y'] = y
  return trace


if 0:
  
  traces = [
     [
       dict(x=0, y=0),
       dict(x=0, y=1),
       dict(x=0, y=.5)
     ],
     [
       dict(x=0, y=0),
       dict(x=1, y=0)
     ]
  ]
  rotated = map(rotate_trace, traces)
  for trace in rotated:
    for d in trace:
      print d['x'], d['y']
    print
  exit()


def cluster_traces(traces, n_clusters=30):
  """
  traces is: [ [dict, dict,... ], ... ]
  """
  def trace_to_vect(trace):
    vect = []
    for d in trace:
      vect.append(d['x'])
      vect.append(d['y'])
      #vect.append(d['t'])
    return vect
  trace_vects = map(trace_to_vect, traces)
  maxlen = max(map(len, trace_vects))
  for trace in trace_vects:
    if len(trace) < maxlen:
      trace.extend([-1] * (maxlen - len(trace)))
  trace_vects = np.array(trace_vects)
  k_means = MiniBatchKMeans(
     init='k-means++', 
     init_size=1000, batch_size=1000, n_clusters=n_clusters, n_init=10)
  k_means.fit(trace_vects)
  for trace, label in zip(traces, k_means.labels_):
    for d in trace:
      d['g'] = label
  return traces





@click.command()
@click.argument("fname")
def main(fname):
  """
  If you want to run this you will need to install R+ggplot2, as well as the following python packages

        pip install pygg wuutils scikit-learn

  """
  db = bsddb3.hashopen(fname)
  keys = ['g', 's', 'x', 'y', 't', 'a']
  traces = []
  i = 0
  db = [(key, db[key]) for key in db.keys()]
  random.shuffle(db)
  for key, log in db:
    try:
      log = json.loads(log)
      if 'xs' not in log: continue
    except:
      continue

    if 'd' not in log['actions'] or 'u' not in log['actions']: continue

    try:
      for d in split(log):
        if len(d['xs']) < 5: continue
        g=[i%20] * len(d['xs'])
        s=[i] * len(d['xs'])
        x=zeroit(d['xs'])
        y=zeroit(d['ys'])
        t=zeroit(d['ts'])
        a=d['actions']
        traces.append([dict(zip(keys, l)) for l in zip(g,s,x,y,t,a)])

        i += 1
    except:
      print d.keys()
      print d
      exit()
    if i >= 200: break
  
  traces = map(rotate_trace, traces)
  traces = cluster_traces(traces, 20)
  data = []
  map(data.extend, traces)


  p = ggplot(data, aes(x='x', y='y', group='s', color='s'))
  p += facet_wrap("~g", ncol=5)
  p += geom_line(alpha=0.9)
  p += legend_none
  ggsave("plot.png", p, width=12, height=10, scale=1.2)

  data = [dict(x=length, y=count) for length, count in Counter(map(len, traces)).items() ]
  p = ggplot(data, aes(x='x', y='y'))
  p += geom_point()
  ggsave("plot_lengths.png", p, width=6, height=3, scale=1.2)



if __name__ == '__main__':
  main()