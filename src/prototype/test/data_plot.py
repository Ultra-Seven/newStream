import json
import matplotlib.pyplot as plt
import sys, os
import numpy as np
import traceback
import re
from scipy.interpolate import spline
if len(sys.argv) <= 1:
    print "Please input like: python <filename> <dataName> <xLabel> <yLabel>"
    sys.exit(0)
else:
    path = sys.argv[1]
    xLabel = sys.argv[2]
    yLabel = sys.argv[3]
    smooth = False
    with open('./' + path) as data_file:    
        data = dict(json.load(data_file))

line_markers = [ 'o', 'v', '^', '*', 'x', '.', '>', ',', '+', '<', 'D', 'p' ]
def multi_plot(xs, ys, out_file, paths, reversed, xlabel, ylabel):
    global line_markers
    xs, ys = scala_tn_special(xs, ys)
    xs = list(xs)
    ys = list(ys)
    if reversed:
        plt.xlim(max(xs[0]), min(xs[0]))
    lines = []
    for x, y, label, marker in zip(xs, ys, paths, line_markers):
        x_smooth = x
        y_smooth = y
        if smooth:
            x_sm = np.array(x)
            y_sm = np.array(y)
            x_smooth = np.linspace(x_sm.min(), x_sm.max(), 200)
            y_smooth = spline(x, y, x_smooth)
        line, = plt.plot(x_smooth, y_smooth, label=label, marker = marker)
        lines.append(line)

    legend = plt.legend(lines, bbox_to_anchor=(1.15, 1.15))

    set_tick(plt, xs)

    plt.xlabel(xlabel)
    plt.ylabel(ylabel)

    if out_file == '0':
        plt.show()
    else:
        plt.savefig(out_file + '.png')

def set_tick(plt, xs):
    xticks = [0]
    xticks = xticks + max(xs, key=len)
    if len(xticks) > 10:
        xticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    # xticks = [1,2,4,8,12,16,24]
    if xticks:
        plt.xticks(xticks)

def scala_tn_special(xs, ys):
    return list(zip(*[ (x, y) if x[0] == 1 else ([ xi // 2 for xi in x ], y) for x, y in zip(xs, ys) ]))

keys = sorted(map(lambda x: int(x), data.keys()))
values_map = map(lambda x: data[str(x)], keys)
xs = []
ys = []
print keys
for m in xrange(0, len(values_map)):
    xs_keys = sorted(map(lambda x: int(x), values_map[m].keys()))
    xs.append(xs_keys)
    ys.append(map(lambda x: values_map[m][str(x)], xs_keys))

outFile = path.split(".")[0]
multi_plot(xs, ys, outFile, keys, False, xLabel, yLabel)


