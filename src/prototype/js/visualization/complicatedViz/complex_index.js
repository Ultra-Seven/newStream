var async = require("async");
var Engine = require("../../engine").Engine;
var Util = window.Util = require("../../util");
var GBDataStructure = require("../../gbds").GBDataStructure;
var SampleProgDataStructure = require("../../progds").SampleProgDataStructure;
var Query = window.Query = require("../../query");
var MapViz = require("./map_viz");
var TypeViz = require("./type_viz");
var LineViz = require("./linechart_viz");

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
var gbDS = new GBDataStructure();
// var progDS = new ProgressiveDataStructure();
// var sampleDS = new SampleProgDataStructure();

// TODO: comment next line to use the ProgressiveDataStructure to answer queries
engine.registerDataStruct(gbDS);

// TODO: uncomment the next line to enable ProgressiveDataStructures
// engine.registerDataStruct(sampleDS);


var q1 = window.q1 = new Query.GBQueryTemplate(
    { x: "Year", y: "sum(GDP)", fill: "'black'" },
    "data",
    [ "Year"],
    { "Type": "num", "Metro": "str"}
);
var q2 = window.q2 = new Query.GBQueryTemplate(
    { x: "Type", y: "sum(GDP)", fill: "'black'" },
    "data",
    [ "Type"],
    { "Year": "num", "Metro": "str"}
);
engine.registerQueryTemplate(q1);
engine.registerQueryTemplate(q2);

function setupViz(viz, qtemplate) {
  engine.registerViz(viz);
  var q = new Query.Query(qtemplate, {});
  engine.registerQuery(q, viz.render.bind(viz), viz.id);
  return viz;
}
$("#holder").css('display','none');
$("#barchart").css('display','none');
var makeViz1 = function(cb) {
  opts = {
    id: "#viz1",
    groupname: "mapchart"
  };
  var viz = new MapViz.MapViz(engine, null, opts).setup();
  engine.registerViz(viz);
  cb(null, viz);
};
var makeViz2 = function(cb) {
  var data = { 
    table: "data", attrs: { 
      Type: "discrete", 
      GDP: "continuous" 
    }
  };

  Util.getAttrStats(data,
    function(data) {
      var opts = {
        id: "#viz2",
        groupname: "pie-barchart",
        range: data
      };
      var viz = new TypeViz.TypeViz(engine, q2, opts).setup();
      cb(null, setupViz(viz, q2));
  })
};


var makeViz3 = function(cb) {
  var data = { 
    table: "data", attrs: { 
      Type: "discrete", 
      GDP: "continuous" 
    }
  };

  Util.getAttrStats(data,
    function(data) {
      var opts = {
        id: "#viz3",
        groupname: "linechart",
        range: data
      };
      var viz = new LineViz.LineViz(engine, q1, opts).setup();
      cb(null, setupViz(viz, q1));
  })
};



// link the vizes
async.parallel([makeViz1, makeViz2, makeViz3], function(err, vizes) {
  _.each(vizes, function(v1, i1) {
    
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
  engine.ringbuf.write(arr);
  if (Util.WRITEDEBUG)
    Util.Debug.updateWrite(arr);
}, Util.Debug.debug.bind(Util.Debug));





