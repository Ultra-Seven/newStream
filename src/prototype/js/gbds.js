var DataStructure = require("./datastruct").DataStructure;
var GarbageCollectingDataStructure = require("./datastruct").GarbageCollectingDataStructure;
var Decoders = require("./decoders");
var Util = require("./util");
var GBQueryTemplate = require("./query").GBQueryTemplate;
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;



// Client version of ds.py:GBDataStructure
var GBDataStructure = (function(GarbageCollectingDataStructure) {
  extend(GBDataStructure, GarbageCollectingDataStructure);

  // this should match the encoding in ds.py:GBDataStructure
  var encoding = 1;
  this.encoding = encoding;

  function GBDataStructure() {
    GarbageCollectingDataStructure.call(this);

    this.decoder = new Decoders.TableDecoder();

    // maps <some key that represents a query> to the actual data
    // the key could just be the json encoded parameters
    // or a combination of that and other metadata
    //
    // in this case, the key is:
    //   template.id + ":" + queryToKey()
    this.idx = {};  // key -> data

    this.encoding = encoding;
  };

  GBDataStructure.prototype.decode = function(bytes) {
    return this.decoder.decode(bytes);
  };

  GBDataStructure.prototype.storeData = function(data, header) {
    this.idx[data.key] = data;
  };
  
  GBDataStructure.prototype.removeData = function(data) {
    if (data && data.key && this.idx[data.key]) {
      console.log("removeData:", data.key);
      delete this.idx[data.key];
    }
  };

  GBDataStructure.prototype.canAnswer = function(q) {
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
})(GarbageCollectingDataStructure);




module.exports = {
  GBDataStructure: GBDataStructure
}
