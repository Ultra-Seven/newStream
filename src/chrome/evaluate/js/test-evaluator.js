var _ = require("underscore");
var fs = require("fs");
var Evaluator = require("./evaluator").Evaluator;
var BaselinePredictor = require("./predict").BaselinePredictor;


function loadJSON(path) {
  return JSON.parse(fs.readFileSync(path));
};
function evaluate(name, predictor, evaluator) {
  var scores = evaluator.eval(baseline);
  _.each(scores, function(score, evalname) {
    console.log([name, evalname, score].join("\t"));
  });
  return scores;
}



branches = ["bgwte", "fpyz", "gal", "gr2547_sh3266", "lw2666_az2407"]
console.log("Assuming you are running test script in src/evaluator/");

var traces = loadJSON("./data/alltraces.json");
traces = _.head(_.filter(traces, function(trace) { return trace.length > 3; }), 20);
var eval = new Evaluator(traces);

var ktmdata = loadJSON("./data/ktmdata.json");
var baseline = new BaselinePredictor([], ktmdata);

// we will import your prediction objects to evaluate here
console.log(["Predictor", "Evaluator", "Score"].join("\t"));
console.log("-------------------------------------------------");
evaluate("Baseline", baseline, eval);

