console.log("good morning")

function sendToServer(data) {
  console.log("send");
  $.ajax({
    type: "POST",
    contentType: "application/json; charset=utf-8",
    url: "https://localhost:5000/mouse",
    data:  JSON.stringify(data),
    success: function (data) {
      console.log("got server resp");
    },
    dataType: "json"
  });
}

function domToBox(el) {
  el = $(el);
  var off = el.offset();
  var name = el.get()[0].tagName;
  var box = [name, off.left, off.top, el.width(), el.height()];
  return box;
}

function isVisible(el) {
  var top_of_element = $(el).offset().top;
  var bottom_of_screen = $(window).scrollTop() + $(window).height();
  return top_of_element < bottom_of_screen;
};



// This ignores many possible elements that are interactable, such as dom elements with event listeners
function getAllInteractableElements() {
  var els = $("select, input, option, span, circle, rect, submit, a, button").get();
  //var boxes = els.filter(isVisible).map(domToBox);
  var boxes = els.map(domToBox);
  console.log(["#boxes", boxes.length]);
  return boxes;
}



var Logger = (function() {
  function Logger(opts) {
    opts = opts || {};
    this.id = opts.id;
    this.loc = opts.loc;
    this.minResolution = opts.minResolution || 10;
    this.reset();
    this.periodicFlush(15);


    // if an SVG element is dynamically added to the page, we want to know about it
    // and add mouse listeners to it
    var me = this;
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) { 
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach(function(el) {
            if (el.nodeName == "svg") {
              me.d3bind(el);
            }
          });
        }
      });
    });
    var config = {subtree: true, childList: true };
    observer.observe(document, config);
  }

  Logger.prototype.reset = function() {
    this.xs = [];
    this.ys = [];
    this.ts = [];
    this.actions = [];
    this.boxes = [];
  }

  Logger.prototype.d3bind = function(el) {
    console.log("d3bind");
    d3.select(el)
      .on("mousemove", this.d3move.bind(this)) 
      .on("mousedown", this.d3down.bind(this)) 
      .on("mouseup", this.d3up.bind(this)) ;
  }

  Logger.prototype.bind = function(el) {
    el.onmousemove = this.onmousemove.bind(this);
    el.onmousedown = this.onmousedown.bind(this);
    el.onmouseup = this.onmouseup.bind(this);
  }


  Logger.prototype.periodicFlush = function(secs) {
    this.flush();
    setTimeout(this.periodicFlush.bind(this, secs), 1000 * secs);
  };

  Logger.prototype.flush = function() {
    if (this.xs.length < 2) return;
    var now = Date.now();
    var data = {
      xs: this.xs,
      ys: this.ys,
      ts: this.ts,
      actions: this.actions,
      //boxes: this.boxes,
      t: now,
      id: this.id,
      type: "mouse"
    };
    sendToServer(data);
    this.reset();
  };

  // log x, y, time, action
  Logger.prototype.pushXYT = function(e, action) {
    var now = Date.now();
    this.ts.push(now);
    this.xs.push(e.pageX);
    this.ys.push(e.pageY);
    this.actions.push(action)
  };

  Logger.prototype.onmousemove = function(e) {
    var now = Date.now();
    if (this.ts.length > 0 && (now - this.ts[this.ts.length-1] ) < this.minResolution) return;
    this.pushXYT(e, "m");
  }
  Logger.prototype.onmousedown = function(e) {
    this.pushXYT(e, "d");
  };
  Logger.prototype.onmouseup = function(e) {
    this.pushXYT(e, "u");
    this.flush();
  }
  Logger.prototype.d3move = function(e) {
    var m = d3.mouse(e);
    this.pushXYT({ pageX: m[0], pageY: m[1]}, "m");
  }
  Logger.prototype.d3down = function(e) {
    var m = d3.mouse(e);
    this.pushXYT({ pageX: m[0], pageY: m[1]}, "d");
  }
  Logger.prototype.d3up = function(e) {
    var m = d3.mouse(e);
    this.pushXYT({ pageX: m[0], pageY: m[1]}, "u");
    this.flush();
  }


  Logger.prototype.onscroll = function() {
  };

  return Logger;
})();

$(function() {
  var loc = window.location.toString();
  var ID = Date.now() + ":" + (Math.random() * 1000).toFixed(0);
  sendToServer({ loc: loc, boxes: getAllInteractableElements(), id: ID, type: "page" });
  var logger = window.logger = new Logger({minResolution: 15, id: ID, loc: loc});
  logger.bind(document);
  document.onscroll = logger.onscroll.bind(logger);
  window.onbeforeunload = logger.flush.bind(logger);

  console.log(d3.selectAll("svg"))
  d3.selectAll("svg").selectAll("g")
    .on("mousemove", function(e) { logger.d3move(this); })
    .on("mousedown", function(e) { logger.d3down(this); })
    .on("mouseup", function(e) { logger.d3up(this); })
});
