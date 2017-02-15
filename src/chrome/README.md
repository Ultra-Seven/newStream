In this assignment, you will collect mouse data, create a good mouse prediction algorithm (perhaps by collecting better mouse data),
and propose a way to evaluate the quality of the algorithm.

Due: 3/3 11:59PM EST 

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

Everything is sent from the browser to the server as string-encoded JSON objects, and stored in the berkeley database as hashtable values.  
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

You will implement a mouse predictor.
A predictor, at a high level, takes as input a value t that represents the number of milliseconds into the future, and
returns a distribution of the mouse positions and actions at that time.
We have implemented a somewhat smart mouse predictor in [predict.js](./predict.js), take a look at it.  
You will endeaver to implement something that out performs it.  To do so, there are two phases for this assignment.

1. **What does BETTER mean?** 
  * Propose and implement a metric for evaluating the accuracy of your predictions and implement in [predict.js:Evaluator](./predict.js).
  * You can assume the predictor returns a [Distribution](../prototype/js/dist.js) object that implements `getTopK()` and `getAllAbove()`.
1. **Actually Predict** 
  * Fill in [predict.js:Predictor](./predict.js) and implement a javascript mouse prediction function, which, 
     given the following information, returns a [mouse distribution](../prototype/js/dist.js) that adheres to the
     MouseDistribution signature.
  * Inputs:
    * list of boxes representing the "interactable" elements on the page (in the same format as above), 
    * a partial mouse trace, and 
    * deltaTime
  * Output
    * A distribution object over mouse [x, y, action] arrays.  This means that the Distribution object
      maps [x, y, action] arrys to a probability.  This may be expensive since there are lots of pixels, 
      so you don't need to _implement_ it like this.  For instance, you might instead store probabilites for x, y ranges,
      or only store the single [x, y, action] with probability 100 and everything else has probability 0.
    * Implement `getTopK()` and `getAllAbove()`  for the distribution.  You can call these functions for your evaluation.

List any visualization URLs that would be good final prediction test cases later in the semester




