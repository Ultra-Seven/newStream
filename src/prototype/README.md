# Setup

## Install and setup

Note these instructions are for **python 2.7** in virtualenv, and Mac OSX.  
We assume you have [pip](https://pypi.python.org/pypi/pip), [virtualenv](https://virtualenv.pypa.io/en/stable/), 
xcode,
and [brew](http://brew.sh/) installed.

### Possible problems up front

[pip may complain about the package "six"](https://github.com/pypa/pip/issues/3165)

        pip install --ignore-installed six  <your package>

[connecting to postgresql may have password issues](http://dba.stackexchange.com/questions/14740/how-to-use-psql-with-no-password-prompt)

* See the link for multiple possible solutions.

Flask's threaded may not stop all `server.py` processes using `CTL-C`.  This is the nuclear option: 

        ps -A | grep python | awk '{print $1}' | xargs kill 

### The easy stuff

Install nodejs, npm, protocol buffer, postgres.  OSx instructions:

        brew install node npm  postgresql

Install python packages (probably want to use virtualenv)

        pip install flask click numpy scipy sqlalchemy 

Install node modules:

        npm install .

Install global node module:

        npm install -g browserify


### The tricky stuff

The following are kind of a pain to setup on OSX

Protocol buffers

        # run this outside of tmux/virtualenv
        brew install protobuf

        # install python libraries
        pip install protobuf

BerkeleyDB

* BerkeleyDB 6.0 is unfortunately AGPL.  I don't anticipate this codebase deployed as is, but if you have issues with it, feel free to install an earlier version.

        brew install berkeley-db

        # replace "6.2.23" with the version brew installed
        YES_I_HAVE_THE_RIGHT_TO_USE_THIS_BERKELEY_DB_VERSION=1 BERKELEYDB_DIR=$(brew --cellar)/berkeley-db/6.2.23 pip install bsddb3

Postgresql

        brew install postgresql
        pip install psycopg2

        # initialize a database directory (pick your favorite directory)
        mkdir ~/pgdata/
        initdb ~/pgdata/
        
        # start postgres
        pg_ctl -D ~/pgdata start

        # create a database
        createdb test


## Compiling and Running

Compile protocol buffers, package javascript files in `js/` into a single deployable file:

        make

Setup offline data structures (will create .cache files in the current directory)
    
        python py/setup.py 

Launch server

        python server.py


Go to webpage: `http://localhost:5000`


# Architecture Overview

![arch](./arch.png "Architecture")

This figure represents the overall architecture of the system and will be used to introduce the major files.  
From left to write, the developer creates visualization charts as wrappers around query templates.
When the viz are instantiated, the [query templates](./js/query.js) are registered with the [server](./py/server.py),
so the [server](./py/server.py) can instantiate the appropriate [precomputed data structures](./py/ds.py).
The query templates basically parameterize SQL queries.

When a user interacts with the viz (in this case, by hovering over bars), it generates parameter
values for the visualization's corresponding query template.  The combination is called a query, 
which is registered with the client [Engine](./js/engine.js).  If the data to answer the query
is already in the client's cache, then the appropriate [client data structure](./js/datastruct.js) 
will compute the result and trigger a call back to update the appropriate visualizations.

If data is not available, then the [requester](./js/dist.js) will turn the request into a 
query distribution (where the query has probability 1, and everything else has probability 0)
and sends the distribution to the [server](./py/server.py).  The requester's other job is to continuously predict the future query distribution and 
send it to the server.  The impulse distribution is only used when the user actually runs
a query that is not in the cache.

The server's [manager](./py/manager.py) is basically an infinite loop that can continuously
send data to the client.  The instantiated data structures read from pre-computed cache files 
to answer queries in the current query distribution and sends a byte stream to the client.

The client recieves and caches the byte stream into a simple [ring buffer](./js/ringbuffer.js).
Everytime it detects a usable block of bytes, it sends it to the appropriate [data structure](./js/datastruct.js) 
to decode and use to answer client queries.

You can run [setup.py](./py/setup.py) beforehand to pre-compute files for the data structures.


## Data Structures

Data structures represent different typs of storage engines that could answer user queries.
Data structure objects are represented as triangles in the architecture, they read cached files
generated ahead of time (offline).  They are the workhorse for answering queries.

There are a few key concepts that are important to understand how they work. 

* Data structures are instantiated with a query template (e.g., `SELECT * WHERE a = ? AND b = ? ...`)
  and precomputes all possible assignments to those parameters.
* For a given data structure, it's "query input" is the ID of the query template and the values for the parameters.
* Data structures send a block of byte-encoded data to the client, which needs to decode the bytes.
* On the client, once the bytes are (optionally) decoded into javascript objects, the data structure
  still needs to know which queries the data can answer.  To do so, we basically hash
  the parameter values and use it as a lookup key.
* All of this means that we need to carefully ensure that data and queries are represented
  in exactly the same way in the client, the web server, and the offline scripts.


## Assignments

<a name="assignment1" />

### Warmup Assignment 1:

Due 2/13 midnight

1. Get it running
2. Add a fourth visualization to the client and get it working
3. (Optional Bonus): edit [./js/viz.js](./js/viz.js) to add support for scatter plots

Submitting

* use [giphy](https://giphy.com/apps/giphycapture), [recordit](http://recordit.co/), quicktime or some other way to create a video of GIF of the viz working
* rename the file to `<YOURUNI>_<YOUR NAME>`
* [Submit to this link](https://www.dropbox.com/request/h9fYM27EPJGybrUQlm5B)


<a name="assignment3" />

### Assignment 3:

You have now implemented a good mouse predictor -- in this assignment you will integrate it into the main stream system so that it starts sending _query_ (instead of mouse) distributions.

Pull updated code from master:

          git pull
          git checkout <your branch name>
          git merge master

Integrate your predictor code into the stream prototype codebase.  Most of the code you will edit is in [requester.js](./js/requester.js).  We have implemented a basic skeleton for mapping mouse prediction distributions into query prediction distributions, however most of the logic will be written by you:  

1. Add your predictor from assignment 2 into this code base (may be easiest to create a new module/file for your predictor.)
2. Edit `getMouseDistribution()` in [requester.js](./js/requester.js) to return a mouse distribution.
3. Edit and fill in `mapMouseToQueryDistribution()` to map your mouse distribution into a query distribution.  Some things you may want to consider:
  * What information do you need to store in order to know what DOM elements correspond to a given x, y coordinate?
  * What information do you need to know the query requests that interacting with a DOM element will trigger?  
  * How do you compute the probabilities accurately enough?
4. Once you have completed these tasks, uncomment the `return null` line in `getQueryDistribution()`.  You should see the server receiving query distributions at _very short intervals.   Pass in a smaller `minInterval` parameter to the `Requester` constructor to control this interval.
5. You may not see any changes (or even worse changes) in the interactivity of the demo visualization.  This is because the server is stupid about taking advantage of these distributions and immediately sends data for the highest probability query.  That will be the next assignment.


Submission

* Just push to your branch on github.
* (optional) reply to the assignment post on piazza what you thought of the assignment, codebase, or the architecture.
