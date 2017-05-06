var DataStructure = require("./datastruct").DataStructure;
var GarbageCollectingDataStructure = require("./datastruct").GarbageCollectingDataStructure;
var Decoders = require("./decoders");
var RangeIndex = require("./rangeidx");
var Util = require("./util");
var GBQueryTemplate = require("./query").GBQueryTemplate;
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


// Client version of ds.py:ProgressiveDataStructure
//
// You probably don't want to use exactly the same implementation as the ProgressiveDataStructure because
// you may need to track multiple blocks for the same result
var ProgressiveDataStructure = (function(GarbageCollectingDataStructure) {
  extend(ProgressiveDataStructure, GarbageCollectingDataStructure);

  // this should match the encoding in ds.py:ProgressiveDataStructure
  var encoding = 2;
  this.encoding = encoding;

  function ProgressiveDataStructure() {
    GarbageCollectingDataStructure.call(this);

    this.idx = {};
    this.encoding = encoding;
  };

  // TODO: you probably want to override this with something custom to deal with progressive blocks!
  ProgressiveDataStructure.prototype.readHeader = function(block) {
    return Progressive.prototype.readHeader.call(this, block);
  }

  // TODO: override with your implementation
  // @param bytes: a UInt8Array of a block of data
  //
  // If you used a custom encoding using StringIO/struct, then be careful about the size of the UInt/Float array
  // that you cast the bytes to.  If you cast an 8bit array to a 16bit array, javascript will _pad_
  // each element to be 16bits and potentially mess up your calculations.
  //
  ProgressiveDataStructure.prototype.decode = function(bytes) {
    throw Error("Not Implemented");
  };

  // TODO: store the data (and header?) in your data structure
  ProgressiveDataStructure.prototype.storeData = function(data, header) {
    throw Error("Not Implemented");
  };
  
  // TODO: this should remove the data from your data structure because it has been removed from the ring buffer
  ProgressiveDataStructure.prototype.removeData = function(data) {
    if (data && data.key) {
      throw Error("Not Implemented");
    }
  };

  // This data struture can answer progressive and gbquery templates.
  ProgressiveDataStructure.prototype.canAnswer = function(q) {
    return q.template.name == "progressive" || q.template.name == "gbquery";
  };

  ProgressiveDataStructure.prototype.tryExec = function(q, cb) {
    throw Error("Not Implemented");
  };


  return ProgressiveDataStructure;
})(GarbageCollectingDataStructure);

module.exports = {
  ProgressiveDataStructure: ProgressiveDataStructure
}



