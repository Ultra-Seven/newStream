from pygg import *
from wuutils import *
import numpy as np

xs = np.arange(1, 2000)

def make_func(tratio=1, lperc=100, concurrency=1, partial=1):
  f = lambda x: (float(lperc) - x) / (10.0 - (tratio * x))
  f = lambda x: 1.0 - ((lperc - 10.0 - max(0, x - tratio * x)) / (x - 10.0 - max(0.0, x - tratio * x)))**(1.0/concurrency)
  f = lambda x: 1.0 - ((10.0 + max(0, x-tratio*x)-lperc)/(max(0, x-tratio*x)-x))**(1.0 / concurrency)
  h = lambda x: f(x * partial)
  return h

def todata(funcs):
  data = []
  for d in funcs:
    f = d['f']
    del d['f']
    for x in xs:
      newd = dict(d)
      newd['x'] = x
      newd['y'] = f(x)
      data.append(newd)
  return data

def toplot(funcs):
  data = todata(funcs)
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
funcs = [dict(label="%%=%s" % t, t=t, p="Threshold: %s" % p, f=make_func(lperc=p, partial=t, concurrency=5)) for t in [1, 0.75, 0.5, 0.25] for p in [100, 500]]
p = toplot(funcs)
p += facet_grid(".~p")
p += scale_color_discrete(name=esc("Partial Tile"))
ggsave("model_partial.png", p, libs=["grid"], width=4, height=2)


# fixed throughput, increase concurrency while decreasing percentage of each tile until some threshold.
