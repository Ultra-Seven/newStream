var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;
var Dist = require("./dist.js")


// This should be a selfcontained file.  Any data you need should be embedded in this file.

var Predictor = (function() {
  function Predictor(boxes) {
    this.boxes = boxes;
  };

  // TODO: override this function
  //
  // @trace list of [x, y, t, action] tuples.
  //        t might not be normalized to start at 0!
  //        action is "m", "d", or "u"
  //
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


// Baseline prediction that is based on KTM that we provide
var BaselinePredictor = (function(Predictor) {
  extend(BaselinePredictor, Predictor);

  function BaselinePredictor(boxes) {
    Predictor.apply(this, arguments);
  };
  

  // TODO: Tejas: fill in code here for the baseline

  return BaselinePredictor;
})(Predictor);




var YourPredictor = (function(Predictor) {
  extend(YourPredictor, Predictor);

  function YourPredictor(boxes) {
    Predictor.apply(this, arguments);
  };
  

  // TODO: fill in with your code

  return YourPredictor;
})(Predictor);



module.exports = {
  Predictor: Predictor,
  BaselinePredictor: BaselinePredictor,
  YourPredictor: YourPredictor
}
