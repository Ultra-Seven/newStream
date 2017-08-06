var async = require("async");
var Engine = require("../../engine").Engine;
var Util = window.Util = require("../../util");
var LikeDataStructure = require("../../likeds").LikeDataStructure;
var SampleProgDataStructure = require("../../progds").SampleProgDataStructure;
var Query = window.Query = require("../../query");
var Viz = require("./simple_viz");

Util.DEBUG = false;
Util.WRITEDEBUG = false;
Util.DISTDEBUG = false;
Util.RESPONSIVE = false;
Util.HITRATIO = true;
Util.DETAIL = true;

// strategies
Util.PREDICTOR = false;


var bytespermb = 1048576;
var ringbufsize = 4500;
var engine = window.engine = new Engine(ringbufsize); // replace 450 with bytespermb * #MBs
// engine.registerRingBufferSize(ringbufsize);

//
// Setup Data Structures
//
var likeDS = new LikeDataStructure();
// var progDS = new ProgressiveDataStructure();
// var sampleDS = new SampleProgDataStructure();

// TODO: comment next line to use the ProgressiveDataStructure to answer queries
engine.registerDataStruct(likeDS);

// TODO: uncomment the next line to enable ProgressiveDataStructures
// engine.registerDataStruct(sampleDS);


var q1 = window.q1 = new Query.LikeQueryTemplate(
    { x: "Total_Population", 
      y: "Latitude",
      z: "Longitude", 
      fill: "'black'" 
    },
    "data",
    ["z8", "z9", "z10", "z11", "z12", "z13", "z14", "z15"],
    { "Zoom": "str"}
);
engine.registerQueryTemplate(q1);

function setupViz(qtemplate, opts) {
  var viz = new Viz.Viz(engine, qtemplate, opts).setup();
  engine.registerViz(viz);
  return viz;
}

var makeViz1 = function(cb) {
  var data = {
    table: "data", 
    attrs: { 
      Zoom: 12
    },
    select: { 
      x: "Total_Population", 
      y: "Latitude",
      z: "Longitude"
    }
  };
  Util.getMapStats(data,
    function(data) {
      var opts = {
        id: "#simpleViz .map",
        zoom: 12,
        data: data,

      };
      cb(null, setupViz(q1, opts));
  })
};

// link the vizes
async.parallel([makeViz1], function(err, vizes) {
  _.each(vizes, function(v1, i1) {
    // v1.on("mouseover", function(viz, el, row) {
    //   // create the parameter data for the query
    //   var attr = v1.qtemplate.select['x']
    //   var data = { };
    //   data[attr] = row['x'];

    //   _.each(vizes, function(v2, i2) {
    //     if (i1 == i2) return;
    //     var q = new Query.Query(v2.qtemplate, data);
    //     const id = v2.id;
    //     if (Util.DETAIL) 
    //       console.log("REQUEST:for vis:" + id, "send query:" + q.toSQL());
    //     if (Util.HITRATIO) {
    //       Util.Debug.hitRatios();
    //       Util.Debug.addQuery();
    //     }
    //     engine.registerQuery(q, v2.render.bind(v2), id);
    //   });
    // });
  });
})

//
// Start the data stream!
//
Util.stream_from("/data", function(arr) {
  if (Util.DEBUG)
    Util.Debug.update(arr);
  if (Util.WRITEDEBUG)
    Util.Debug.updateWriteTime();
  console.log("data:", arr)
  engine.ringbuf.write(arr);
  if (Util.WRITEDEBUG)
    Util.Debug.updateWrite(arr);
}, Util.Debug.debug.bind(Util.Debug));
