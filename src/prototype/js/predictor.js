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
var BaselinePredictor = (function(Predictor) {
  extend(BaselinePredictor, Predictor);


  function BaselinePredictor(length, logs, range) {
    //console.log("init here", templates);
    this.n = length;
    this.logs = logs;
    this.tkRange = range || [20, 40, 60, 80, 100, 120, 140, 160, 180, 200];
    this.modelTable = {};
    _.each(this.tkRange, tk => {
      let VL = {};
      _.each([2, 3, 4, 5], length => {
        VL[length+""] = this.pathModelConstructionByTime(tk, length);
      });
      this.modelTable[tk+""] = VL;
    })
    Predictor.apply(this, arguments);
  };

  BaselinePredictor.prototype.predict = function(queryTrace, deltaTime) {
    let hashTable = this.modelTable[deltaTime+""];
    for (let i = 0; i < queryTrace.length; i++) {
      let P = queryTrace.slice(i, queryTrace.length);
      let len = P.length + "";
      let request = _.reduce(P, function(memo, num){ return memo + "+" + num[0]; }, "");
      if (len in hashTable && request in hashTable[len]) {
        return hashTable[len][request];
      }
    }
    return null
  };

  BaselinePredictor.prototype.getQnIndex = function(k, trace, end) {
    let min = Math.abs(trace[end][2] - trace[end - 1][2] - k);
    let index = end;
    for (let i = end + 1; i < trace.length; i++) {
      let timeElapse = trace[i][2] - trace[end - 1][2];
      if (Math.abs(timeElapse - k) < min) {
        min = Math.abs(timeElapse - k);
        index = i;
      }
      else
        return index;
    }
  }
  BaselinePredictor.prototype.pathModelConstructionByTime = function(deltaTime, length) {
    // filter log file

    // initialize table
    let table = {};
    let model = {};
    let maxTable = {};
    for (let i = 0; i < this.logs.length; i++) {
      let session = this.logs[i];
      for (let j = 0; j < session.length; j++) {
        if (session.length - j  > 100) {
          // find a sub-string of length n starting at alphabet j
          let P = session.slice(j, j + length);
          let request = _.reduce(P, function(memo, num){ return memo + "+" + num[0]; }, "");
          // find the next click
          let nextIndex = this.getQnIndex(deltaTime, session, j + length);
          if (Math.abs(session[nextIndex][2] - session[j + length - 1][2] - deltaTime) > 5) {continue;}
          let C = session[nextIndex];
          const key = request + ":" + C[0];
          if (key in table) {
            table[key]++;
          }
          else {
            table[key] = 1;
          }
        }
      }
    }
    _.each(table, (value, key) => {
      const list = key.split(":");
      const trace = list[0];
      const prediction = list[1];
      if (trace in model) {
        model[trace][prediction] = value;
      }
      else {
        model[trace] = {};
        model[trace][prediction] = value;
      }
    });
    _.each(model, (dist, key) => {
      let probs = Object.values(dist);
      let sum = _.reduce(probs, function(memo, num){ return memo + num; }, 0);
      _.each(dist, (value, k) => {
        model[key][k] = value / sum;
      });
    })

    return model;
  };

  return BaselinePredictor;
})(Predictor);


var MousePredictor = (function(Predictor) {
  extend(MousePredictor, Predictor);

  function MousePredictor(logs, range, lengths) {
    this.logs = logs;
    this.tkRange = range || [20, 40, 60, 80, 100, 120, 140, 160, 180, 200];
    this.lengths = lengths || [2, 3, 4, 5];
    this.modelTable = {};
    _.each(this.tkRange, tk => {
      let VL = {};
      _.each(this.lengths, length => {
        VL[length+""] = this.pathModelConstructionByTime(tk, length);
      });
      this.modelTable[tk+""] = VL;
    });

    Predictor.apply(this, arguments);
  };

  MousePredictor.prototype.getQnIndex = function(k, trace, end) {
    let min = Math.abs(trace[end][2] - trace[end - 1][2] - k);
    let index = end;
    for (let i = end + 1; i < trace.length; i++) {
      let timeElapse = trace[i][2] - trace[end - 1][2];
      if (Math.abs(timeElapse - k) < min) {
        min = Math.abs(timeElapse - k);
        index = i;
      }
      else
        return index;
    }
  }


  MousePredictor.prototype.predict = function(queryTrace, deltaTime) {
    let hashTable = this.modelTable[deltaTime+""];
    for (let i = 0; i < queryTrace.length; i++) {
      let P = queryTrace.slice(i, queryTrace.length);
      let len = P.length + "";
      let request = _.reduce(P, function(memo, num){ return memo + num[3]; }, "");
      if (len in hashTable && request in hashTable[len]) {
        return hashTable[len][request];
      }
    }
    return null
  };

  MousePredictor.prototype.pathModelConstructionByTime = function(deltaTime, length) {
    // filter log file

    // initialize table
    let table = {};
    let model = {};
    let maxTable = {};
    for (let i = 0; i < this.logs.length; i++) {
      let session = this.logs[i];
      for (let j = 0; j < session.length; j++) {
        if (session.length - j  > 100) {
          // find a sub-string of length n starting at alphabet j
          let P = session.slice(j, j + length);
          let request = _.reduce(P, function(memo, num){ return memo + num[3]; }, "");
          // find the next click
          let nextIndex = this.getQnIndex(deltaTime, session, j + length);
          if (Math.abs(session[nextIndex][2] - session[j + length - 1][2] - deltaTime) > 5) {continue;}
          let C = session[nextIndex];
          const key = request + ":" + C[3];
          if (key in table) {
            table[key]++;
          }
          else {
            table[key] = 1;
          }
        }
      }
    }
    _.each(table, (value, key) => {
      const list = key.split(":");
      const trace = list[0];
      const prediction = list[1];
      if (trace in model) {
        model[trace][prediction] = value;
      }
      else {
        model[trace] = {};
        model[trace][prediction] = value;
      }
    });
    _.each(model, (dist, key) => {
      let probs = Object.values(dist);
      let sum = _.reduce(probs, function(memo, num){ return memo + num; }, 0);
      _.each(dist, (value, k) => {
        model[key][k] = value / sum;
      });
    })

    return model;
  };



  // TODO: fill in with your code
  MousePredictor.prototype.predict = function(trace, deltaTime) {
    
    return mydists;
  };

  return MousePredictor;
})(Predictor);


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
    if (trace.length <= 0) {
        if (trace.length == 0) return null;
        pt = trace[trace.length - 1];
    } 
    else {

      // R to add random noise
      // to the known position of the mouse.  The higher the
      // values, the more noise
      var decay = 0.003;
      var R = Matrix.Diagonal([0.1, 0.1, 0.1, 0.1, 0, 0]);

      // initial state (location and velocity, acceleration)
      var x = $M([
          [trace[0][0]],
          [trace[0][1]],
          [0],
          [0],
          [0],
          [0]
      ]);

      // external motion
      var u = $M([
          [0],
          [0],
          [0],
          [0],
          [0],
          [0]
      ]);

      // initial uncertainty
      var P = Matrix.Random(6, 6);


      // measurement function (4D -> 2D)
      // This one has to be this way to make things run
      var H = $M([
          [1, 0, 0, 0, 0, 0],
          [0, 1, 0, 0, 0, 0],
          [0, 0, 1, 0, 0, 0],
          [0, 0, 0, 1, 0, 0],
          [0, 0, 0, 0, 1, 0],
          [0, 0, 0, 0, 0, 1],
      ]);

      // identity matrix
      var I = Matrix.I(6);

      // To determine dt
      var time = trace[0][2];

      var Q = $M(
          [
              [0.1, 0, 0, 0, 0, 0],
              [0, 0.1, 0, 0, 0, 0],
              [0, 0, 0.1, 0, 0, 0],
              [0, 0, 0, 0.1, 0, 0],
              [0, 0, 0, 0, 0.1, 0],
              [0, 0, 0, 0, 0, 0.1]
          ]);
      let timeElapse = [];
      for (let i = 0; i < trace.length - 1; i++) {
          timeElapse.push(trace[i + 1][2] - trace[i][2]);
      }
      for (var i = 2; i < trace.length; i++) {
        let dt = timeElapse[i - 1];
        // Derive the next state
        const dt2 = Math.pow(dt, 2);
        F = $M([
            [1, 0, dt, 0, dt2, 0],
            [0, 1, 0, dt, 0, dt2],
            [0, 0, 1, 0, dt, 0],
            [0, 0, 0, 1, 0, dt],
            [0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 1]
        ]);

        // decay confidence
        // to account for change in velocity
        P = P.map(function(x) {
            return x * (1 + decay * dt);
        });

        // Fake uncertaintity in our measurements
        let xMeasure = trace[i][0];
        let yMeasure = trace[i][1];
        let vxMeasure = (trace[i][0] - trace[i - 1][0]) / dt;
        let vyMeasure = (trace[i][1] - trace[i - 1][1]) / dt;
        let vxpMeasure = (trace[i - 1][0] - trace[i - 2][0]) / timeElapse[i - 2];
        let vypMeasure = (trace[i - 1][1] - trace[i - 2][1]) / timeElapse[i - 2];
        let axMeasure = (vxMeasure - vxpMeasure) * 2 / (dt + timeElapse[i - 2]);
        let ayMeasure = (vyMeasure - vypMeasure) * 2 / (dt + timeElapse[i - 2]);



        // prediction
        x = F.x(x).add(u);
        P = F.x(P).x(F.transpose()).add(Q);

        // measurement update
        Z = $M([[xMeasure, yMeasure, vxMeasure, vyMeasure, axMeasure, ayMeasure]]);
        y = Z.transpose().subtract(H.x(x));
        S = H.x(P).x(H.transpose()).add(R);

        K = P.x(H.transpose()).x(S.inverse());
        x = x.add(K.x(y));
        P = I.subtract(K.x(H)).x(P);

      }
      for (let i = 0; i < deltaTime.length; i++) {
          // Derive the next state
        const delta = deltaTime[i];
        const delta2 = Math.pow(deltaTime[i], 2);
        let F_time = $M([
            [1, 0, delta * 0.6, 0, 0, 0],
            [0, 1, 0, delta * 0.6, 0, 0],
            [0, 0, 1, 0, delta, 0],
            [0, 0, 0, 1, 0, delta],
            [0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 1]
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
  BaselinePredictor: BaselinePredictor,
  YourPredictor: YourPredictor,
  MousePredictor: MousePredictor
}
