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
    let mydists = [];
    if (trace.length <= 2) {
      if (trace.length == 0) return null;
      pt = trace[trace.length - 1];
    } else {
    
      // R to add random noise
      // to the known position of the mouse.  The higher the
      // values, the more noise
      var decay = 0.003; 
      var R = Matrix.Diagonal([0.1, 0.1]);
          
      // initial state (location and velocity)
      var x = $M([
        [trace[0][0]], 
        [trace[0][1]], 
        [0], 
        [0] 
      ]);

      // external motion
     var u = $M([
          [0], 
          [0], 
          [0], 
          [0]
      ]);
              
      // initial uncertainty
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

      var Q = $M(
          [[0.1, 0, 0, 0],
          [0, 0.1, 0, 0],
          [0, 0, 0.1, 0],
          [0, 0, 0, 0.1]
      ]);
      let timeElapse = [];
      for (let i = 0; i < trace.length - 1; i++) {
        timeElapse.push(trace[i + 1][2] - trace[i][2]);
      }
      for (var i = 1; i < trace.length; i++) {
        let dt = timeElapse[i - 1];
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
        xMeasure = trace[i][0] + R.e(1,1) * 2 * (Math.random() - 0.5);
        yMeasure = trace[i][1] + R.e(2,2) * 2 * (Math.random() - 0.5);
        
        // prediction
        x = F.x(x).add(u);
        P = F.x(P).x(F.transpose()).add(Q);

        // measurement update
        Z = $M([[xMeasure, yMeasure]]);
        y = Z.transpose().subtract(H.x(x));
        S = H.x(P).x(H.transpose()).add(R);

        K = P.x(H.transpose()).x(S.inverse());
        x = x.add(K.x(y));
        P = I.subtract(K.x(H)).x(P);
        
      }
      for (let i = 0; i < deltaTime.length; i++) {
        // Derive the next state
        const delta = deltaTime[i];
        let F_time = $M([[1, 0, delta, 0], 
                [0, 1, 0, delta], 
                [0, 0, 1, 0], 
                [0, 0, 0, 1]
               ]); 
         
        // decay confidence
        // to account for change in velocity
        let P_time = P.map(function(x) {
           return x * (1 + decay * deltaTime[i]);
        });
          
        // prediction
        let x_time = F_time.x(x).add(u);
        P_time = F_time.x(P_time).x(F_time.transpose()).add(Q);

        let mouseX = x_time.e(1, 1);
        let mouseY = x_time.e(2, 1);


        // TODO: reurn null?
        const vx = (P_time.e(1,1) < 1) ? 1 : P_time.e(1,1).toFixed(3);
        const vy = (P_time.e(2,2) < 1) ? 1 : P_time.e(2,2).toFixed(3);
        let distributionX = gaussian(mouseX, vx);
        let distributionY = gaussian(mouseY, vy);
        mydists.push(new Dist.GuassianDistribution(mouseToKey, distributionX, distributionY));
      }
    }
    return mydists;
  };
  return YourPredictor;
})(Predictor);



module.exports = {
  Predictor: Predictor,
  YourPredictor: YourPredictor
}
