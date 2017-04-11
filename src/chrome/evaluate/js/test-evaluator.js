var _ = require("underscore");
var fs = require("fs");
var Evaluator = require("./evaluator").Evaluator;
var BaselinePredictor = require("./predict").BaselinePredictor;


function loadJSON(path) {
  return JSON.parse(fs.readFileSync(path));
};

// right pad or shorten string to len
function pad(len, s) {
  s = s.toString();
  if (s.length > len) return s.slice(0, len);
  var padding = _.times(Math.max(0, len - s.length), function() { return " ";}).join("");
  return s + padding;
}
var pad20 = _.partial(pad, 20);
var pad5 = _.partial(pad, 5)

function evaluate(name, predictor, evaluator) {
  try {
    predictor.branch = name;
    var scores = evaluator.eval(predictor);
  } catch(e) {
    console.error("Error in evaluate() on " + name);
    console.error(e);
    return null;
  }
  _.each(scores, function(d, evalname) {
    var score = d.score,
        cost = d.cost;
    console.log([pad20(name), pad20(evalname), pad5(score), pad5(cost)].join("\t"));
  });
  return scores;
}



branches = ["bgwte", "fpyz", "gal", "gr2547_sh3266", "lw2666_az2407"]
console.log("Assuming you are running test script in src/evaluator/");

var traces = loadJSON("./data/alltraces.json");
traces = _.filter(traces, function(trace) { return trace.length > 5; });
traces = _.shuffle(traces, 500);
//traces = _.head(, 200);

var eval = new Evaluator(traces);

var ktmdata = loadJSON("./data/ktmdata.json");
var baseline = new BaselinePredictor([], ktmdata);

// we will import your prediction objects to evaluate here
console.log([pad20("Predictor"), pad20("Evaluator"), pad5("Score"), pad5("time")].join("\t"));
console.log("----------------------------------------------------------------------------");
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
