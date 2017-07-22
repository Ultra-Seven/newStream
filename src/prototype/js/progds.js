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
    this.decoder = new Decoders.ProgressiveTableDecoder();
    this.idx = {};
    this.encoding = encoding;
    this.listenerList = {};
    this.releaseList = {};
  };

  // TODO: you probably want to override this with something custom to deal with progressive blocks!
  ProgressiveDataStructure.prototype.readHeader = function(block) {
    return GarbageCollectingDataStructure.prototype.readHeader.call(this, block);
  }

  // TODO: override with your implementation
  // @param bytes: a UInt8Array of a block of data
  //
  // If you used a custom encoding using StringIO/struct, then be careful about the size of the UInt/Float array
  // that you cast the bytes to.  If you cast an 8bit array to a 16bit array, javascript will _pad_
  // each element to be 16bits and potentially mess up your calculations.
  //

  ProgressiveDataStructure.prototype.register = function(q, cb) {
    if (Util.DEBUG)
      console.log(["register ", q.template.id, this.queryToKey(q), q])
    for (k in this.listenerList) {
      this.removeListener(k, this.listenerList[k])
      delete this.listenerList[k]
    }
    this.listenerList[this.queryToKey(q)] = cb;
    return this.on(this.queryToKey(q), cb);
  }

  ProgressiveDataStructure.prototype.deregister = function(q, cb) {
  
  }

  ProgressiveDataStructure.prototype.decode = function(bytes) {
    return this.decoder.decode(bytes);
  };

  // TODO: store the data (and header?) in your data structure
  ProgressiveDataStructure.prototype.storeData = function(data, header) {
    throw Error("Not Implemented");
  };

  ProgressiveDataStructure.prototype.addBlock = function(byteRange, block) {
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
    var ret = this.reconstruct(this.idx[key]);
    if (ret == undefined) {
      return;
    }
    this.emit(key, this, ret);

    // deregister if all data has been received
    if (this.isDataCompleted(this.idx[key])) {
      if (this.listenerList[key])
        this.removeListener(key, this.listenerList[key]);
      delete this.listenerList[key];
      delete this.releaseList[key];
      if (window.DEBUG) {
        console.log('removed listener for ' + key)
      }
    }
  }
  
  // TODO: this should remove the data from your data structure because it has been removed from the ring buffer
  ProgressiveDataStructure.prototype.removeData = function(data) {
    if (data && data.key) {
      var obj = this.idx[data.key];
      if (obj) {
        if (this.isDataCompleted(obj)) {
          delete this.idx[data.key];
        } else {
          this.releaseList[data.key] = true;
        }
      }
    }
  };

  // This data struture can answer progressive and gbquery templates.
  ProgressiveDataStructure.prototype.canAnswer = function(q) {
    return q.template.name == "progressive" || q.template.name == "gbquery";
  };

  ProgressiveDataStructure.prototype.tryExec = function(q, cb) {
    if (!this.canAnswer(q)) {
      return null;
    }
    var key = this.queryToKey(q);
    if (key in this.idx) {
      var table = this.reconstruct(this.idx[key]);
      if (cb) cb(table);
      return table;
    }
    return null;
  };

  ProgressiveDataStructure.prototype.isDataCompleted = function(obj) {
    throw Error("Not Implemented");
  }

  ProgressiveDataStructure.prototype.reconstruct = function(obj) {
    throw Error("Not Implemented");
  }

  return ProgressiveDataStructure;
})(GarbageCollectingDataStructure);

var SampleProgDataStructure = (function(ProgressiveDataStructure) {
  extend(SampleProgDataStructure, ProgressiveDataStructure);

  var encoding = 3;
  this.encoding = encoding;

  function SampleProgDataStructure() {
    ProgressiveDataStructure.call(this);
    this.encoding = encoding;
  }

  SampleProgDataStructure.prototype.storeData = function(data, header) {
    var key = data.key;
    var id = data.table.id;
    var l = data.table.higher - data.table.lower + 1;
    if (this.idx[key] == undefined) {
      this.idx[key] = {};
      // init this.idx[key]
      this.idx[key]['key'] = key;
      this.idx[key]['lower'] = data.table.lower;
      this.idx[key]['higher'] = data.table.higher;
      this.idx[key]['attrs'] = data.table.attrs;
      this.idx[key]['step'] = Math.round(l / data.table.encodedData.length);
      this.idx[key]['data'] = [];
    }
    var step = this.idx[key]['step'];

    for (var i = 0; i*step + id < l; i++) {
      this.idx[key]['data'][i*step+id] = data.table.encodedData[i];
    }

    if (window.DEBUG)
      console.log("storing " + key + ":" + id + " --- "+ data.table.encodedData);

  };

  SampleProgDataStructure.prototype.isDataCompleted = function(obj) {
    for (var i = 0; i < obj.step; i++) {
      if (obj[i] == null) {
        return false;
      }
    }
    return true;
  }

  SampleProgDataStructure.prototype.reconstruct = function(obj) {
    function zeroSampling(arr, len) {
      var result = arr.slice(0);
      for (var i = 0; i < len; i++) {
        if (result[i] == null) {
          result[i] = 0;
        }
      }
      return result;
    }

    var higher = obj.higher;
    var lower = obj.lower;
    var attrs = obj.attrs;

    arr = zeroSampling(obj.data, higher - lower + 1);

    var ret = []
    for (var i = lower; i <= higher; i++) {
      var o = {};
      o[attrs[0]] = arr[i-lower];
      o[attrs[1]] = i;
      ret.push(o)
    }
    return ret;
  }

  return SampleProgDataStructure;
})(ProgressiveDataStructure);

// TODO: complete wavelet encoding
// var WaveletProgDataStructure = function(ProgressiveDataStructure) {
//   extend(WaveletProgDataStructure, ProgressiveDataStructure);

//   var encoding = 4;
//   this.encoding = encoding;

//   function SampleProgDataStructure() {
//     ProgressiveDataStructure.call(this);
//     this.encoding = encoding;
//   }

//   return SampleProgDataStructure;
// }(ProgressiveDataStructure);

module.exports = {
  // ProgressiveDataStructure: ProgressiveDataStructure
  SampleProgDataStructure: SampleProgDataStructure
}



