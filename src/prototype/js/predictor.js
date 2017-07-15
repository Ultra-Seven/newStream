var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;
var Dist = require("./dist.js")
var gaussian = require('gaussian');
//var Gaussian = require('multivariate-gaussian');

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
// var BaselinePredictor = (function(Predictor) {
//   extend(BaselinePredictor, Predictor);

//   // @boxes List of bounding boxes for the clickable elements on the page
//   // @templates list of precomputed KTM templates (default is loaded from /static/data/ktmdata.json)
//   function BaselinePredictor(boxes, templates) {
//     //console.log("init here", templates);
//     this.ktm = new ktmPred.KTM(templates);
//     this.defaultPrediction = Dist.NaiveDistribution.from([0,0,'m'], mouseToKey);
//     Predictor.apply(this, arguments);
//   };

//   BaselinePredictor.prototype.predict = function(trace, deltaTime) {
//     var pt = null;
//     if (trace.length <= 2) {
//       if (trace.length == 0) return this.defaultPrediction;
//       pt = trace[trace.length - 1];
//     } else {
//       try{
//         pt = this.ktm.predictPosition(trace, deltaTime);
//       } catch (e) { return this.defaultPrediction; }
//     }
//     var pred = [pt[0], pt[1], "m"];
//     var dist = Dist.NaiveDistribution.from(pred, mouseToKey);
//     dist.set(pred, 1);
//     return dist;
//   };
//   return BaselinePredictor;
// })(Predictor);




var YourPredictor = (function(Predictor) {
  extend(YourPredictor, Predictor);

  function YourPredictor(boxes) {
    this.defaultPrediction = Dist.NaiveDistribution.from([0,0,'m'], mouseToKey);
    Predictor.apply(this, arguments);
  };

  // TODO: fill in with your code
  YourPredictor.prototype.predict = function(trace, deltaTime) {
    //console.log("trace:", trace);
    var pt = null;
    if (trace.length <= 2) {
      if (trace.length == 0) return this.defaultPrediction;
      pt = trace[trace.length - 1];
    } else {
    
      // The decay errodes the assumption that velocity 
      // never changes.  This is the only unique addition
      // I made to the proceedure.  If you set it to zero, 
      // the filter will act just like the one we designed
      // in class which means it strives to find a consitent
      // velocitiy.  Over time this will cause it to assume
      // the mouse is moving very slowly with lots of noise.
      // Set too high and the predicted fit will mirror the 
      // noisy data it recieves.  When at a nice setting, 
      // the fit will be resposive and will do a nice job
      // of smoothing out the function noise.
      // I use the uncertainty matrix, R to add random noise
      // to the known position of the mouse.  The higher the
      // values, the more noise, which can be seen by the 
      // spread of the orange points on the canvas.
      //
      // If you adjust this number you will often need to 
      // compensate by changing the decay so that the prediction
      // function remains smooth and reasonable.  However, as
      // these measurements get noisier we are left with a 
      // choice between slower tracking (due to uncertainty)
      // and unrealistic tracking because the data is too noisy.
      var decay = 0.003; 
      var R = Matrix.Diagonal([0.02, 0.02]);
          
      // initial state (location and velocity)
      // I haven't found much reason to play with these
      // in general the model will update pretty quickly 
      // to any entry point.

      var x = $M([
        [trace[0][0]], 
        [trace[0][1]], 
        [0], 
        [0] 
      ]);

      // external motion
      // I have not played with this at all, just
      // added like a udacity zombie.

      var u = $M([
          [0], 
          [0], 
          [0], 
          [0]
      ]);
              
      // initial uncertainty 
      // I don't see any reason to play with this
      // like the entry point it quickly adjusts 
      // itself to the behavior of the mouse
      var P = Matrix.Random(4, 4);

      // measurement function (4D -> 2D)
      // This one has to be this way to make things run
      var H = $M([
          [1, 0, 0, 0], 
          [0, 1, 0, 0]
      ]); 

      // identity matrix
      var I = Matrix.I(4);

      // To determine dt
      var time = trace[0][2]; 

      for (var i = 0; i < trace.length; i++) {
        var now = trace[i][2];
        var dt = now - time;
        time = now;
        //console.log("dt:", dt, "now:", now);
        // Derive the next state
        F = $M([[1, 0, dt, 0], 
                [0, 1, 0, dt], 
                [0, 0, 1, 0], 
                [0, 0, 0, 1]
               ]); 
       
        // decay confidence
        // to account for change in velocity
        P = P.map(function(x) {
            return x * (1 + decay * dt);
        });
        
        // Fake uncertaintity in our measurements
        xMeasure = trace[i][0] + 500 * R.e(1,1) * 2 * (Math.random() - 0.5);
        yMeasure = trace[i][1] + 500 * R.e(2,2) * 2 * (Math.random() - 0.5);
        
        // prediction
        x = F.x(x).add(u);
        P = F.x(P).x(F.transpose());

        // measurement update
        Z = $M([[xMeasure, yMeasure]]);
        y = Z.transpose().subtract(H.x(x));
        S = H.x(P).x(H.transpose()).add(R);

        K = P.x(H.transpose()).x(S.inverse());
        x = x.add(K.x(y));
        P = I.subtract(K.x(H)).x(P);
        
      }
      // Derive the next state
      F = $M([[1, 0, deltaTime, 0], 
              [0, 1, 0, deltaTime], 
              [0, 0, 1, 0], 
              [0, 0, 0, 1]
             ]); 
       
      // decay confidence
      // to account for change in velocity
      P = P.map(function(x) {
         return x * (1 + decay * deltaTime);
      });
        
      // prediction
      x = F.x(x).add(u);
      P = F.x(P).x(F.transpose());

      var mouseX = x.e(1, 1);
      var mouseY = x.e(2, 1);
      // TODO: reurn null?
      const vx = (P.e(1,1) < 0.001) ? 0.001 : P.e(1,1).toFixed(3);
      const vy = (P.e(2,2) < 0.001) ? 0.001 : P.e(2,2).toFixed(3);
      var distributionX = gaussian(mouseX, vx);
      var distributionY = gaussian(mouseY, vy);
    }
    let mydist = new Dist.GuassianDistribution(mouseToKey, distributionX, distributionY);
    //console.log("mydist:", mydist);
    return mydist;
  };
  return YourPredictor;
})(Predictor);



module.exports = {
  Predictor: Predictor,
  // BaselinePredictor: BaselinePredictor,
  YourPredictor: YourPredictor
}
