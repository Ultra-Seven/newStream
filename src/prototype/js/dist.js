var EventEmitter = require("events");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


//
// an internal helper function so that queries can be keyed in a dictionary
// nothing to do with datastructres' key functions.
//
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
//
// subclass DistributionBase for specific types of distributions
// The reason for subclasses is that we may want more efficient representations of  to predict mouse 
// positions in a discretized fashion, rather than on a pixel by pixel basis.
// If this is the case, then there may be more efficient representations.
//

var DistributionBase = (function() {
  function DistributionBase() {};

  // get the probability of some object, or 0 if not found
  DistributionBase.prototype.get = function(o) { 
    return 0;
  };

  // @prob minimum probability for returned list
  // @return the list of all objects and their probabilities for all
  // objects whose probability is above @param{prob}
  DistributionBase.prototype.getAllAbove = function(prob) { 
    return []; 
  };

  // @k  the maximum number of objects to return
  // @return the top k objects by probability
  DistributionBase.prototype.getTopK = function(k) { 
    return []; 
  };

  // to a JSON-able representation that we can pass to jquery
  // aka a dictionary
  DistributionBase.prototype.toWire = function() { 
    var pairs = this.getAllAbove(0);
    for (var i = 0; i < pairs.length; i++) {
      pairs[i][0] = pairs[i][0].toWire();
    }
    return pairs;
  }

  return DistributionBase;
})();



//
// Simplest distribution object
//
var NaiveDistribution = (function(Base) {
  extend(NaiveDistribution, Base);

  NaiveDistribution.from = function(q, keyFunc) {
    var d = new NaiveDistribution(keyFunc);
    d.set(q, 1);
    return d;
  };


  // @keyFunc is a function that takes a "query" as input and returns a string used as a key in the hash table
  //          by default it will use qToKey defined at the top of this file, but you can define your own
  function NaiveDistribution(keyFunc) {
    this.keyFunc = keyFunc || qToKey;
    this.dist = {};
    // call parent constructor 
    Base.call(this);
  }

  NaiveDistribution.prototype.set = function(q, prob) {
    this.dist[this.keyFunc(q)] = [q, prob]; 
  };

  NaiveDistribution.prototype.get = function(q) {
    if (q == null || q === undefined) return 0;
    var key = this.keyFunc(q);
    if (key in this.dist) return this.dist[key][1];
    return 0;
  };

  NaiveDistribution.prototype.getAllAbove = function(prob) {
    prob = prob || 0;
    return _.filter(_.values(this.dist), function(pair) {
      return pair[1] >= prob;
    });
  };

  NaiveDistribution.prototype.getTopK = function(k) {
    return _.rest(_.sortBy(_.values(this.dist), 
                           function(pair) { return pair[1]; }),
                  -k);
  };


  return NaiveDistribution;
})(DistributionBase);


var GuassianDistribution = (function(Base) {
  extend(GuassianDistribution, Base);

  GuassianDistribution.from = function(q, keyFunc) {
    var d = new GuassianDistribution(keyFunc);
    d.set(q, 1);
    return d;
  };

  function GuassianDistribution(keyFunc, gaussianX, gaussianY) {
    this.keyFunc = keyFunc || qToKey;
    this.dist = {};
    this.gaussianX = gaussianX;
    this.gaussianY = gaussianY;
    // call parent constructor 
    Base.call(this);
  }

  GuassianDistribution.prototype.set = function(q, prob) {
    this.dist[this.keyFunc(q)] = [q, prob]; 
  };

  GuassianDistribution.prototype.get = function(q) {
    if (q == null || q === undefined) return 0;
    var key = this.keyFunc(q);
    if (key in this.dist) return this.dist[key][1];
    return 0;
  };
  GuassianDistribution.prototype.getArea = function(qs) {
    if (qs == null || qs === undefined) return 0;
    let topright = this.gaussianX.cdf(qs[0][0]) * this.gaussianY.cdf(qs[0][1]);
    let topleft = this.gaussianX.cdf(qs[1][0]) * this.gaussianY.cdf(qs[1][1]);
    let bottomright = this.gaussianX.cdf(qs[2][0]) * this.gaussianY.cdf(qs[2][1]);
    let = bottomleft = this.gaussianX.cdf(qs[3][0]) * this.gaussianY.cdf(qs[3][1]);

    return (topright - topleft - bottomright + bottomleft);
  };
  GuassianDistribution.prototype.getAllAbove = function(prob) {
    prob = prob || 0;
    return _.filter(_.values(this.dist), function(pair) {
      return pair[1] >= prob;
    });
  };

  GuassianDistribution.prototype.getTopK = function(k) {
    return _.rest(_.sortBy(_.values(this.dist), 
                           function(pair) { return pair[1]; }),
                  -k);
  };


  return GuassianDistribution;
})(DistributionBase);






module.exports = {
  DistributionBase: DistributionBase,
  NaiveDistribution: NaiveDistribution,
  GuassianDistribution: GuassianDistribution
}
