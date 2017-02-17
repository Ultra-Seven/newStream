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

module.exports = {
  DataStructure: DataStructure
};

 
