

//
// using fetch
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


function binarySum(a,b) { return a + b;}

var Debug = (function Debug() {
  var start = Date.now();
  var counts = [];
  var i = 1;

  function Debug() { };
  Debug.prototype.debug = function(arr) {
    var cost = Date.now() - start;
    var total = counts.reduce(binarySum, 0)
    var stats = [total/cost/1000 + "mb/s", cost, total];

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




module.exports = {
  stream_from: stream_from,
  Debug: Debug
}
