# Overview

In this assignment, you will collect mouse data, create a good mouse prediction algorithm (perhaps by collecting better mouse data),
and propose a way to evaluate the quality of the algorithm.

Teams:

* You may work in teams of two if you would like.  

Due Dates: 

* Evaluation functions: 2/22 12PM (noon)
* Prediction algorithm: 3/5 11:59PM EST 

Related papers

* [KTM](http://depts.washington.edu/madlab/proj/ktm/) is the state of the art, and works _ok_.  They have a good list of references.
* [Kalman Filter technique](https://scholar.google.com/scholar?hl=en&q=User+target+intention+recognition+from+cursor+position+using+Kalman+filter&btnG=&as_sdt=1%2C33&as_sdtp=)


# Mouse Traces

You will want to collect mouse trace data (it is fine to share data with classmates to get a larger training set).
To help you, we have written a chrome extension and python server to collect mouse trace data for you.

## Setup Instructions

Install the chrome extension

* To locally install your extension you don't need to archive it, 
  just go to your extensions chrome://extensions/, click "Developer mode", 
  "Load unpacked extension" button, and then point it to your extension folder.

Run the https flask server:

        cd server/
        python server.py
        # type the self-signed SSL cert password: columbiaviz
        
Accept our bogus self-signed certificate

* go to `https://localhost:5000` and click "proceed anyways". 

Go to a webpage and click around --- the server should print the mouse data.


## How to collect traces

1. Enable the chrome extension in Chrome
2. Run the python server
3. visit web pages as normal
4. Periodically check the server output to make sure it hasn't crashed
5. Read the berkeleydb database for your collected data!


## Data formats

Everything is sent from the browser to the server as string-encoded JSON objects, and stored in the berkeley database `mouse.bdb` as hashtable values.  
The berkeleydb keys are just integers in the insertion order.  
You can use `json.loads(<value>)` to turn a string value into a json object.

Since we periodically flush whatever we have to the server, we generate an ID for each page visit that we hope is unique.

The JSON objects have a special attribute "type" that is either "page" or "mouse".

* "page": stores a list of bounding boxes of anything we think could be interacted with.  
  * A bounding box is: [elementName, left, top, width, height] 
  * see `content.js:getAllInteractableElements()` for what we define.  It's pretty naive, you could easily make it smarter.

            {u'loc': u'https://vega.github.io/voyager/', 
             u'boxes': [[u'A', 267, 16, 104.90625, 16], 
                        [u'A', 425.234375, 16, 49.34375, 16], 
                        [u'A', 527.90625, 16, 49.34375, 16], 
                        [u'BUTTON', 183.953125, 89, 42.046875, 18], 
                        .... ], 
              u'type': u'page', u'id': u'1487145061405:948'}

* "mouse": stores a list of x, y mouse coordinates, the timestamps, and the action ("m" for move, "d" for down, "u" for up)


          {u'ts': [1487145146451, 1487145148068], 
           u'actions': [u'm', u'm'], 
           u't': 1487145161430, 
           u'xs': [355, 355], 
           u'ys': [3364, 3364], 
           u'type': u'mouse', 
           u'id': u'1487144820511:917'}



# Your Task:

Read all of the instructions first!  

You will implement a mouse predictor called `YourPredictor` in [predict.js](./server/js/predict.js).  The code is in `./server/js`.
A predictor, at a high level, takes as input a value `timeDelta` that represents the number of milliseconds into the future, and
returns a distribution of the mouse positions and actions at that time.
We have implemented a `BaselinePredictor` class based on KTM in [predict.js](./server/js/predict.js).
You will endeaver to implement something that out performs it.  

To help you develop and test, we have included:

* [BaselinePredictor](./server/js/predict.js) that uses a precomputed [KTM model](./server/js/ktm.js)
* [demo page](./server/templates/index.html) that lets you move your mouse around and visualize your predictions.
  * As you implement `YourPredictor` in the second phase of the project, you can recompile the js files and reload the page to see it live.
* [dist.js](./server/js/dist.js) 
* [Makefile](./server/Makefile)

Setup and running the demo

        cd server
        npm install .
        make
        python server.py
        # enter password: columbiaviz
        # go to https://localhost:5000

Optional

* As you work on this assignment, look for and save URLs of visualizations that you would like to use to gather viz specific mouse traces and to test our predictors on!
  Save them by replying with the URL on this assignment's piazza post.


### Step 0

You have all been given write access to the repository.  It will make all of our lives easier if there is a central repository for the class.   I recommend that each team creates a branch for their team and commits/pushes to that branch.  **DO NOT COMMIT TO MASTER** -- we have set permissions that make this hard to do, but just be careful :)

        git checkout -b <name of your new branch>
        
        # git commit/add as normal

        git push --set-upstream origin <name of your new branch>

If the staff pushes bug fixes to the code, you can then merge it into your code easily

        # 1. switch to your branch
        git checkout <name of your new branch>

        # 2. pull from github and merge
        git pull
        git merge master 

How do you check which branch you're in?  [Add the current branch to your prompt](https://coderwall.com/p/fasnya/add-git-branch-name-to-bash-prompt) or:

        git status


### What does BETTER mean? Due: 2/22 12PM (noon)

Propose and implement a metric for evaluating the accuracy of your predictions.  Implement it by filling in the `TODO` blocks in [evaluator.js](./server/js/evaluator.js).

* You can assume the predictor returns a [Distribution](./server/js/dist.js) object that implements `getTopK()` and `getAllAbove()`.
  You will write those in phase two.
* You can use the `BaselinePredictor` to test your evaluator -- note that the baseline predictor is not very good.

Submission

* add your mouse trace database `mouse.bdb` to your branch
* Just push to your branch on github.
* (optional) reply to the assignment post on piazza what you thought of the assignment, codebase, or the architecture.


### Actually Predict!   Due: 3/5 11:59PM EST 

Fill in [predict.js:Predictor](./server/js/predict.js) and implement a javascript mouse prediction function, which, 
given the following information, returns a [Distribution](./server/js/dist.js) object.  

* Inputs:
  * list of boxes representing the "interactable" elements on the page (in the same format as above), 
  * a partial mouse trace as a list of [x, y, t, action] tuples, , where action can be `m`, `d`, `u`. 
  * deltaTime
* Output
  * A distribution object over mouse [x, y, action] arrays
    This means that the Distribution object maps [x, y, action] arrys to a probability.  
    Doing this naively may be expensive since there are lots of pixels.
    You might instead discretize the pixel space and store probabilites for x, y ranges,
    or only store the single [x, y, action] with probability 100 and everything else has probability 0,
    or something else.  
  * Implement `getTopK()` and `getAllAbove()`  for the distribution.  
    You would probably want them for the evalutaion function in the first phase.


Submitting

* TBD






