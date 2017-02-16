// you may want to copy dist.js over from the prototype code!
var Dist = require("./dist.js")
var Pred = require("./predict.js")


var Evaluator = (function() {
  function Evaluator() {};

  // @return an accuracy score between 0 and 1, where 0 sucks, and 1 is great
  Evaluator.prototype.eval = function(fullTrace) {
    // TODO: do something to evaluate your predictions
    return 0;
  };
})();

module.exports = {
  Evaluator: Evaluator
}
