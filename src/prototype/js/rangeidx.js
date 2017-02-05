var EventEmitter = require("events");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


// Simple interval index so we can find the blocks of data
// that have been deallocated by the ring buffer
//
// Look ups simply scan the entries..
//
// TODO: make it faster
//
var RangeIndex = (function(EventEmitter) {
  extend(RangeIndex, EventEmitter);

  function RangeIndex() {
    EventEmitter.call(this);

    this.idx = {};
  };

  RangeIndex.prototype.add = function(range, data) {
    this.idx[range+""] = {
      range: range,
      data: data
    };
  }

  RangeIndex.prototype.get = function(range) {
    for (var key in this.idx) {
      var r = this.idx[key].range;
      if (overlaps(range, r)) 
        return this.idx[key].data;
    }
    return null;
  };

  // @param r1: deallocated range
  // @param r2: candidate range to compare against
  var overlaps = function(r1, r2) {
    return ((r1[0] < r2[0] && r2[0] < r1[1]) || 
            (r1[0] < r2[1] && r2[1] < r1[1]))
  }

  RangeIndex.prototype.rm = function(range) {
    var rmkeys = [];
    var nkeys = 0;
    for (var key in this.idx) {
      var r = this.idx[key].range;
      if (overlaps(range, r))
        rmkeys.push(key);
      nkeys ++;
    }

    var rm = [];
    for (var i = 0; i < rmkeys.length; i++) {
      rm.push(this.idx[rmkeys[i]]);
      delete this.idx[rmkeys[i]];
    }
    //console.log("rm " + range.join(", ") + "\t" + nkeys + "\t" + rmkeys.length);
    return rm;
  };

  return RangeIndex;
})(EventEmitter);

module.exports = {
  RangeIndex: RangeIndex
}
