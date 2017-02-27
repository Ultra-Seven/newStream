from git import Repo
import json
import os
import bsddb3

branches = ["bgwte", "fpyz", "gal", "gr2547_sh3266", "lw2666_az2407"]


def copy_from_branches(branches):
  for branch in branches:
    os.system("git checkout %s" % branch)
    os.system("cp ../server/js/evaluator.js ./js/evaluator_%s.js" % branch)
    os.system("cp ../server/js/predict.js ./js/predict_%s.js" % branch)
    try:
      os.system("cp ../server/mouse.bdb ./data/%s.bdb" % branch)
    except:
      pass

  os.system("git checkout evaluate")

def combine_traces(branches):
  # go through all the bdb files in data/ and merge into a single json file
  trace_keys = ["xs", "ys", "ts", "actions"]
  all_traces = []
  for fname in os.listdir("./data"):
    if fname.endswith(".bdb"):
      db = bsddb3.hashopen(os.path.join("./data", fname))
      for key in db:
        try:
          trace = json.loads(db[key])
          trace = map(list,zip(*map(trace.get, trace_keys)))
          all_traces.append(trace)
        except Exception as e: 
          pass

  print "flushing %s traces" % len(all_traces)
  with file("./data/alltraces.json", "w") as f:
    json.dump(all_traces, f)

#copy_from_branches(branches)
combine_traces(branches)
