# Setup

## Install things

Install nodejs, npm, protocol buffer.  OSx instructions:

        brew install node npm protobuf

Install python packages (probably want to use virtualenv)

        pip install flask numpy scipy bsddb3 psycopg2 sqlalchemy

Install node modules:

        npm install .

Install global node module:

        npm install -g browserify



## Compiling and Running

Compile protocol buffers, package javascript files in `js/` into a single deployable file:

        make

Launch server

        python server.py


Go to webpage: `http://localhost:5000`


# Code Overview


