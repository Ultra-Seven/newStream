import random
import struct
import json
import flask
import time
import numpy as np
from collections import defaultdict
from threading import Thread
from Queue import Queue
from StringIO import StringIO
from sqlalchemy import create_engine
from flask import Flask, render_template, Response, request, stream_with_context
import bsddb3

f = bsddb3.hashopen("./mouse.bdb")

app = Flask(__name__)


@app.route("/")
def index():
  return render_template("index.html")

@app.route("/mouse", methods=["post", "get"])
def mouse():
  f[str(len(f))] = request.data
  print json.loads(request.data)
  return Response(json.dumps([]))


if __name__ == '__main__':
  print "password is: columbiaviz"
  # http://www.akadia.com/services/ssh_test_certificate.html
  # Name: Internet Widgets Pty Ltd
  # passphrase: columbiaviz
  context = ('./certs/server.crt', './certs/server.key') 
  app.run(host="localhost", port=5000, debug=0, threaded=0, ssl_context=context)#