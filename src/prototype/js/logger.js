var Logger = (function() {
  function Logger(opts) {
    opts = opts || {};
    this.minResolution = opts.minResolution || 10;
    this.traceLength = opts.traceLength || 20;

    this.trace = [];
  }


  // log x, y, time, action
  Logger.prototype.pushXYT = function(e, action) {
    var now = Date.now();
    this.addPoint([e.pageX, e.pageY, now, action]);
    console.log([e.pageX, e.pageY, now, action])
    while (this.trace.length > 1 &&
           _.last(this.trace)[2] - this.trace[0][2] > this.traceLength) {
      this.trace.shift();
    }
  };

  function _calcDist(x1, y1, x2, y2) {
      return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
  }


  /**
   * Add a point to current trace and interpolate so that we have uniform samples
   *
   * @api private
   * @method _addPoint
   */
  Logger.prototype.addPoint = function(point) {
    var trace = this.trace;
    if (trace.length == 0) {
      trace.push(point);
      return;
    }

    var first = trace[0],
        last = trace[trace.length-1];

    // truncate trace if we detect something crazy
    if (trace.length > 0) {
        var dist0 = _calcDist(first[0], first[1], last[0], last[1]);
        var dist1 = _calcDist(first[0], first[1], point[0], point[1]);
        if (dist0 > dist1) {
            trace = [last];
        }
    }

    if (point[2] == last[2]) return;
    var l = trace.length;
    var timeDiff = point[2] - last[2], 
        rate = this.minResolution / timeDiff,
        x = last[0], 
        y = last[1];

    while (timeDiff >= this.minResolution) {
        trace.push([
            trace[l-1][0] + rate * (point[0] - x),
            trace[l-1][1] + rate * (point[1] - y),
            trace[l-1][2] + this.minResolution
        ]);
        timeDiff -= this.minResolution;
        l++;
    }

    return trace;
  }



  Logger.prototype.onmousemove = function(e) {
    var now = Date.now();
    if (this.trace.length > 0) {
      if (now - _.last(this.trace)[2] < this.minResolution) 
        return;
    }
    this.pushXYT(e, "m");
  }
  Logger.prototype.onmousedown = function(e) {
    this.pushXYT(e, "d");
  };
  Logger.prototype.onmouseup = function(e) {
    this.pushXYT(e, "u");
  }
  Logger.prototype.bind = function(el) {
    el.onmousemove = this.onmousemove.bind(this);
    el.onmousedown = this.onmousedown.bind(this);
    el.onmouseup = this.onmouseup.bind(this);
  }

  return Logger;
})();


module.exports = {
  Logger: Logger
}
