var EventEmitter = require("events");

var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


var RangeIndex = (function(EventEmitter) {

  var RangeIndex = function() {
    EventEmitter.call(this);

    this.idx = {};
  };

  RangeIndex.prototype.add = function(range, data) {
    this.idx[range+""] = {
      range: range,
      data: data
    };
    var nkeys = 0;
    for (var key in this.idx) { nkeys++; }

    //console.log("add " + range.join(", ") + "\t" + nkeys);
  }

  RangeIndex.prototype.get = function(range) {
    for (var key in this.idx) {
      var r = this.idx[key].range;
      if (overlaps(range, r)) 
        return this.idx[key].data;
    }
    return null;
  };

  var overlaps = function(r1, r2) {
    //console.log(JSON.stringify([r1, r2]));
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

  RangeIndex.prototype.__proto__ = EventEmitter.prototype;
  return RangeIndex;
})(EventEmitter);

module.exports = {
  RangeIndex: RangeIndex
}
