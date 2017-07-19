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
  var i = 1;

  function Debug() { };
  Debug.prototype.debug = function(arr) {
    var cost = Date.now() - start;
    var total = d3.sum(counts);
    var avg = d3.mean(counts);
    var stats = [total/cost/1000 + "mb/s", cost + "ms", total + "bytes", "avg:"+avg+"bytes"];

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
  return Debug;
})();
Debug = new Debug();

function first(func) {
  var obj = undefined;
  return function(o) {
    if (obj == null) {
      obj = o;
    }
    if (o === obj) {
      arg = Array.prototype.slice.apply(arguments);
      arg.shift();
      return func.apply(this, arg);
    } else {
      return null;
    }
  }
}

module.exports = {
  stream_from: stream_from,
  Debug: Debug,
  getAttrStats:getAttrStats,
  first:first,
  DEBUG: true
}
