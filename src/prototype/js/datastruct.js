
var DataStructure = (function() {

  function DataStructure() {
  };

  //
  // if data structure supports this type of query. 
  // For example, data cube data structures may not support arbitrary queries
  //
  // @return true if could answer, false otherwise
  DataStructure.prototype.canAnswer = function(q, cb) {
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

  return DataStructure;
})();

module.exports = {
  DataStructure: DataStructure
};

 
