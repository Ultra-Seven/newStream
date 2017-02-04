var EventEmitter = require("events");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


// helper function
function qToKey(q) {
  return q.template.id + ":" + JSON.stringify(q.data);
}



// Models a distribution  at a single instant in time.  
// The code doesn't support predicting into the future yet.
//
// A Distribution implements
//
//  set(object, prob) --> set the probability of object
//  get(object)       --> return some probabiity value 
//  getAllAbove(prob) --> [ [ object, probability]* ]
//  toWire()          --> JSON object to send to the server
//
var DistributionBase = (function() {
  function DistributionBase() {};

  // get the probability of some object, or 0 if not found
  DistributionBase.prototype.get = function(o) { return 0; };

  // @prob minimum probability for returned list
  // @return the list of all objects and their probabilities for all
  // objects whose probability is above @param{prob}
  DistributionBase.prototype.getAllAbove = function(prob) { return []; };


  // to a JSON-able representation that we can pass to jquery
  // aka a dictionary
  DistributionBase.prototype.toWire = function() { 
    return this.getAllAbove(0); 
  }

  return DistributionBase;
})();

//
// subclass DistributionBase for specific types of distributions
// The reason for subclasses is that we may want more efficient representations of  to predict mouse 
// positions in a discretized fashion, rather than on a pixel by pixel basis.
// If this is the case, then there may be more efficient representations.
//

var NaiveDistribution = (function(Base) {
  extend(NaiveDistribution, Base);

  NaiveDistribution.from = function(q) {
    var d = new NaiveDistribution();
    d.set(q, 1);
    return d;
  };


  function NaiveDistribution() {
    this.dist = {};
    // call parent constructor 
    Base.call(this);
  }

  NaiveDistribution.prototype.set = function(q, prob) {
    this.dist[qToKey(q)] = [q, prob]; 
  };

  NaiveDistribution.prototype.get = function(q) {
    if (q == null || q === undefined) return 0;
    var key = qToKey(q);
    if (key in this.dist) return this.dist[key][1];
    return 0;
  };

  NaiveDistribution.prototype.getAllAbove = function(prob) {
    prob = prob || 0;
    return _.filter(_.values(this.dist), function(pair) {
      return pair[1] >= prob;
    });
  };

  return NaiveDistribution;
})(DistributionBase);




// The requester runs as an infinite loop to regularly send a query distribution to the backend.  
//
// The sent distribution is defined as a dictionary:
//
//    {
//      dt: [query template id, params, probability]
//    }
//
// where
//
//    dt is thenumber of milliseconds into the future this distribution represents
//    query template id is the ID assigned to the query template object
//    params is a dictionary of query parameter -> value
//    probability is a float between 0 and 1
//
var Requester = (function(EventEmitter) {
  extend(Requester, EventEmitter);

  function Requester(engine, opts) {
    opts = opts || {};
    this.engine = engine;
    this.minInterval = opts.minInterval || 100;

    EventEmitter.call(this);
  };

  // Run the requester forever
  Requester.prototype.run = function() {
    var distribution = this.getQueryDistribution();
    if (distribution != null) 
      this.send(distribution);
    setTimeout(this.run().bind(this), this.minInterval);
  };

  // manually send a distribution to the server
  Requester.prototype.send = function(dist) {
    $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/distribution/set",
      data:  JSON.stringify(dist.toWire()),
      success: function (data) {
        // TODO: could use a debugging statement here
        console.log(data);
      },
      dataType: "json"
    });
  }

  ////////////////////////////////////////////////////////
  //
  //  Everything below is an unimplemented skeleton
  //  for actually generating a real query distribution
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

  //
  // NOT IMPLEMENTED
  // @param dt number of milliseconds into the future
  // @return distribution of mouse positions
  //
  var getMouseDistribution = function(dt) {
    return new Distribution();
  }

  //
  // NOT IMPLEMENTED
  // Maps the mouse distribution to a distribution of queries, 
  // since we know the positions of all interactible DOM elements
  //
  // @mouseDist distribuiton of mouse positions (unimplementd)
  // @return query distribution
  var mapMouseToQueryDistribution = function(mouseDist) {

    // 1. get interactable DOM elements
    var els = $("button, .mark");

    // 2. be able to map a DOM element to the query+params that it would
    //    trigger if the user interacts with it
    var magicalGetQueryParams = function(el) {
      // not implemented
      return null;
    }

    // 3. be able to compute the probability of interacting with a DOM element
    //    super stupid way:
    var markProbability = function(el) {
      var bound = getBoundingBox(el);
      var probs = [];
      for (var dx = 0; dx < bound.w; dx++) {
        for (var dy = 0; dy < bound.w; dy++) {
          probs.push(mouseDist.get([bound.x+dx, bound.y+dy]))
        }
      }
      return d3.mean(probs);
    };

    // 4. use the above to construct a query distribution
    els.each(function(el) {
      var query = magicalGetQueryParams(el);
      // add it to a query distribution
    });

  }

  // @param dt number of milliseconds into the future
  // @return a list of [querytemplateid, params, probability]
  //         that conforms to the Requester wire format
  var getQueryDistribution = function(dt) {
    return null;
  };


  return Requester;
})(EventEmitter);



module.exports = {
  Requester: Requester,
  DistributionBase: DistributionBase,
  NaiveDistribution: NaiveDistribution
}
