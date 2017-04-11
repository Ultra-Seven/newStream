var RangeIndex = require("./rangeidx");
var EventEmitter = require("events");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


//
// These are the JS versions of the data structures defined in py/ds.py
// This is the base class
//
var DataStructure = (function(EventEmitter) {
  extend(DataStructure, EventEmitter);

  function DataStructure() {
    this.registry = {};
    EventEmitter.call(this);
    this.setMaxListeners(20);
  };

  // if data structure supports this type of query. 
  // For example, data cube data structures may not support arbitrary queries
  //
  // @return true if could answer, false otherwise
  DataStructure.prototype.canAnswer = function(q) {
    return false;
  };


  // if can execute q from data structure's cached content, 
  // then get the result and send it to @param{cb}
  //
  // @return true if could answer, false otherwise
  DataStructure.prototype.tryExec = function(q, cb) {
    if (!this.canAnswer(q)) return false;
    return false;
  };

  // @param byteRange in memory byte range of the block
  // @param block ArrayBuffer that is decodable by this data structure (based on matching encoding ids)
  DataStructure.prototype.addBlock = function(byteRange, block) { };

  // @param byteRange notification that a byte range in the ring buffer has been deallocated
  DataStructure.prototype.dealloc = function(byteRange) { };

  // Client version of server-side data struture's key() method (py/ds.py:key())
  // The output, given a query, must match the server side's output exactly
  //
  // @param q instance of js/query.js:Query
  DataStructure.prototype.queryToKey = function(q) {
    var keys =_.keys(q.data);
    keys.sort();
    var pairs = keys.map(function(k) { return [k, q.data[k]]; });
    return q.template.id + ":" + JSON.stringify(pairs);
  }

  // Register a consumer's interest in a query 
  //
  // @param q instance of js/query.js:Query
  // @param cb callback when q's results are available
  DataStructure.prototype.register = function(q, cb) {
    if (Util.DEBUG)
      console.log(["register ", q.template.id, this.queryToKey(q), q])
    return this.on(this.queryToKey(q), cb);
  }

  // remove a consumer's interest in a query 
  DataStructure.prototype.deregister = function(q, cb) {
    return this.removeListener(this.queryToKey(q), cb);
  };

  return DataStructure;
})(EventEmitter);




//
//
// This is a convenience client data structure that tracks the ranges in the ring buffer for each block that it 
// successfully decodes, and automatically reclaims those objects when those byte ranges are overwritten 
// in the ring buffer.
//
// The GBDataStructure uses this class to cache precomputed group-by results that are encoded as protocol buffers
//
//
var GarbageCollectingDataStructure = (function(DataStructure) {
  extend(GarbageCollectingDataStructure, DataStructure);

  function GarbageCollectingDataStructure() {
    this.rangeIdx = new RangeIndex.RangeIndex();
    this.textDecoder = new TextDecoder("utf-8");

    // TODO: override this to match the python encoding number in py/ds.py
    this.encoding = null;


    this.addBlockTime = 0;
    this.addBlockNum = 0;


    DataStructure.call(this);
  }


  // @param block arraybuffer
  GarbageCollectingDataStructure.prototype.readHeader = function(block) {
    var header = new Uint32Array(block.slice(0, 8));
    var keylen = header[0];
    var id = header[1];
    var serverSideKey = this.textDecoder.decode(block.slice(8, 8+keylen));
    var key = id + ":" + serverSideKey;
    return {
      key: key,
      id: id,
      serverSideKey: serverSideKey,
      nBytesRead: 8 + keylen
    }
  };

  // TODO: Override me!
  GarbageCollectingDataStructure.prototype.decode = function(bytes) {
    throw Error("Not Implemented");
  };

  // TODO: Override me!
  GarbageCollectingDataStructure.prototype.storeData = function(data, header) {
    throw Error("Not Implemented");
  }

  // TODO: Override me!
  GarbageCollectingDataStructure.prototype.removeData = function(data) {
    throw Error("Not Implemented");
  }

  GarbageCollectingDataStructure.prototype.canAnswer = function(q) {
    throw Error("Not Implemented");
  };



  // Adds the block to this data structure.
  //
  // Costs
  //  Deserialization and indexing is about 0.05 milliseconds for the average block.
  //  Most of the cost is in this.emit, which does the rendering
  //
  // @param range  [startidx, endidx] of block in ringbuffer
  // @param block  ArrayBuffer object
  GarbageCollectingDataStructure.prototype.addBlock = function(byteRange, block) {
    var now = Date.now();
    var header = this.readHeader(block);
    var key = header.key;
    var decodedData = this.decode(block.slice(header.nBytesRead));

    if (decodedData == null) return;

    var data = {
      key: key,
      block: block,
      table: decodedData
    };
    this.rangeIdx.add(byteRange, data);

    this.storeData(data, header);


    if (Util.DEBUG) {
      this.addBlockTime += (Date.now() - now);
      this.addBlockNum += 1;
      if (this.addBlockNum % 50 == 0) {
        console.log(["addblock", this.addBlockNum, this.addBlockTime / this.addBlockNum]);
        this.addBlockTime = 0;
        this.addBlockNum = 0;
      }
    }

    // Let the world know you have data
    this.emit(key, decodedData);

  };

  GarbageCollectingDataStructure.prototype.dealloc = function(byteRange) {
    var rms = this.rangeIdx.rm(byteRange);
    for (var i = 0; i < rms.length; i++) {
      this.removeData(rms[i].data);
    }
  };

  GarbageCollectingDataStructure.prototype.tryExec = function(q, cb) {
    if (!this.canAnswer(q)) 
      return null;
    return null;
  };
  return GarbageCollectingDataStructure;

})(DataStructure);


module.exports = {
  DataStructure: DataStructure,
  GarbageCollectingDataStructure: GarbageCollectingDataStructure
};

 
