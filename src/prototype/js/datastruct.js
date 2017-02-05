var EventEmitter = require("events");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


var DataStructure = (function(EventEmitter) {
  extend(DataStructure, EventEmitter);

  function DataStructure() {
    this.registry = {};
    EventEmitter.call(this);
  };

  //
  // if data structure supports this type of query. 
  // For example, data cube data structures may not support arbitrary queries
  //
  // @return true if could answer, false otherwise
  DataStructure.prototype.canAnswer = function(q) {
    return false;
  };



  //
  // if can execute q from data structure's cached content, 
  // then get the result and send it to @param{cb}
  // @return true if could answer, false otherwise
  DataStructure.prototype.tryExec = function(q, cb) {
    if (!this.canAnswer(q)) return false;
    return false;
  };

  DataStructure.prototype.decode = function(sidx, eidx) { };

  DataStructure.prototype.free = function(sidx, eidx) { };

  DataStructure.prototype.queryToKey = function(q) {
    var keys =_.keys(q.data);
    keys.sort();
    var pairs = keys.map(function(k) { return [k, q.data[k]]; });
    return q.template.id + ":" + JSON.stringify(pairs);
  }

  DataStructure.prototype.register = function(q, cb) {
    console.log(["register ", q.template.id, this.queryToKey(q), q])
    return this.on(this.queryToKey(q), cb);
  }

  DataStructure.prototype.deregister = function(q, cb) {
    return this.removeListener(this.queryToKey(q), cb);
  };

  return DataStructure;
})(EventEmitter);

module.exports = {
  DataStructure: DataStructure
};

 
