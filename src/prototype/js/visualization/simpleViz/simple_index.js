var async = require("async");
var Engine = require("../../engine").Engine;
var Util = window.Util = require("../../util");
var GBDataStructure = require("../../gbds").GBDataStructure;
var LikeDataStructure = require("../../likeds").LikeDataStructure;
var SampleProgDataStructure = require("../../progds").SampleProgDataStructure;
var Query = window.Query = require("../../query");
var Viz = require("./simple_viz");
var Decoders = require("../../decoders");
var Test = require("../../test/predictor_test").PredTest;

Util.DEBUG = false;
Util.WRITEDEBUG = false;
Util.DISTDEBUG = false;
Util.RESPONSIVE = false;
Util.HITRATIO = true;
Util.DETAIL = true;

// strategies
Util.PREDICTOR = false;
Util.TEST = false;


var bytespermb = 1048576;
var ringbufsize = 45000;
var engine = window.engine = new Engine(ringbufsize); // replace 450 with bytespermb * #MBs
// engine.registerRingBufferSize(ringbufsize);

//
// Setup Data Structures
//
var gbDS = new GBDataStructure(new Decoders.SimpleTableDecoder());
// var likeDS = new LikeDataStructure();
// var progDS = new ProgressiveDataStructure();
// var sampleDS = new SampleProgDataStructure();

// TODO: comment next line to use the ProgressiveDataStructure to answer queries
// engine.registerDataStruct(likeDS);
engine.registerDataStruct(gbDS);
// TODO: uncomment the next line to enable ProgressiveDataStructures
// engine.registerDataStruct(sampleDS);


var q1 = window.q1 = new Query.GBQueryTemplate(
    { x: "Latitude", 
      y: "Longitude",
      fill: "'black'" 
    },
    "data",
    ["Longitude", "Latitude"],
    { "State": "str"}
);
engine.registerQueryTemplate(q1);

$("#barchart").css('display','none');
$("#tableau-like").css('display','none');
if (!Util.TEST) {
  $("#test").css('display','none');
}
else {
  $("#trace").on("click", e => {
    Util.MOUSE = true;
    var Logger = require("../../logger").Logger;
    this.logger = new Logger({
      minResolution: 20,
      traceLength: 150
    });
    this.logger.bind(document);
  });
  $("#evaluate").on("click", e => {
    Util.getMouseTrace(function(data){
      const opts = {
        n: 100,
        testTimes: 10,
        topK: 5,
        mouse: true
      }
      let test = new Test(data, engine, opts);
      // test.varyK();
      test.varyLength();
      let results = test.getResults();
      let wrapper = {
        data: results,
        // file: "mouse_varyK.txt"
        file: "mouse_varyLength.txt"
      }
      Util.writeResults(wrapper, function(data) {
        console.log(data);
      });
    });
  });
}


function setupViz(qtemplate, opts) {
  var viz = new Viz.Viz(engine, qtemplate, opts).setup();
  engine.registerViz(viz);
  return viz;
}

var makeViz1 = function(cb) {
  var data = {
    table: "data", 
    attrs: { 
      State: "discrete"
    },
  };
  Util.getAttrStats(data,
    function(data) {
      console.log(data)
      var opts = {
        id: "#viz1", 
        state: data['State']
      };
      cb(null, setupViz(q1, opts));
  });
};

// link the vizes
async.parallel([makeViz1], function(err, vizes) { 
  _.each(vizes, (viz) => {
      engine.requester.vizMap[viz.id] = viz;
  }); 
  // Disable the prediction by commenting this line
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
  console.log("data:", arr)
  engine.ringbuf.write(arr);
  if (Util.WRITEDEBUG)
    Util.Debug.updateWrite(arr);
}, Util.Debug.debug.bind(Util.Debug));
