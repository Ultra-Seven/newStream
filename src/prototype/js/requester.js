var EventEmitter = require("events");
var Util = require("./util");
var Dist = require("./dist");
var Logger = require("./logger").Logger;
var Scheduler = require("./scheduler.js");
var Pred = require("./predictor.js");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


//
// The requester runs as an infinite loop to regularly send a query distribution to the backend.  
//
// Currently, the distribution is sent as a list of (query, probability) pairs
//
//    query is an instance of js/query.js:Query 
//    probability is a float between 0 and 1
//
// TODO: implement prediction, in which case we would send a list of triples:
//       (deltaTime, query, probability)
//       where deltaTime is the number of ms in the future the distributon is estimated for
//
var Requester = (function(EventEmitter) {
  extend(Requester, EventEmitter);

  function Requester(engine, opts) {
    opts = opts || {};
    this.engine = engine;
    this.minInterval = opts.minInterval || 50;
    this.minProb = opts.minProb || 0;
    this.timeRange = opts.timeRange || [25, 50, 150, 200];
    this.K = opts.K || 5;
    this.running = false;
    this.runningQuery = 0;
    this.logger;

    if (Util.PREDICTOR) {
      this.logger = new Logger({
        minResolution: 5,
        traceLength: 150
      });
      this.logger.bind(document);
    }
    
    this.mousePredictor = new Pred.YourPredictor([]);
   
    this.interactableElements = null;

    this.scheduler = new Scheduler.Scheduler(this.timeRange);

    this.nDist = 0;
    this.nEnc = 0;
    this.distCost = 0;
    this.encodeCost = 0;

    this.timeoutId;
    EventEmitter.call(this);

    this.vizMap = {};
    
  };

  //
  // Run forever:
  //  1. get current mouse trace
  //  2. get query distribution and send to server
  //  3. sleep for minInterval
  //
  // We track how quickly the distribution and toWire() call costs
  //
  Requester.prototype.run = function() {
    this.running = true;
    if (this.mousePredictor) {
      var trace = this.logger.trace;
      var start = Date.now();
      var dist = new Dist.TimeDistribution(null, this.timeRange); 

      let distributions = this.getQueryDistribution(trace, this.timeRange);
      for (var i = 0; i < distributions.length; i++) {
        dist.addNaiveDist(distributions[i], this.timeRange[i], this.K);
      }
      // var distribution = this.getQueryDistribution(trace, 100);
      const dist_delta = (Date.now() - start);
      this.distCost += dist_delta;
      this.nDist++;
      
      if (dist != null) {
        start = Date.now();
        var encodedDist = JSON.stringify(dist.toWire());
        const encode_delta = (Date.now() - start);
        this.encodeCost += encode_delta;
        this.nEnc++;
        if (Util.DETAIL) 
          console.log("SEND DISTRIBUTION:", distributions);
        this.send(encodedDist);

        if (Util.DISTDEBUG)
          Util.Debug.requesterTime(dist_delta, encode_delta, trace.length);
      }
    }
    this.timeoutId = setTimeout(this.run.bind(this), this.minInterval);
  };

  Requester.prototype.stopLoop = function() {
    if (this.running) {
      this.running = false;
      clearTimeout(this.timeoutId);
    }
  }

  Requester.prototype.startLoop = function() {
    if (!this.running) {
      this.running = true;
      this.timeoutId = setTimeout(this.run.bind(this), this.minInterval);
    }
  }
  //
  // manually send a distribution to the server
  //
  Requester.prototype.send = function(encodedDist, cb) {
    $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/distribution/set",
      data:  encodedDist,
      success: function (data) {
        if (Util.DEBUG)
          console.log(["sendDist got response", data])
        if (cb)
          cb(data);
      },
      dataType: "json"
    });
  }

  ////////////////////////////////////////////////////////
  //
  //  You will need to implement the functions below.
  //  We have left comments to help you out.
  //
  ////////////////////////////////////////////////////////

  // @param el a DOM element
  // @return bounding box of the element
  var getBoundingBox = function(el) {
    el = $(el);
    return {
      w: el.width(),
      h: el.height(),
      x: el.offset().left, // x=0 is left edge of the page
      y: el.offset().top   // y=0 is top of the page
    };
  };

  // @trace current mouse trace
  // @param dt number of milliseconds into the future
  // @return a list of [querytemplateid, params, probability]
  //         that conforms to the Requester wire format
  Requester.prototype.getQueryDistribution = function(trace, dt) {
    dt = dt || 100;
    // predicting is a heavy calculation
    var mouseDists = this.mousePredictor.predict(trace, dt);
    // TODO: Uncomment below when the function is implemented
    var queryDists = [];
    if(mouseDists && mouseDists.length) {
      _.each(mouseDists, (dist, idx) => {
        queryDists.push(this.mapMouseToQueryDistribution(dist, dt[idx]));
      });
       //console.log("topK:", queryDist.getTopK(10));
    }
    return queryDists;
  };

  //
  // Returns a list of DOM elements that the user can interact with
  // Hint: an easy way is to annotate the interactable marks in the visualization with 
  //       a custom class
  //
  // TODO: implement me!
  //
  //       querying the DOM is expensive -- you may eventually want to cache the results.
  //       if you do so, you may want some way to detect if the cache is stale.
  //
  //       Hint: MutationObserver is an efficient way to detect DOM changes incrementally without having to
  //             manually traverse the DOM tree yourself.
  //
  //             https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
  //
  Requester.prototype.getInteractableElements = function() {
    this.interactableElements = {};
    _.each(this.engine.vizes, (v1, i1) => {
      this.interactableElements[v1.id] = v1.getInteractableElements();
    });
    return this.interactableElements;
  };

  //
  // TODO: implement this
  // Maps the mouse distribution to a distribution of queries, 
  // since we know the positions of all interactible DOM elements
  //
  // @mouseDist distribuiton of mouse positions (unimplementd)
  // @return query distribution
  Requester.prototype.mapMouseToQueryDistribution = function(mouseDist, time) {
    // 1. get interactable DOM elements
    var elsMap = this.getInteractableElements();

    // 2. be able to map a DOM element to the query+params that it would
    //    trigger if the user interacts with it
    var magicalGetQueryParams = function(el, viz) {
      return viz.getQueries(el);
    }

    // 3. be able to compute the probability of interacting with a DOM element
    //    super stupid way:
    var markProbability = function(el) {
      var bound = getBoundingBox(el);
      var probs = [];
      let xpw = bound.x + bound.w;
      let xmw = bound.x;
      let yph = bound.y + bound.h;
      let ymh = bound.y;
      let probablity = mouseDist.getArea([
        [xpw, yph], 
        [xmw, yph],
        [xpw, ymh],
        [xmw, ymh]]);
      return probablity;
    };
    let queryDistribution = new Dist.NaiveDistribution(null);
    // 4. use the above to construct a query distribution
    _.each(elsMap, (value, key) => {
      _.each(value, (el) => {
        let queries = magicalGetQueryParams(el, this.vizMap[key]);
        if (queries.length) {
        // add it to a query distribution
          var prob = markProbability(el);
          _.each(queries, query => {
            if (prob > this.minProb) {
              // let key = queryDistribution.keyFunc(query);
              // let probablity = this.scheduler.send(key, prob, time);
              // if (probablity > 0) {
              //   queryDistribution.set(query, probablity);
              // }
              queryDistribution.set(query, prob);
            }
          });
        }
      }); 
    });
    return queryDistribution;
  }


  return Requester;
})(EventEmitter);

module.exports = {
  Requester: Requester
}
