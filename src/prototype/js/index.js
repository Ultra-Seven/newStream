var async = require("async");
var Engine = require("./engine").Engine;
var Util = window.Util = require("./util");
var GBDataStructure = require("./gbds").GBDataStructure;
var Query = window.Query = require("./query");
var Viz = require("./viz");



var bytespermb = 1048576;
var gbDS = new GBDataStructure();
var engine = window.engine = new Engine(450);
engine.registerDataStruct(gbDS);


var q1 = window.q1 = new Query.GBQueryTemplate(
    { x: "a", y: "avg(d)", fill: "'black'" },
    "data",
    [ "a"],
    { "b": "num", "c": "num"}
);
var q2 = window.q2 = new Query.GBQueryTemplate(
    { x: "b", y: "avg(e)", fill: "'black'" },
    "data",
    [ "b"],
    { "a": "num", "c": "num"}
);
var q3 = window.q3 = new Query.GBQueryTemplate(
    { x: "c", y: "avg(e)", fill: "'black'" },
    "data",
    [ "c"],
    { "a": "num", "b": "num"}
);
engine.registerQueryTemplate(q1);
engine.registerQueryTemplate(q2);
engine.registerQueryTemplate(q3);



var makeViz1 = function(cb) {
  var data = { 
    table: "data", attrs: { 
      a: "discrete", 
      d: "continuous" 
    }
  };

  Util.getAttrStats(data,
    function(data) {
      var opts = {
        id: "#viz1", 
        xdomain: data.a, 
        ydomain: data.d
      };

      var viz = new Viz.Viz(engine, q1, opts).setup();
      engine.registerViz(viz);
      var q = new Query.Query(q1, {});
      engine.registerQuery(q, viz.render.bind(viz));
      cb(null, viz)
  })
};
var makeViz2 = function(cb) {
  var data = { 
    table: "data", attrs: { 
      b: "discrete", 
      e: "continuous" 
    }
  };

  Util.getAttrStats(data,
    function(data) {
      var opts = {
        id: "#viz2", 
        xdomain: data.b, 
        ydomain: data.e
      };

      var viz = new Viz.Viz(engine, q2, opts).setup();
      engine.registerViz(viz);
      var q = new Query.Query(q2, {});
      engine.registerQuery(q, viz.render.bind(viz));
      cb(null, viz)
  })
};


var makeViz3 = function(cb) {
  var data = { 
    table: "data", attrs: { 
      c: "discrete", 
      e: "continuous" 
    }
  };

  Util.getAttrStats(data,
    function(data) {
      var opts = {
        id: "#viz3", 
        xdomain: data.c, 
        ydomain: data.e
      };

      var viz = new Viz.Viz(engine, q3, opts).setup();
      engine.registerViz(viz);
      var q = new Query.Query(q3, {});
      engine.registerQuery(q, viz.render.bind(viz));
      cb(null, viz)
  })
};



// link the vizes
async.parallel([makeViz1, makeViz2,  makeViz3], function(err, vizes) {
  _.each(vizes, function(v1, i1) {
    v1.on("mouseover", function(viz, el, row) {
      // create the parameter data for the query
      var attr = v1.qtemplate.select['x']
      var data = { };
      data[attr] = row['x'];

      _.each(vizes, function(v2, i2) {
        if (i1 == i2) return;
        var q = new Query.Query(v2.qtemplate, data);
        engine.registerQuery(q, v2.render.bind(v2));
      });
    });
  });
})





//
// Start the data stream!
//
Util.stream_from("/data", function(arr) {
  Util.Debug.update(arr);
  engine.ringbuf.write(arr);
}, Util.Debug.debug.bind(Util.Debug));





