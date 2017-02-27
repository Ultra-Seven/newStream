# Description 

This folder contains the test harness for evaluating predictor objects.  
It combines all of your evaluation scripts. 

[collectscripts.py](./collectscripts.py) sets up the directory by

1. going through each git branch and copying your evaluator.js, predict.js and \*.bdb file into this repository.  **Make sure you have commited all relevant files before running, or are running this in a fresh repository!**
  * your `evaluator.js` is copied as `js/evaluator_<your branch name>.js`
  * your `predict.js` is copied as `js/predict_<your branch name>.js`
  * your `*.bdb` file is copied as `data/<your branch name>.bdb`
2. We extract all mouse traces from the `*.bdb` files into  a single large json trace object stored in `data/alltraces.json`

We have a [custom evaluator](./js/evaluator.js) that imports the `Evaluator` object from each of your files.
Finally, the test harness [js/test-evaluator.js](./js/test-evaluator.js) and will print out the scores.
Currently it only runs on the BaselinePredictor.

### What you should do

Update your `evaluator.js` files in your branch so that 

1. it only contains the class definition (remove all test code!)
2. doesn't contain console.log statements (or at least disable them).  
   If you want debugging print statements, add a constructor flag and default it to "no print statements"
3. The current harness only uses the first 20 traces.  to test on all traces, remove the `_.head()` call in [js/test-evaluator.js](./js/test-evaluator.js)

# Setup and run

        npm install .
        make

If you want to avoid copying the js files every time, edit the [Makefile](./Makefile) and remove the `python` call.