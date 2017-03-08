import json
import os
import bsddb3

branches = ["bgwte", "fpyz", "gal", "gr2547_sh3266", "lw2666_az2407"]


def copy_from_branches(branches):
  os.system("""
  cd /tmp;
  git clone git@github.com:cudbg/stream.git;
  cd -;
  """)

  for branch in branches:
    print branch
    os.system("""
    cd /tmp/stream;
    git checkout %s;
    git pull;
    cd -;
    cp /tmp/stream/src/chrome/server/js/evaluator.js ./js/evaluator_%s.js;
    cp /tmp/stream/src/chrome/server/js/predict.js ./js/predict_%s.js;
    """ % (branch, branch, branch))

    try:
      os.system("cp /tmp/stream/src/chrome/server/js/kf.js ./js/kf.js;")
    except e:
      pass
    for fname in os.listdir("/tmp/stream/src/chrome/server/"):
      if fname.endswith(".bdb"):
        os.system("""
          cp /tmp/stream/src/chrome/server/%s ./data/%s_%s
        """ % (fname, branch, fname))

  #os.system("git checkout predeval")

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

copy_from_branches(branches)
combine_traces(branches)
