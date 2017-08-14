var async = require("async");
var Engine = require("../../engine").Engine;
var Util = window.Util = require("../../util");
var GBDataStructure = require("../../gbds").GBDataStructure;
var SampleProgDataStructure = require("../../progds").SampleProgDataStructure;
var Query = window.Query = require("../../query");
var Viz = require("./viz");
var Test = require("../../test/predictor_test").PredTest;
Util.DEBUG = false;
Util.WRITEDEBUG = false;
Util.DISTDEBUG = false;
Util.RESPONSIVE = false;
Util.HITRATIO = true;
Util.DETAIL = false;

// strategies
Util.PREDICTOR = true;
Util.TEST = false;


var bytespermb = 1048576;
var ringbufsize = 4500;
var engine = window.engine = new Engine(ringbufsize); // replace 450 with bytespermb * #MBs
// engine.registerRingBufferSize(ringbufsize);

//
// Setup Data Structures
//
var gbDS = new GBDataStructure();
// var progDS = new ProgressiveDataStructure();
// var sampleDS = new SampleProgDataStructure();

// TODO: comment next line to use the ProgressiveDataStructure to answer queries
engine.registerDataStruct(gbDS);

// TODO: uncomment the next line to enable ProgressiveDataStructures
// engine.registerDataStruct(sampleDS);


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

$("#holder").css('display','none');
$("#tableau-like").css('display','none');

function setupViz(qtemplate, opts) {
  var viz = new Viz.Viz(engine, qtemplate, opts).setup();
  engine.registerViz(viz);
  var q = new Query.Query(qtemplate, {});
  engine.registerQuery(q, viz.render.bind(viz), viz.id);
  return viz;
}

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
      cb(null, setupViz(q1, opts));
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
      cb(null, setupViz(q2, opts));
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
      cb(null, setupViz(q3, opts));
  })
};



// link the vizes
async.parallel([makeViz1, makeViz2,  makeViz3], function(err, vizes) {
  _.each(vizes, function(v1, i1) {
    engine.requester.vizMap[v1.id] = v1;
    v1.on("mouseover", function(viz, el, row) {
      if (Util.TEST && v1.id === "#viz1") {
        Util.getMouseTrace(function(data){
          let results = {}
          for(let i = 10; i <= 30; i += 5) {
            let test = new Test(data, engine, i);
            results[i+""] = test.getAverageTime();
          }
          Util.writeResults(results, function(data) {
            console.log(data);
          });
        });
      }
      // create the parameter data for the query
      var attr = v1.qtemplate.select['x']
      var data = { };
      data[attr] = row['x'];

      _.each(vizes, function(v2, i2) {
        if (i1 == i2) return;
        var q = new Query.Query(v2.qtemplate, data);
        const id = v2.id;
        if (Util.DETAIL) 
          console.log("REQUEST:for vis:" + id, "send query:" + q.toSQL());
        if (Util.HITRATIO) {
          Util.Debug.hitRatios();
          Util.Debug.addQuery();
        }
        engine.registerQuery(q, v2.render.bind(v2), id);
      });
    });
  });
  if(Util.PREDICTOR)
    engine.requester.run();
})


//
// Start the data stream!
//
Util.stream_from("/data", function(arr) {
  if (Util.DEBUG)
    Util.Debug.update(arr);
  if (Util.WRITEDEBUG)
    Util.Debug.updateWriteTime();
  engine.ringbuf.write(arr);
  if (Util.WRITEDEBUG)
    Util.Debug.updateWrite(arr);
}, Util.Debug.debug.bind(Util.Debug));


