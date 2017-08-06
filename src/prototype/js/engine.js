var EventEmitter = require("events");
var RingBuffer = require("./ringbuffer").RingBuffer;
var Dist = require("./dist");
var Requester = require("./requester").Requester;
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


//
// The data visualization isualization management system engine
//
var Engine = (function(EventEmitter) {
  extend(Engine, EventEmitter);

  function Engine(nbytes) {
    this.queryTemplates = {};
    this.vizes = {};
    this.datastructs = {};
    this.ringbuf = new RingBuffer(nbytes);
    this.requester = new Requester(this, {minInterval: 500});

    EventEmitter.call(this);
  };

  Engine.prototype.registerRingBufferSize = function(size, cb) {
    var param = {size: size};
    $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/register/ringbuffersize",
      data: JSON.stringify(param),
      success: function (data) {},
      dataType: "json"
    });

    if (cb && _.isFunction(cb)) cb(size);
    return size;
  }

  Engine.prototype.registerDataStruct = function(ds) {
    this.ringbuf.register(ds.encoding, ds);
    this.ringbuf.on("dealloc", ds.dealloc.bind(ds));
    this.datastructs[ds.encoding] = ds;
  };

  Engine.prototype.registerQueryTemplate = function(template, cb) {
    var id = _.size(this.queryTemplates) + 1;
    this.queryTemplates[id] = template;
    template.id = id;
    const data = JSON.stringify(template.toWire());
    // register with the server!
    $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/register/querytemplate",
      data:  JSON.stringify(template.toWire()),
      success: function (data) {
        // TODO: could use a debugging statement here
        console.log("query template:", data);
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
  // This is called if a visualization wants to run a query in response
  // to an interaction 
  //
  Engine.prototype.registerQuery = function(q, cb, id) {
    let start = Date.now();
    // this.requester.stopLoop();
    let that = this;
    //console.log("start time", start);
    // 1. see if the data structures can immediately answer the query
    for (var dsid in this.datastructs) {
      var ds = this.datastructs[dsid];
      r = ds.tryExec(q, cb);
      if (r == 'incompleted data') {
        // cache partial hit
        if (Util.DETAIL)
          console.log(r);
        if (Util.HITRATIO) {
          console.log("cache hit!");
          Util.Debug.addHits();
        }
      }
      else if (r) {
        this.requester.startLoop();
        if (Util.HITRATIO) {
          console.log("cache hit!");
          Util.Debug.addHits();
        }
        return; 
      }
    }
    
    // 2. register with data structures that support this query

    // make sure the callback will only run once!
    // changed to make it only run by one datastructure
    // cb = _.once(cb);
    cb = Util.first(cb);
    let timer = _.once(function() {
      let end = Date.now();
      Util.Debug.responsiveEnd(end - start, arguments[1].length);
      //console.log("check start time", start);
      //console.log("delta:", end - start);
    })
    var cb2 = function() {
      if (Util.DETAIL) 
        console.log("FINISH: for vis:" + id, "send query:" + q.toSQL());
      // if the query is answered, deregister globally
      for (var dsid in that.datastructs) {
        that.datastructs[dsid].deregister(q, cb2);
      }
      if (Util.RESPONSIVE) {
        timer.apply(timer, arguments);
      }
      cb.apply(cb, arguments);

      // that.requester.startLoop();
    }
    for (var dsid in this.datastructs) {
      var ds = this.datastructs[dsid];
      // is this data structure appropriate?
      if (ds.canAnswer(q))   
        ds.register(q, cb2);
    }

    //console.log("CACHE MISS: for vis:" + id, "send query:" + q.toSQL());
    // 3. send an explicit query distirubiton
    var dist = Dist.TimeDistribution.from(q);
    var encodedDist = JSON.stringify(dist.toWire());
    this.requester.send(encodedDist);

  }

  return Engine;
})(EventEmitter);

module.exports = {
  Engine: Engine
};

