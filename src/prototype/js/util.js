//
//
// Useful functions for running the application
//
//


// Get domain informaiton for x and y axes
//
// opts:  {
//   table: <table name>,
//   attrs: {
//      <attr name>: <data type>
//   }
// }
//
// where <data type> is "discrete" or "continuous"
//
var getAttrStats = function(opts, cb) {
  $.ajax({
    type: "POST",
    contentType: "application/json; charset=utf-8",
    url: "/attr/stats",
    data:  JSON.stringify(opts),
    success: cb,
    dataType: "json"
  });

}


// access the infinite byte stream via a fetch() call
var stream_from = function(url, cb, final_cb) {
  fetch(url).then(function(resp) {
    if (!resp.body) return;
    var reader = resp.body.getReader();
    function loop() {
      return reader.read().then(function(res) {
        if (res.done) return "done!";
        if (cb) cb(res.value);
        return setTimeout(loop);
      });
    }
    return loop();
  }).then(function(data) {
    if (final_cb) final_cb(data);
  });
};


var Debug = (function Debug() {
  var start = Date.now();
  var counts = [];
  var write_start = start;
  var time_counts = [];
  var write_counts = [];
  var distCosts = [];
  var encodeCosts = [];
  var trace = [];
  var responsive_data = [];
  var responsive_time = [];
  var i = 1;

  function Debug() { };
  Debug.prototype.debug = function(arr) {
    var cost = Date.now() - start;
    var total = d3.sum(counts);
    var avg = d3.mean(counts);
    var stats = [total/cost/1000 + "mb/s", cost + "ms", total + "bytes", "avg:"+ avg + "bytes"];

    console.log(stats.join("\t"));
    start = Date.now();
    counts = [];
  };

  Debug.prototype.update = function(arr) {
    counts.push(arr.length);
    if (counts.length > 1000 || (Date.now() - start) > 1000 * 2) {
      this.debug();
    }
  };
  Debug.prototype.updateWriteTime = function() {
    write_start = Date.now();
  }
  Debug.prototype.updateWrite = function(arr) {
    write_counts.push(arr.length);
    time_counts.push(Date.now() - write_start);
    //console.log("time", write_start);
    let cost = d3.sum(time_counts);
    if (write_counts.length > 1000 || cost > 1000 * 2) {
      let total = d3.sum(write_counts);
      let avg = d3.mean(write_counts);
      let avg_cost = d3.mean(time_counts);
      console.log("write data profiling:");
      let stats = [
              total/cost/1000 + "mb/s", 
              "avg bytes:" + avg + "bytes", 
              "avg costs:" + avg_cost + "ms"];
      console.log(stats.join("\t"));
      time_counts = [];
      write_counts = [];
    }
  }
  Debug.prototype.requesterTime = function(distCost, encodeCost, length) {
    distCosts.push(distCost);
    encodeCosts.push(encodeCost);
    trace.push(length);
    if (distCosts.length > 100) {
      let avg_dist = d3.mean(distCosts);
      let avg_encode = d3.mean(encodeCosts);
      let avg_length = d3.mean(trace);
      let stats = ["dist cost:" + avg_dist + "ms", "encode cost:" + avg_encode + "ms", "trace length:" + avg_length];
      console.log(stats.join("\t"));
      distCosts = [];
      encodeCosts = [];
      trace = [];
    }
  }
  Debug.prototype.responsiveEnd = function(time, length) {
    responsive_time.push(time);
    responsive_data.push(length);
    if (responsive_time.length >= 100) {
      let avg_time = d3.mean(responsive_time);
      let avg_length = d3.mean(responsive_data);
      let stats = ["average data:" + avg_length + "bytes", "average time:" + avg_time + "ms"];
      console.log(stats.join("\t"));
      responsive_data = [];
      responsive_time = [];
    }
  }
  return Debug;
})();
Debug = new Debug();


module.exports = {
  stream_from: stream_from,
  Debug: Debug,
  getAttrStats:getAttrStats,
  DEBUG: true,
  WRITEDEBUG: true,
  DISTDEBUG: true
}
