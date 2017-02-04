var proto = require("./table_pb");
var Table = proto.Table;

var TableDecoder = (function() {
  var TableDecoder = function() {};

  TableDecoder.prototype.decode = function(buf) {
    return Table.deserializeBinary(buf);
    return decodeTable(buf);
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
