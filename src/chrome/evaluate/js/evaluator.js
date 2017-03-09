// you may want to copy dist.js over from the prototype code!
var _ = require("underscore")
var fs = require("fs");


branches = ["bgwte", "fpyz", "gal", "gr2547_sh3266", "lw2666_az2407"]

var Evaluator = (function() {

  // @fullTraces a list of mouse traces: [ trace1, trace2, ...]
  //             where trace is [ [x, y, t, action], ... ]
  function Evaluator(fullTraces) {
    this.fullTraces = fullTraces;
    this.evaluators = _.object(_.compact(_.map(branches, function(branch){
      try {
        var klass = require("./evaluator_"+branch).Evaluator;
        var start = Date.now();
        var o = new klass(fullTraces);
        var cost = Date.now() - start;
        return [branch, { evaluator: o, cost: cost }];
      } catch (e) {
        console.error("\n");
        console.error("Error in require('evaluator_" + branch + ".js');");
        console.error(e);
        return null;
      }
    })));
  };

  // @predictor a Predictor object
  // @return an accuracy score between 0 and 1, where 0 sucks, and 1 is great
  Evaluator.prototype.eval = function(predictor) {
    var res = _.object(_.compact(_.map(this.evaluators, function(d, branch) {
      var evaluator = d.evaluator;
      try {
        var start = Date.now();
        var score = evaluator.eval(predictor);
        var cost = Date.now() - start;
        return [branch, { score: score, cost: cost } ];
      } catch (e) {
        console.error("\n");
        console.error("Error running evaluator_"+branch+".eval() on predictor_" + predictor.branch );
        console.error(e);
        return null;
      }
    })));
    return res;
  };

  return Evaluator;
})();

module.exports = {
  Evaluator: Evaluator
}
