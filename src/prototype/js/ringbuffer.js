var EventEmitter = require("events");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


var Head = (function() {
  function Head(buflen, pos, iter) {
    this.buflen = buflen;
    this.pos = pos || 0;    // position in array
    this.iter = iter || 0;  // # times looped array
  }
  Head.prototype.move = function(len) {
    if (this.pos + len >= this.buflen) {
      this.iter += 1;
    }
    this.pos = (this.pos + len) % this.buflen;
  }
  Head.prototype.moveNew = function(len) {
    var buflen = this.buflen,
        pos = this.pos,
        iter = this.iter;
    if (pos + len >= buflen) 
      iter += 1;
    pos = (pos + len) % buflen;
    return new Head(buflen, pos, iter);
  }
  Head.prototype.isLarger = function(o) {
    return (this.iter > o.iter) || (this.pos > o.pos && this.iter == o.iter);
  }
  // number of bytes this can write before overtaking o
  Head.prototype.bytesCanWrite = function(o) {
    if (this.iter == o.iter) {
      if (this.pos >= o.pos) 
        return (this.buflen - this.pos) + o.pos;
    }
    if (this.iter == o.iter + 1) {
      if (o.pos >= this.pos)
        return o.pos - this.pos;
    }
    return null;
  }
  Head.prototype.toString = function() {
    return [this.pos, ":", this.iter].join("")
  };
  return Head;
})();


//
// The ring buffer is a single block of memory represented as an arraybuffer
// We use two pointers --- a read head and a write head --- to keep track of what has
// been read and written.
//
// Data structures can register to be informed of blocks of bytes that are relevant to them.
//
// TODO: use WebWorker?
//
var RingBuffer = (function(EventEmitter) {
  extend(RingBuffer, EventEmitter);

  var bytespermb = 1048576;

  function RingBuffer(sizeInMB) {
    this.decoders = {};
    this.listeners = {};
    this.buflen = Math.floor(bytespermb * sizeInMB);
    this.buffer = new ArrayBuffer(this.buflen);

    // We need to copy in terms of 8 bit integers otherwise
    // js will expand each byte into 16/32 bits on copy!
    this.uint = new Uint8Array(this.buffer);
    this.whead = new Head(this.buflen);
    this.rhead = new Head(this.buflen);
    this.bufs = [];
    this.size = 0;

    EventEmitter.call(this);
  }

  //
  // write to the ring buffer.  
  //
  RingBuffer.prototype.write = function(fromBuf) {
    this.readAvailBlocks()

    // figure out maximum number of bytes we can write before overtaking
    // the read head pointer.
    var toWrite = this.whead.bytesCanWrite(this.rhead);
    if (toWrite == null || toWrite == 0) {
      throw Error("There's no way to write to the ring buffer without the write pointer overtaking the read pointer")
    }
    // we can continuously write to the read head, the end of the buffer, or the size of fromBuf
    toWrite = Math.min(toWrite, this.buflen - this.whead.pos, fromBuf.byteLength);
    var from = fromBuf.slice(0, toWrite);
    this.uint.set(from, this.whead.pos);

    // since we are overwriting these bytes, make sure any data structures
    // dependent on those bytes know
    this.emit("dealloc", this.whead.pos, this.whead.moveNew(toWrite).pos);

    this.whead.move(toWrite);

    // if we didn't get to write everything in the fromBuf, try to write the rest
    if (toWrite < fromBuf.byteLength) 
      this.write(fromBuf.slice(toWrite));

    this.readAvailBlocks();
  }

  // Keeps reading blocks of the buffer and incrementing the read head if the data is available
  RingBuffer.prototype.readAvailBlocks = function() {
    while(1) {
      var tmp = this.readAvailBlock();
      if (tmp == null) break;
      var block = tmp.block,
          enc = tmp.enc,
          byteRange = tmp.byteRange;
      this.rhead.move(tmp.nBytesRead);

      if (enc in this.decoders) {
        this.emit("block", byteRange[0], byteRange[1], enc);
        this.decoders[enc].addBlock(byteRange, block.buffer);
      }
    }
  };

  // Helper function that blindly reads @param{len} bytes.
  // @param wrap set to false to throw error if requires wrapping around the buffer
  // @return a 8-bit unsigned integer array (Uint8Array)
  RingBuffer.prototype.read = function(offset, len, wrap) {
    wrap = wrap || false;
    var eidx = (offset + len) % this.buflen
    if (offset + len > this.buflen && !wrap) {
      throw Error();
    }
   
    var ret = this.uint.slice(offset, offset+len);
    if (eidx < offset ) {
      ret = new Uint8Array(new ArrayBuffer(len));
      ret.set(this.uint.slice(offset), 0);
      ret.set(this.uint.slice(0, eidx), (len - eidx));
    }

    return ret;
  };

  RingBuffer.prototype.allowedToRead = function(len, rhead) {
    rhead = rhead || this.rhead;
    return !rhead.moveNew(len).isLarger(this.whead);
  };

  // try to read the next contigious block of data.  Block header contains two
  // 32 bit integers representing the length of the body of the block followed by 
  // the encoding of the data structure.  
  //
  //      block format: [len] [enc] [.....len bytes......]
  //
  RingBuffer.prototype.readAvailBlock = function() {
    if (!this.allowedToRead(8)) {
        return null;
    }
    var buf = new Uint32Array(this.read(this.rhead.pos, 8, true).buffer); 
    var len = buf[0];
    var enc = buf[1];
    var offset = 8; // in terms of 8 bit array
    var curRhead = this.rhead.moveNew(8);

    if (!this.allowedToRead(len+offset)) {
      //console.log(["can't read: ", curRhead.pos, len, this.whead.pos]);
      return null;
    }

    //console.log(["reading: ", curRhead.toString(), len, enc])
    
    // if (enc is not recognized) throw Error

    return {
      enc: enc,
      block: this.read(curRhead.pos, len, true),
      byteRange: [this.rhead.pos, this.rhead.moveNew(offset+len).pos],
      nBytesRead: offset+len
    }
  }

  // use this to register a new decoder
  RingBuffer.prototype.register = function(encoderId, decoder) {
    this.decoders[encoderId] = decoder;
  };

  return RingBuffer;
})(EventEmitter);



module.exports = {
  RingBuffer: RingBuffer
}
