import numpy as np
from pygg import *
from wuutils import *
import numpy as np

norm = lambda x, std: max(10.0, np.random.normal(x, std))
np.random.seed(0)

xs = np.arange(1, 2000, 10)

def make_func(tratio=1, lperc=100, concurrency=1, partial=1, std=0):
  f = lambda x: (float(lperc) - x) / (10.0 - (tratio * x))
  f = lambda x: 1.0 - ((lperc - 10.0 - max(0, x - tratio * x)) / (x - 10.0 - max(0.0, x - tratio * x)))**(1.0/concurrency)
  f = lambda x: 1.0 - ((10.0 + max(0, x-tratio*x)-lperc)/(max(0, x-tratio*x)-x))**(1.0 / concurrency)
  h = lambda x: f(x * partial)
  h.std = std
  h.partial = partial
  h.concurrency = concurrency
  h.lperc = lperc
  h.tratio = tratio
  return h

def todata(funcs):
  data = []
  for d in funcs:
    f = d['f']
    d2 = dict(d)
    del d2['f']
    for x in xs:
      newd = dict(d2)
      x2 = norm(x, f.std)
      newd['x'] = x
      newd['x2'] = x2
      newd['y'] = f(x2)
      data.append(newd)
  return data

def toplot(funcs):
  data = todata(funcs)
  return plotit(data)

def plotit(data):
  p = ggplot(data, aes(x="x", y="y", color="label", group="label"))
  p += geom_line()
  p += axis_labels("Network Latency", "Required Accuracy", ykwargs=dict(lim=[0,1]))
  p += geom_vline(xintercept=950, color=esc("grey"))
  p += legend_bottom
  p += guides(col = guide_legend(nrow=1))
  p += theme(**{
    "legend.justification" : "c(.5, .5)",
    "legend.margin": "unit(-.9, 'cm')",
    "legend.title": element_text(colour = "'#333333'")

  })
  return p




# gaussian network latency
funcs = [dict(label="Threshold=%s" % (p), s="Std: %s" % s, std=s, 
              f=make_func(concurrency=20, lperc=p, std=s)) 
        for p in [100, 500] for s in [0, 100, 500]]
data = []
for i in xrange(15):
  data.extend(todata(funcs))
data = filter(lambda d: d['y'] >= 0, data)
print max(filter(lambda d: d['std'] == 500, data), key=lambda d: d['x'])
p = ggplot(data, aes(x="x", y="y", color="label", group="label"))
p += geom_point(size=0.05, alpha=0.2)
p += axis_labels("Network Latency", "Required Accuracy", xkwargs=dict(breaks=[500, 1000, 1500, 2000], labels=map(esc, ["500", "1k", "1.5k", "2k"])), ykwargs=dict(lim=[0,.4]))
p += geom_vline(xintercept=950, color=esc("grey"))
p += legend_bottom
p += guides(col = guide_legend(nrow=1))
p += theme(**{
  "legend.justification" : "c(.5, .5)",
  "legend.margin": "unit(-.9, 'cm')",
  "legend.title": element_text(colour = "'#333333'")
  })
p += facet_grid(".~s")
p += scale_color_discrete(name=esc("Concurrency"))
p += guides(col = guide_legend(nrow=1))
ggsave("model_std.png", p, libs=["grid"], width=4, height=2)



# baselines vary tratio
funcs = [dict(label="ratio: %s" % t, t=t, p="Threshold: %s" % p, f=make_func(tratio=t, lperc=p)) for t in [1, 0.9, 0.8, 0.5] for p in [100, 500]]
p = toplot(funcs)
p += facet_grid(".~p")
p += scale_color_discrete(name="expression(t/l[net])")
ggsave("model_base.png", p, libs=["grid"], width=4, height=2)


# concurrency
funcs = [dict(label="N=%02d" % (t), t=t, p="Threshold: %s" % p, f=make_func(concurrency=t, lperc=p)) for t in [1, 5, 10, 20] for p in [100, 500]]
print make_func(concurrency=5, lperc=500)(1000)
#exit()
p = toplot(funcs)
p += facet_grid(".~p")
p += scale_color_discrete(name=esc("Concurrency"))
p += guides(col = guide_legend(nrow=1))
ggsave("model_concurrency.png", p, libs=["grid"], width=4, height=2)




# partial
funcs = [dict(label="%%=%s" % t, t=t, p="Threshold: %s" % p, f=make_func(lperc=p, partial=t, concurrency=20)) for t in [1, 0.75, 0.5, 0.25] for p in [100, 500]]
p = toplot(funcs)
p += facet_grid(".~p")
p += scale_color_discrete(name=esc("Partial\nResult"))
p += scale_y_continuous(name=esc("Required Accuracy"), lim=[0, 0.25])
ggsave("model_partial.png", p, libs=["grid"], width=4, height=2)



# fixed throughput, increase concurrency while decreasing percentage of each tile until some threshold.
