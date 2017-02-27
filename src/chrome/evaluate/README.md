# Description 

This folder contains the test harness for evaluating predictor objects.  
It combines all of your evaluation scripts. 

[collectscripts.py](./collectscripts.py) sets up the directory by

1. going through each git branch and copying your evaluator.js, predict.js and \*.bdb file into this repository.
  * your `evaluator.js` is copied as `js/evaluator_<your branch name>.js`
  * your `predict.js` is copied as `js/predict_<your branch name>.js`
  * your `*.bdb` file is copied as `data/<your branch name>.bdb`
2. We extract all mouse traces from the `*.bdb` files into  a single large json trace object stored in `data/alltraces.json`

We have a [custom evaluator](./evaluator.js) that imports the `Evaluator` object from each of your files.
Finally, the test harness [js/test-evaluator.js](./js/test-evaluator.js) and will print out the scores.
Currently it only runs on the BaselinePredictor.

### What you should do

Update your `evaluator.js` files in your branch so that it only contains the class definition---remove all test code!  

# Setup and run

        npm install .
        make

If you want to avoid copying the js files every time, edit the [Makefile](./Makefile) and remove the `python` call.