var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


//
// using fetch
var stream_from = function(url, cb) {
  fetch(url).then(function(resp) {
    if (!resp.body) return;
    var reader = resp.body.getReader();
    function loop() {
      return reader.read().then(function(res) {
        if (res.done) return "done!";
        if (cb) cb(res.value);
        var data = res.value;
        counts.push(data.length);
        return loop();
      });
    }
    return loop();
  }).then(function(data) {
    debug();
  });
};

function binarySum(a,b) { return a + b;}

function debug() {
  var cost = Date.now() - start;
  var total = counts.reduce(binarySum, 0)
  var stats = [total/cost/1000 + "mb/s", cost, total];
  console.log(stats.join("\t"))
}

var getMouseDistribution = function() {
  return [];
}

var getQueryDistribution = function(mouseDist, viz) {
  return [
    ["SELECT sum(a) FROM readings", .99],
    ["SELECT a, avg(b) FROM readings GROUP BY a", .01]
  ]
};

var sendDistribution = function() {
  // get distribution
  var dist = getQueryDistribution();
  $.get("/distribution/set", 
        { dist: JSON.stringify(dist) }, 
        function() {
  });
}

var RingBuffer = (function(EventEmitter) {
  //extend(RingBuffer, EventEmitter);

  var bytespermb = 1048576;

  function RingBuffer() {
    this.decoders = {};
    this.buffer = new ArrayBuffer(bytespermb * 10);
    this.uint = new Uint8Array(this.buffer);
    this.whead = 0; // location to write to
    this.rhead = 0;
    this.bufs = [];
    this.size = 0;
  }

  RingBuffer.prototype.write = function(fromBuf) {
    this.bufs.push(fromBuf);
    this.size += fromBuf.byteLength;
    if (this.size > bytespermb * 10) {
       var droppedBuf = this.bufs.shift();
       this.size -= droppedBuf.byteLength;
    }
    return;

    // actually copy to an internal buffer
    if (fromBuf.byteLength > this.buffer.byteLength) {
      throw Error("received buffer larger than client cache size");
    }

    var nBytesLeft = this.buffer.byteLength - this.whead;
    var from1 = fromBuf.slice(0, nBytesLeft);
    this.uint.set(from1, this.whead);
    this.whead += from1.byteLength;

    // wrap around if needed
    if (fromBuf.byteLength > nBytesLeft) {
      var from2 = fromBuf.slice(nBytesLeft);
      this.uint.set(from2, 0);
      this.whead = from2.byteLength;
    }
  };

  // emit start block, startidx
  //      end block, startidx, endidx

   RingBuffer.prototype.register = function(encoderId, decoder) {
     this.decoders[encoderId] = decoder;
   };

  return RingBuffer;
})();



var JSONDecoder = (function(){
  var dec = new TextDecoder("utf-8")

  var JSONDecoder = function() {
  };
   
  JSONDecoder.prototype.decode = function(buf) {
    console.log(buf);
    var txt = dec.decode(new Uint8Array(buf));
    console.log(txt);
    return JSON.parse(txt);
  };
  return JSONDecoder;
})();
