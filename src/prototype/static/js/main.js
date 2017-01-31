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
    this.listeners = {};
    this.buffer = new ArrayBuffer(bytespermb * 10);
    // We need to copy in terms of 8 bit integers otherwise
    // js will expand each byte into 16/32 bits on copy!
    this.uint = new Uint8Array(this.buffer);
    this.whead = 0; // location to write to
    this.rhead = 0;
    this.bufs = [];
    this.size = 0;
  }

  RingBuffer.prototype.write = function(fromBuf) {
    // this.bufs.push(fromBuf);
    // this.size += fromBuf.byteLength;
    // if (this.size > bytespermb * 10) {
    //    var droppedBuf = this.bufs.shift();
    //    this.size -= droppedBuf.byteLength;
    // }
    // return;

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


    while(1) {
      var tmp = this.readAvailBlock();
      if (tmp == null) break;
      var block = tmp.block,
          enc = tmp.enc;
      this.rhead += tmp.nBytesRead;

      if (enc in this.decoders) {
        var decodedBlock = this.decoders[enc].decode(block);
        this.emit(enc, decodedBlock);
      }
    }

  };

  RingBuffer.prototype.read = function(offset, len, wrap) {
    wrap = wrap || false;
    var eidx = (offset + len) % this.buffer.byteLength;
    if (offset + len > this.buffer.byteLength && !wrap) {
      throw Error();
    }
   
    var ret = new Uint8Array(this.buffer.slice(offset, offset+len));
    if (eidx < offset ) {
      ret = new Uint8Array(new ArrayBuffer(len));
      ret.set(this.buffer.slice(offset));
      ret.set(this.buffer.slice(0, eidx), (len - eidx));
    }

    return ret;
  };

  RingBuffer.prototype.readAvailBlock = function() {
    var buf = new Uint32Array(this.buffer.slice(this.rhead, this.rhead+8));
    var offset = 0; // in terms of 8 bit array
    var enc = buf[0];
    var len = buf[1];
    offset = 8;

    if (this.whead < this.rhead+offset) {
      // is it wrap around or we just don't have enough data?
      // wrap around means: whead = (this.rhead + offset + len) % buflen
      if (this.whead == (this.rhead+offset+len) % this.buffer.byteLength) {
        throw Error("Doesn't handle wrap around atm: " + this.whead + "<" + (this.rhead + offset));
      }
      return null;
    }

    // have we read enough bytes?
    if (len <= this.whead - (this.rhead+offset)) {
      var block = this.read(this.rhead+offset, len, false);
      return {
        enc: enc,
        block: block,
        nBytesRead: offset+len
      }
    } 
    return null;
  }

  // emit start block, startidx
  //      end block, startidx, endidx

   RingBuffer.prototype.register = function(encoderId, decoder) {
     this.decoders[encoderId] = decoder;
   };

   RingBuffer.prototype.on = function(name, cb) {
     this.listeners[name] = this.listeners[name] || [];
     this.listeners[name].push(cb);
   }

   RingBuffer.prototype.emit = function() {
     var name = arguments[0];
     var args = 2 <= arguments.length ? [].slice.call(arguments, 1) : [];
     if (name in this.listeners) {
       this.listeners[name].forEach(function(cb) {
         cb.apply(cb, args);
       });
     }
   }

  return RingBuffer;
})();


var TableDecoder = (function() {
  var dec = new TextDecoder("utf-8")
  var TableDecoder = function() {};

  TableDecoder.prototype.decode = function(buf) {
    var buf = new Uint8Array(buf);
    return decodeTable(buf);
  };

  var decodeTable = function(buf) {
    var tmp = null;
    var i = 0;
    tmp = decodeSchema(buf, i);
    var schema = tmp.data;
    i = tmp.i;

    cols = [];
    schema.forEach(function(col) {
      tmp = decodeCol(buf, i);
      cols.push(tmp.data);
      i = tmp.i;
    });
    return {
      schema: schema,
      cols: cols
    };
  };

  var decodeSchema = function(buf, i) {
    buf = new Uint8Array(buf);
    var schema = [];
    var nattrs = buf[i++];
    for(var n = 0; n < nattrs; n++) {
      slen = buf[i++];
      attr = dec.decode(buf.slice(i, i+slen));
      schema.push(attr);
      i += slen;
    }
    return {
      data: schema,
      i: i
    };
  };

  var decodeCol = function(buf, sidx) {
    var uint32 = new Uint32Array(buf.slice(sidx).buffer);
    var i = 0;
    var nrows = uint32[i++];
    var eidx = i + nrows;
    var col = uint32.slice(i, eidx);
    return {
      data: col,
      i: eidx * 4 + sidx
    };
  }

  return TableDecoder;

})();

var JSONDecoder = (function(){
  var dec = new TextDecoder("utf-8")

  var JSONDecoder = function() {
  };
   
  JSONDecoder.prototype.decode = function(buf) {
    var txt = dec.decode(new Uint32Array(buf));
    console.log(txt);
    return JSON.parse(txt);
  };
  return JSONDecoder;
})();
