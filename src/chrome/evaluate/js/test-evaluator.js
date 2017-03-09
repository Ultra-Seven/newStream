var _ = require("underscore");
var fs = require("fs");
var Evaluator = require("./evaluator").Evaluator;
var BaselinePredictor = require("./predict").BaselinePredictor;


function loadJSON(path) {
  return JSON.parse(fs.readFileSync(path));
};
function evaluate(name, predictor, evaluator) {
  try {
    var scores = evaluator.eval(predictor);
  } catch(e) {
    console.error("Error in evaluate() on " + name);
    console.error(e);
    return null;
  }
  _.each(scores, function(score, evalname) {
    var namePadding = _.times(Math.max(0, 25 - name.length), function() { return " ";}).join("");
    var evalPadding = _.times(Math.max(0, 25 - evalname.length), function() { return " ";}).join("");
    console.log([name + namePadding, evalname + evalPadding, score].join("\t"));
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
console.log(["Predictor               ", "Evaluator                    ", "Score"].join("\t"));
console.log("--------------------------------------------------------------------");
evaluate("Baseline", baseline, eval);

var results = _.object(_.compact(_.map(branches, function(branch){
  try {
    var YourPredictor = require("./predict_" + branch).YourPredictor;
    var yourPred = new YourPredictor();
    yourPred.branch = branch;
  } catch(e) {
    console.error("\n");
    console.error("Error in require('predict_"+branch+".js'): ");
    console.error(e);
    return null;
  }

  try {
    var results = evaluate(branch, yourPred, eval);
    return [branch, results];
  } catch(e) {
    console.error("\n");
    console.error("Error in evaluate(): " + branch);
    console.error(e);
    return null;
  }

})));
