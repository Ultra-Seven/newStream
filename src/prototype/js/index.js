var async = require("async");
var Engine = require("./engine").Engine;
var Main = window.Main = require("./main");
var CubeManager = require("./cubemgr").CubeManager;
var Query = window.Query = require("./query");
var Viz = require("./viz");



var bytespermb = 1048576;
var cubemgr = new CubeManager();
var engine = window.engine = new Engine(450);
engine.registerDataStruct(cubemgr);


var cubeQ1 = window.cubeQ1 = new Query.CubeQueryTemplate(
    { x: "a", y: "avg(d)", fill: "'black'" },
    "data",
    [ "a"],
    { "b": "num", "c": "num"}
);
var cubeQ2 = window.cubeQ2 = new Query.CubeQueryTemplate(
    { x: "b", y: "avg(e)", fill: "'black'" },
    "data",
    [ "b"],
    { "a": "num", "c": "num"}
);
var cubeQ3 = window.cubeQ3 = new Query.CubeQueryTemplate(
    { x: "c", y: "avg(e)", fill: "'black'" },
    "data",
    [ "c"],
    { "a": "num", "b": "num"}
);
engine.registerQueryTemplate(cubeQ1);
engine.registerQueryTemplate(cubeQ2);
engine.registerQueryTemplate(cubeQ3);



var makeViz1 = function(cb) {
  var data = { 
    table: "data", attrs: { 
      a: "discrete", 
      d: "continuous" 
    }
  };

  Main.getAttrStats(data,
    function(data) {
      var opts = {
        id: "#viz1", 
        xdomain: data.a, 
        ydomain: data.d
      };

      var viz = new Viz.Viz(engine, cubeQ1, opts).setup();
      engine.registerViz(viz);
      var q = new Query.Query(cubeQ1, {});
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

  Main.getAttrStats(data,
    function(data) {
      var opts = {
        id: "#viz2", 
        xdomain: data.b, 
        ydomain: data.e
      };

      var viz = new Viz.Viz(engine, cubeQ2, opts).setup();
      engine.registerViz(viz);
      var q = new Query.Query(cubeQ2, {});
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

  Main.getAttrStats(data,
    function(data) {
      var opts = {
        id: "#viz3", 
        xdomain: data.c, 
        ydomain: data.e
      };

      var viz = new Viz.Viz(engine, cubeQ3, opts).setup();
      engine.registerViz(viz);
      var q = new Query.Query(cubeQ3, {});
      engine.registerQuery(q, viz.render.bind(viz));
      cb(null, viz)
  })
};



// link the vizes
async.parallel([makeViz1, makeViz2,  makeViz3], function(err, vizes) {
  _.each(vizes, function(v1, i1) {
    v1.on("mouseover", function(viz, el) {
      var data = d3.select(el).data()[0];
      var attr = v1.qtemplate.select['x']
      var args = { };
      args[attr] = data['x'];

      _.each(vizes, function(v2, i2) {
        if (i1 == i2) return;
        var q = new Query.Query(v2.qtemplate, args);
        engine.registerQuery(q, v2.render.bind(v2));
      });
    });
  });
})





Main.stream_from("/data", function(arr) {
  Main.Debug.update(arr);
  engine.ringbuf.write(arr);
}, Main.Debug.debug.bind(Main.Debug));





