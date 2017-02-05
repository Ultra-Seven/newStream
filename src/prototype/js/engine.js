var EventEmitter = require("events");
var RingBuffer = require("./ringbuffer").RingBuffer;
var Dist = require("./dist");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


var Engine = (function(EventEmitter) {
  extend(Engine, EventEmitter);

  function Engine(nbytes) {
    this.queryTemplates = {};
    this.vizes = {};
    this.datastructs = {};
    this.ringbuf = new RingBuffer(nbytes);
    this.requester = new Dist.Requester(this);


    EventEmitter.call(this);
  };

  Engine.prototype.registerDataStruct = function(ds) {
    this.ringbuf.register(encoding, ds);
    this.ringbuf.on("dealloc", ds.dealloc.bind(ds));
    this.datastructs[ds.encoding] = ds;
  };

  Engine.prototype.registerQueryTemplate = function(template, cb) {
    var id = _.size(this.queryTemplates) + 1;
    this.queryTemplates[id] = template;
    template.id = id;

    // register with the server!
    $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/register/querytemplate",
      data:  JSON.stringify(template.toWire()),
      success: function (data) {
        // TODO: could use a debugging statement here
      },
      dataType: "json"
    });

    if (cb && _.isFunction(cb)) cb(id);
    return id;
  }

  Engine.prototype.registerViz = function(viz) {
    var id = _.size(this.vizes) + 1;
    this.vizes[id] = viz;
    viz.on("update", function(qtemplate, params, cb) {
      if (qtemplate.id != 0 && !qtemplate.id) return;
    });
    return id;
   }

  //
  // a viz wants to actually run a query.
  //
  Engine.prototype.registerQuery = function(q, cb) {

    // 1. see if the data structures can immediately answer the query
    for (var dsid in this.datastructs) {
      var ds = this.datastructs[dsid];
      if (ds.tryExec(q, cb)) { return; }
    }
    
    // 2. register with data structures that support this query

    cb = _.once(cb);
    var me = this;
    var cb2 = function() {
      for (var dsid in me.datastructs) {
        var ds = me.datastructs[dsid];
        ds.deregister(q, cb2);
      }
      cb.apply(cb, arguments);
    }
    for (var dsid in this.datastructs) {
      var ds = this.datastructs[dsid];
      if (ds.canAnswer(q)) 
        ds.register(q, cb2);
    }

    // 3. send an explicit query distirubiton
    var dist = Dist.NaiveDistribution.from(q);
    this.requester.send(dist);

    // WU: there may end up being a minor race condition between the client sending
    // updated distributions and the server sending data based on stale distributions.
    // it could end up being not-so-efficient
  }

  return Engine;
})(EventEmitter);

module.exports = {
  Engine: Engine
};

