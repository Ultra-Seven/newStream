var EventEmitter = require("events");
var Util = require("./util");
var Dist = require("./dist");
var Logger = require("./logger").Logger;
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
    this.logger = new Logger({
      minResolution: 5,
      traceLength: 150
    });
    this.logger.bind(document);

    // TODO: pass in your mouse predictor!
    this.mousePredictor = opts.mousePredictor;

    this.n = 0;

    EventEmitter.call(this);

    this.run();
  };

  //
  // Run forever:
  //  1. get current mouse trace
  //  2. get query distribution and send to server
  //  3. sleep for minInterval
  //
  Requester.prototype.run = function() {
    if (this.mousePredictor) {
      var trace = this.logger.trace;
      var distribution = this.getQueryDistribution(trace, 100);
      if (distribution != null) 
        this.send(distribution);
    }

    setTimeout(this.run.bind(this), this.minInterval);
  };

  //
  // manually send a distribution to the server
  //
  Requester.prototype.send = function(dist, cb) {
    $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/distribution/set",
      data:  JSON.stringify(dist.toWire()),
      success: function (data) {
        if (Util.DEBUG)
          console.log(["sendDist got response", data])
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
    var mouseDist = this.mousePredictor(trace, dt);
    // TODO: Uncomment below when the function is implemented
    var queryDist = null; // mapMouseToQueryDistribution(mouseDist);
    return queryDist;
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
  var getInteractableElements = function() {
    throw Error("Implement Me");
  };

  //
  // TODO: implement this
  // Maps the mouse distribution to a distribution of queries, 
  // since we know the positions of all interactible DOM elements
  //
  // @mouseDist distribuiton of mouse positions (unimplementd)
  // @return query distribution
  var mapMouseToQueryDistribution = function(mouseDist) {

    // 1. get interactable DOM elements
    var els = getInteractableElements();

    // 2. be able to map a DOM element to the query+params that it would
    //    trigger if the user interacts with it
    var magicalGetQueryParams = function(el) {
      throw Error("Implement Me");
    }

    // 3. be able to compute the probability of interacting with a DOM element
    //    super stupid way:
    var markProbability = function(el) {
      var bound = getBoundingBox(el);
      var probs = [];
      for (var dx = 0; dx < bound.w; dx++) {
        for (var dy = 0; dy < bound.h; dy++) {
          probs.push(mouseDist.get([bound.x+dx, bound.y+dy]))
        }
      }
      return d3.mean(probs);
    };

    // 4. use the above to construct a query distribution
    els.each(function(el) {
      var query = magicalGetQueryParams(el);
      // add it to a query distribution
      throw Error("Implement Me");
    });

  }


  return Requester;
})(EventEmitter);

module.exports = {
  Requester: Requester
}
