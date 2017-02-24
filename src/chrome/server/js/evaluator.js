// you may want to copy dist.js over from the prototype code!
var Dist = require("./dist.js")
var Pred = require("./predict.js")
var fs = require("fs");


var Evaluator = (function() {

  // @fullTraces a list of mouse traces: [ trace1, trace2, ...]
  //             where trace is [ [x, y, t, action], ... ]
  function Evaluator(fullTraces) {
    this.fullTraces = fullTraces;
  };

  // @predictor a Predictor object
  // @return an accuracy score between 0 and 1, where 0 sucks, and 1 is great
  Evaluator.prototype.eval = function(predictor) {

    // TODO: do something to evaluate your predictions

    return 0;
  };

  return Evaluator;
})();


console.log("Assuming you are running in src/chrome/server/");
var ktmdata = JSON.parse(fs.readFileSync("./static/data/ktmdata.json"));

var traces = [];  // TODO: give it your mouse traces
var yourPred = Pred.YourPredictor([]);
var baseline = Pred.BaselinePredictor([], ktmdata);
var eval = new Evaluator(traces);
console.log("Your Score: " + eval.eval(yourPred));
console.log("Base Score: " + eval.eval(baseline));


module.exports = {
  Evaluator: Evaluator
}
