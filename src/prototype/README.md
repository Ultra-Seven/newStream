# Setup

## Install and setup

Install nodejs, npm, protocol buffer, postgres.  OSx instructions:

        brew install node npm protobuf postgresql

Install python packages (probably want to use virtualenv)

        pip install flask numpy scipy bsddb3 psycopg2 sqlalchemy

Install node modules:

        npm install .

Install global node module:

        npm install -g browserify


Setup a postgres database

        createdb test


## Compiling and Running

Compile protocol buffers, package javascript files in `js/` into a single deployable file:

        make

Setup offline data structures
    
        python setup.py 

Launch server

        python server.py


Go to webpage: `http://localhost:5000`


# Code Overview

![arch](./arch.png "Architecture")

How queries are represented

Split across client, online servr and offline setup.  E need a global unambiguous reperesntation of a query so we can say
"yes, this data structure can answer this query".  State of the art techniques are basically string equality!




## Assignments

Assignment 1:

Get it running
Add a fourth visualization

ASsignment 2:


