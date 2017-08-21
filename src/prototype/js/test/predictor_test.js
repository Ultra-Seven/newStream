var Dist = require("../dist");
var Pred = require("../predictor")
var Trace = require('./eventTrace')
var PredTest = (function() {
  function PredTest(data, engine, opts) {
    this.engine = engine;
    this.data = data;
    
    this.K = opts["topK"] || 5;
    // fix tk, vary length
    this.tk = [20, 60, 100, 200];
    this.n = opts["n"] || 30;
    this.testTimes = opts["testTimes"] || 10;
    this.max = 80;
    this.testResults = {};
    this.rawTestResults = {};

    // fix length, vary tk
    this.lengths = [20, 50, 80];
    this.fixedLength = 50;
    this.kRange = [20, 40, 60, 80, 100, 120, 140, 160, 180, 200];

    this.type = opts["type"] || "";

    this.traceConfig = new Trace.Trace();
    this.eventPredictor = new Pred.MousePredictor(this.kRange, [this.traceConfig.eventTrace], this.kRange);

    if (this.type === "mouse") {
      this.queryData = this.generateQueryTrace(this.traceConfig.eventTrace);
      this.testData = this.generateQueryTrace(this.data);
      this.queryePredictor = new Pred.BaselinePredictor(20, this.kRange, [2, 3, 4, 5]);
    }
  }

  PredTest.prototype.generateQueryTrace = function(trace) {
    var kfunc = function(query) {
      return Object.values(query.data).join(",");
    }
    let queryData = [];
    _.each(trace, point => {
      let qn = this.getVizElementQueries(point);
      if (qn.length > 0) {
        qn = qn[0];
        queryData.push([kfunc(qn), qn.toSQL(), point[2], point[3]]);
      }
    });
    return queryData;
  }

  PredTest.prototype.varyLength = function() {
    _.each(this.tk, time => {
      console.log("for time:" + time);
      let result = this.testK(time);
      this.rawTestResults[time + ""] = result;
      this.testResults[time + ""] = this.averageResults(result);
    });
  }

  PredTest.prototype.varyK = function() {
    _.each(this.lengths, length => {
      console.log("for length:" + length);
      let result = this.testLength(length);
      this.rawTestResults[length + ""] = result;
      this.testResults[length + ""] = this.averageResults(result);
    })
  }

  PredTest.prototype.testLength = function(length) {
    let lengthResult = [];
    for (let i = 0; i < this.testTimes; i++) {
      console.log("start test times:" + (i + 1));
      let trace = this.generateSubTrace(this.n);
      let result = {};
      for (let j = 0; j < this.kRange.length; j++) {
        let out = false;
        while(!out) {
          let k = this.kRange[j];
          let qnIndex = this.getQnIndex(k, trace, length);
          let qn = null;
          let trainingSet = trace.slice(0, length);
          let tk = trace[qnIndex][2] - trainingSet[length - 1][2];
          if (this.type === "mouse") {
            qn = trace[qnIndex];
          }
          else if (this.type === "baseline") {
            qn = trace[qnIndex];
            tk = k;
          }
          else {
            qn = this.getVizElementQueries(trace[qnIndex]);
          }
          if (qn.length == 0 || (Math.abs(tk - k)) > 5)  {
            trace = this.generateSubTrace(this.n);
            continue;
          }
          else {out = true;}
          let accuracy = this.getKalmanAccuracy(trainingSet, tk, qn);
          result["" + k] = accuracy;
        }
      }
      lengthResult.push(result);
    }
    return lengthResult;
  }

  PredTest.prototype.getResults = function(k) {
    return this.testResults;
  }

  PredTest.prototype.getRawResults = function(k) {
    return this.rawTestResults;
  }
  
  PredTest.prototype.getQnIndex = function(k, trace, end) {
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

  PredTest.prototype.getEnd = function(k, trace) {
    let endTime = trace[trace.length - 1][2];
    let index = trace.length - 2;
    let min = Math.abs(endTime - trace[index][2] - k);;
    for (let i = trace.length - 3; i >= 0; i--) {
      let timeElapse = endTime - trace[i][2];
      if (Math.abs(timeElapse - k) <= min) {
        min = Math.abs(timeElapse - k);
        index = i;
      }
      else
        return index + 1;
    }
  }

  PredTest.prototype.testK = function(k) {
    // const length = k;
    let tkResult = [];
    for (let i = 0; i < this.testTimes; i++) {
      console.log("start test times:" + (i + 1));
      let trace = this.generateSubTrace(this.n);
      let end = this.getEnd(k, trace);
      let result = {};
      for (let j = 10; j < this.max; j++) {
        let out = false;
        while(!out) {
          let qnIndex = this.getQnIndex(k, trace, j);
          let qn = null;
          let trainingSet = trace.slice(0, j);
          let tk = trace[qnIndex][2] - trainingSet[trainingSet.length - 1][2];
          if (this.type === "mouse") {
            qn = trace[qnIndex];
          }
          else if (this.type === "baseline") {
            qn = trace[qnIndex];
            tk = k;
          }
          else {
            qn = this.getVizElementQueries(trace[qnIndex]);
          }
          if (qn.length == 0 || (Math.abs(tk - k)) > 5) {
            trace = this.generateSubTrace(this.n);
            continue;
          }
          else {out = true;}
          let accuracy = this.getKalmanAccuracy(trainingSet, tk, qn);
          const length = j;
          result["" + length] = accuracy;
        }
      }
      tkResult.push(result);
    }
    return tkResult;
    
  }

  PredTest.prototype.averageResults = function(result) {
    let finalResult = {};
    let times = {};
    _.each(result, element => {
      _.each(element, (value, key) => {
        times[key] = 0;
      })
    })
    
    _.each(result, element => {
      _.each(times, (value, key) => {
        if (key in element) {
          if (key in finalResult) {
            finalResult[key] += element[key];
          }
          else {
            finalResult[key] = element[key];
          }
          times[key]++;
        }
      });
    });
    let final_results = {}
    _.each(finalResult, (num, key) => {
      final_results[key] = num / times[key]; 
    });
    return final_results;
  }

  PredTest.prototype.generateSubTrace = function(length) {
    if (this.type === "baseline") {
      let start = _.random(0, this.testData.length - length);
      return this.testData.slice(start, start + length);
    }
    let start = _.random(0, this.data.length - length);
    return this.data.slice(start, start + length);
  }

  PredTest.prototype.getKalmanAccuracy = function(trainingSet, tk, qn) {
    let accuracy = 0;
    if (this.type === "mouse") {
      let distributions = this.engine.requester.mousePredictor.predict(trainingSet, [tk]);
      accuracy = this.getMouseDistance(distributions, qn);
    }
    else if(this.type === "baseline") {
      let dist = this.queryePredictor.predict(trainingSet, tk);
      if (dist) {
        accuracy = this.getQueryNDCG(dist, qn);
      }
    }
    else {
      let distributions = this.engine.requester.getQueryDistribution(trainingSet, [tk]);
      let dist = new Dist.TimeDistribution(null, this.timeRange); 
      dist.addNaiveDist(distributions[0], tk, this.K);
      accuracy = this.getNDCG(dist, qn, tk, true);
    }
    return accuracy;
  }

  PredTest.prototype.getVizElementQueries = function(point) {
    let retList = [];
    _.each(this.engine.vizes, (viz) => {
      let elements = viz.getInteractableElements();
      _.each(elements, element => {
        let el = $(element);
        let bound = {
          w: el.width(),
          h: el.height(),
          x: el.offset().left, // x=0 is left edge of the page
          y: el.offset().top   // y=0 is top of the page
        };
        let xpw = bound.x + bound.w;
        let xmw = bound.x;
        let yph = bound.y + bound.h;
        let ymh = bound.y;
        if (point[0] < xpw && point[0] > xmw && point[1] < yph && point[1] > ymh) {
          retList = viz.getQueries(element);
        }
      });
    });
    return retList;
  }

  PredTest.prototype.getMouseDistance = function(dist, point, tk) {
    let distributionX = dist[0].gaussianX;
    let distributionY = dist[0].gaussianY;
    //calculate the NDCG
    let predictedMouseX = distributionX.mean;
    let predictedMouseY = distributionY.mean;
     
    return Math.sqrt(Math.pow((predictedMouseX - point[0]), 2) + Math.pow((predictedMouseY - point[1]), 2));
  }

  PredTest.prototype.getQueryNDCG = function(dist, qn) {
    //calculate the NDCG
    let rank = Object.values(dist);
    let keys = Object.keys(dist);
    let prob = -1;
    if (!(qn[0] in dist)) {
      return 0;
    }
    prob = dist[qn[0]];
    let sorted = _.sortBy(rank, function(num){ return num * -1; })
    let values = _.map(sorted, function(value, idx) {return (Math.pow(2, value) - 1) / (Math.log(2 + idx))});
    const Z = _.reduce(values, (mem, num) => {return mem+num;});

    const accuracy = sorted.indexOf(prob) >= 0 ? values[sorted.indexOf(prob)] : 0;
     
    return accuracy / Z;
  }

  PredTest.prototype.getNDCG = function(dist, qn, tk, intop) {
    let distribution = dist.dist[tk+""];
    var isQueryEqual = function(q1, q2) {
      q1 = _.sortBy(q1, function(q){ return q.toSQL(); });
      q2 = _.sortBy(q2, function(q){ return q.toSQL(); });
      for (let i = 0; i < q2.length; i++) {
        if (q1[i].toSQL() !== q2[i].toSQL()) {
          return false;
        }
      }
      return true;
    }
    //calculate the NDCG
    let rank = [];
    let prob = -1;
    _.each(distribution, (value, key) => {
      if (isQueryEqual(qn, [value[0]])) {
        prob = value[1];
      }
      rank.push(value[1]);
    })
    let sorted = _.sortBy(rank, function(num){ return num * -1; })
    let values = _.map(sorted, function(value, idx) {return (Math.pow(2, value) - 1) / (Math.log(2 + idx))});
    const Z = _.reduce(values, (mem, num) => {return mem+num;});

    const accuracy = sorted.indexOf(prob) >= 0 ? (intop ? Z : values[sorted.indexOf(prob)]) : 0;
     
    return accuracy / Z;
  }

  return PredTest;
})();


module.exports = {
  PredTest: PredTest
}
