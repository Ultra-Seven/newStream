var proto = require("./table_pb");
var Table = proto.Table;

var TableDecoder = (function() {
  var TableDecoder = function() {};

  TableDecoder.prototype.decode = function(buf) {
    var pbTable = window.pbTable = Table.deserializeBinary(new Uint8Array(buf));
    var attrs = pbTable.getSchema().getNameList();
    if (attrs.length == 0) return [];

    var colList = pbTable.getColsList();
    if (colList.length == 0) return [];
    var ret = _.map(colList[0].getValList(), function(v) {
      var ret = {}; 
      ret[attrs[0]] = v;
      return ret;
    });
    for (var i = 1; i < colList.length; i++) {
      var col = colList[i].getValList();
      for (var j = 0; j < col.length; j++) {
        ret[j][attrs[i]] = col[j];
      }
    }
    return ret;
  };

  return TableDecoder;
})();




var JSONDecoder = (function(){
  var dec = new TextDecoder("utf-8")

  var JSONDecoder = function() { };
   
  JSONDecoder.prototype.decode = function(buf) {
    var txt = dec.decode(new Uint32Array(buf));
    return JSON.parse(txt);
  };
  return JSONDecoder;
})();



module.exports = {
  TableDecoder: TableDecoder
}
