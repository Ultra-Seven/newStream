var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;
var Dist = require("./dist.js")
var ktmPred = require("./ktm.js")

// @position: [x, y, action]
function mouseToKey(position) {
  return position.join(":");
}

// This should be a selfcontained file.  Any data you need should be embedded in this file.

var Predictor = (function() {

  // @boxes List of bounding boxes for the clickable elements on the page
  function Predictor(boxes) {
    this.boxes = boxes || [];
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
    return new Dist.NaiveDistribution(mouseToKey);
  }

  return Predictor;
})();


// Baseline prediction that is based on KTM that we provide
//
var BaselinePredictor = (function(Predictor) {
  extend(BaselinePredictor, Predictor);

  // @boxes List of bounding boxes for the clickable elements on the page
  // @templates list of precomputed KTM templates (default is loaded from /static/data/ktmdata.json)
  function BaselinePredictor(boxes, templates) {
    this.ktm = new ktmPred.KTM(templates);
    Predictor.apply(this, arguments);
  };

  BaselinePredictor.prototype.predict = function(trace, deltaTime) {
    var pt = null;
    if (trace.length <= 2) { 
      if (trace.length == 0) return null;
      pt = trace[trace.length - 1];
    } else {
      try{
        pt = this.ktm.predictPosition(trace, deltaTime);
      } catch (e) { return null; }
    }
    var pred = [pt[0], pt[1], "m"];
    var dist = Dist.NaiveDistribution.from(pred, mouseToKey);
    dist.set(pred, 1);
    return dist;
  };

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
