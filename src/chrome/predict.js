// This should be a selfcontained file.  Any data should be embedded in this file.

var Predictor = (function() {
  function Predictor(boxes) {
    this.boxes
  };

  // @trace list of [x, y, t] triplets.  t might not be normalized to start at 0!
  // @return prediction of mouse location and the action at that time
  Predictor.prototype.predict = function(trace, deltaTime) {
    // TODO: fill in this code
    
    return {
      x: 0,
      y: 0,
      action: "move"   // options: move, click, drag
    }
  }

  return Predictor;
})();


var Evaluator = (function() {
  function Evaluator() {};

  // @return an accuracy score between 0 and 1, where 0 sucks, and 1 is great
  Evaluator.prototype.eval = function(fullTrace) {
    // TODO: do something to evaluate your predictions
    return 0;
  };
})();

module.exports = {
  Predictor: Predictor,
  Evaluator: Evaluator
}
