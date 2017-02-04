var DataStructure = require("./datastruct").DataStructure;
var Decoders = require("./decoders");
var RangeIndex = require("./rangeidx");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


var CubeManager = (function(DataStructure) {
  extend(CubeManager, DataStructure);

  var encoding = 0;
  this.encoding = encoding;

  function CubeManager() {
    this.decoder = new Decoders.TableDecoder();
    this.rangeIdx = new RangeIndex.RangeIndex();

    DataStructure.call(this);
  };

  CubeManager.prototype.addBlock = function(range, block) {
    var table = this.decoder.decode(block);
    var data = {
      block: block,
      table: table
    };
    this.rangeIdx.add(range, data);
  };

  CubeManager.prototype.dealloc = function(sidx, eidx) {
    this.rangeIdx.rm([sidx, eidx]);
  }

  CubeManager.prototype.tryExec = function(q) {
  }

  return CubeManager;
})(DataStructure);


module.exports = {
  CubeManager: CubeManager
}
