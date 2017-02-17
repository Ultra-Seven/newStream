var DataStructure = require("./datastruct").DataStructure;
var Decoders = require("./decoders");
var RangeIndex = require("./rangeidx");
var Util = require("./util");
var GBQueryTemplate = require("./query").GBQueryTemplate;
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


// Client version of ds.py:GBDataStructure
var GBDataStructure = (function(DataStructure) {
  extend(GBDataStructure, DataStructure);

  var encoding = 1;
  this.encoding = encoding;

  function GBDataStructure() {
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

    this.encoding = encoding;

    this.addBlockTime = 0;
    this.addBlockNum = 0;

    DataStructure.call(this);
  };

  // @param block arraybuffer
  GBDataStructure.prototype.readHeader = function(block) {
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

  // Adds the block to this data structure.
  //
  // Costs
  //  Deserialization and indexing is about 0.05 milliseconds for the average block.
  //  Most of the cost is in this.emit, which does the rendering
  //
  // @param range  [startidx, endidx] of block in ringbuffer
  // @param block  ArrayBuffer object
  GBDataStructure.prototype.addBlock = function(byteRange, block) {
    var now = Date.now();
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
    this.rangeIdx.add(byteRange, data);
    this.idx[key] = data;

    if (Util.DEBUG) {
      this.addBlockTime += (Date.now() - now);
      this.addBlockNum += 1;
      if (this.addBlockNum % 50 == 0) {
        console.log(["addblock", this.addBlockNum, this.addBlockTime / this.addBlockNum]);
        this.addBlockTime = 0;
        this.addBlockNum = 0;
      }
    }

    this.emit(key, table);


  };

  GBDataStructure.prototype.dealloc = function(byteRange) {
    var rms = this.rangeIdx.rm(byteRange);
    for (var i = 0; i < rms.length; i++) {
      delete this.idx[rms[i].data.key]
    }
  };

  GBDataStructure.prototype.canAnswer = function(q) {
    // It's possible that this data structure could answer
    // other types of queries..
    return q.template.name == "gbquery";
  };

  GBDataStructure.prototype.tryExec = function(q, cb) {
    if (!this.canAnswer(q)) 
      return null;
    var key = this.queryToKey(q);
    if (key in this.idx) {
      if (cb) cb(this.idx[key].table);
      return this.idx[key].table;
    }

    return null;
  };

  return GBDataStructure;
})(DataStructure);


module.exports = {
  GBDataStructure: GBDataStructure
}
