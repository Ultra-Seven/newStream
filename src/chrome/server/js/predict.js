var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[ke
    hasProp = {}.hasOwnProperty;
var Dist = require("./dist.js")


// This should be a selfcontained file.  Any data you need should be embedded in this file.

var Predictor = (function() {
  function Predictor(boxes) {
    this.boxes
  };

  // TODO: override this function
  //
  // @trace list of [x, y, t] triplets.  t might not be normalized to start at 0!
  // @return a Distribution object whose predictions are arrays of 
  //            
  //            [x position, y position, action]
  //
  //         where action is "m", "d", or "u"
  //
  Predictor.prototype.predict = function(trace, deltaTime) {
    
    return new Dist.NaiveDistribution();
  }

  return Predictor;
})();


var BaselinePredictor = (function(Predictor) {
  extend(BaselinePredictor, Predictor);

  function BaselinePredictor(boxes) {
    Predictor.apply(this, arguments);
  };
  

  // TODO: Tejas: fill in code here for the baseline

  return BaselinePredictor;
})(Predictor);


module.exports = {
  Predictor: Predictor,
  BaselinePredictor: BaselinePredictor
}
