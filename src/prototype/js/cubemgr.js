var DataStructure = require("./datastruct").DataStructure;
var Decoders = require("./decoders");
var RangeIndex = require("./rangeidx");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


// Client version of ds.py:CubeDataStructure
var CubeManager = (function(DataStructure) {
  extend(CubeManager, DataStructure);

  var encoding = 1;
  this.encoding = encoding;

  function CubeManager() {
    this.decoder = new Decoders.TableDecoder();
    this.rangeIdx = new RangeIndex.RangeIndex();
    this.textDecoder = new TextDecoder("utf-8");

    // maps <some key that represents a query> to the actual data
    // the key could just be the json encoded parameters
    // or a combination of that and other metadata
    //
    // in this case, the key is:
    //   template.id + ":" + queryToKey()
    this.idx = {};  // key -> data

    DataStructure.call(this);
  };

  // @param block arraybuffer
  CubeManager.prototype.readHeader = function(block) {
    var header = new Uint32Array(block.slice(0, 8));
    var keylen = header[0];
    var id = header[1];
    var serverSideKey = this.textDecoder.decode(block.slice(8, 8+keylen));
    var key = id + ":" + serverSideKey;
    return {
      key: key,
      id: id,
      nBytesRead: 8 + keylen
    }
  };

  // @param range  [startidx, endidx] of block in ringbuffer
  // @param block  ArrayBuffer object
  CubeManager.prototype.addBlock = function(range, block) {
    var header = this.readHeader(block);
    var key = header.key;
    var table = null;
    try {
      table = this.decoder.decode(block.slice(header.nBytesRead));
    } catch (e) {
      console.log(e);
      return;
    }
    var data = {
      key: key,
      block: block,
      table: table
    };
    this.rangeIdx.add(range, data);
    this.idx[key] = data;

    console.log(["cubmgr.emit", key, table])
    this.emit(key, table);
  };

  CubeManager.prototype.dealloc = function(sidx, eidx) {
    var rms = this.rangeIdx.rm([sidx, eidx]);
    for (var i = 0; i < rms.length; i++) {
      delete this.idx[rms[i].key]
    }
  };

  CubeManager.prototype.canAnswer = function(q) {
    return q.template.name == "cubequery";
  };

  CubeManager.prototype.tryExec = function(q, cb) {
    var key = this.queryToKey(q);
    if (key in this.idx) {
      if (cb) cb(this.idx[key].table);
      return this.idx[key].table;
    }

    return null;
  };

  return CubeManager;
})(DataStructure);


module.exports = {
  CubeManager: CubeManager
}
