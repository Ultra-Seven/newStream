var EventEmitter = require("events");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


//
// Simple visualization model.  
// All it does is map a list of rows (js objects) to marks in an SVG element.
// 
//
var Viz = (function(EventEmitter) {
  extend(Viz, EventEmitter);

  function Viz(engine, qtemplate, opts) {  
    this.qtemplate = qtemplate;
    this.engine = engine;
    this.start = {};
    this.end = {};
    this.id = opts.id || ""
    this.groupname = opts.groupname || "marker-select"
    this.chart = null;
    this.zoom = opts["zoom"] || 7;
    this.data = opts["data"] || [];
    this.state = opts["state"]
    this.map = null;
    this.centerLat = 38.889931;
    this.centerLon = -77.009003;
    this.currentState = "";
    this.mouseDown = false;
    return this;
  };


  // Resize and create the plot background 
  Viz.prototype.setup = function() {
    // this.addButtons();
    this.render(this.data);
    this.addSlider();
    return this;
  }
  Viz.prototype.send = function(state, template) {
    var q = new Query.Query(template, {State: state});
    const id = this.id;
    if (Util.DETAIL) 
      console.log("REQUEST:for vis:" + id, "send query:" + q.toSQL());
    if (Util.HITRATIO) {
      Util.Debug.hitRatios();
      Util.Debug.addQuery();
    }
    engine.registerQuery(q, this.render.bind(this), id);
  }
  // data attributes are directly mapped to mark attributes
  // except for x, and y which will be transformed using this.x/yscale
  Viz.prototype.addButtons = function() {
    _.each(this.state, st => {
      let button = $("<button id=" + st + " class='interactable'>" + st + "</button>");
      button.on("click", e => {
        //do something...
        this.send(st, this.qtemplate[0]);
      });
      // button.on("mousemove", e => {
      //   //do something...
      //   var q = new Query.Query(this.qtemplate[1], {State: st});
      //   const id = this.id;
      //   let cb = function(data) {
      //     const location = data[0];
      //     if (location.x && location.y) {
      //       $("#latitude").html(location.x);
      //       $("#longitude").html(location.y);
      //     }
      //   }
      //   engine.registerQuery(q, cb, id);
      // })
      $('#buttons').after(button);
    });
    // $(".interactable").css("margin", "10px 10px 10px 10px");
  }

  Viz.prototype.addSlider = function() {
  	let slider = `
        <div><input type="range" id="slideRange" value="0" min="0" max="` + (this.state.length - 1) + `" step="1"><span id="name">city</span>: <span id="latitude">0</span>
        <span>,</span><span id="longitude">0</span></div>`;
  	$('#slider').after(slider);
    $('#slideRange').css("width", "500px");
  	$('#slideRange').on("mousemove", e => {
  		const slider = $('#slideRange');
      const width = slider.width();
      const offset = slider.offset();
      const value = Math.round(((e.pageX - offset.left) / width) * (this.state.length - 0)) - 1;
      const that = this;
      if (this.state[value] !== this.currentState) {
        this.currentState = this.state[value];
        var q = new Query.Query(this.qtemplate[1], {State: this.currentState});
        const id = this.id;
        let cb = function(data) {
          const location = data[0];
          if (location && location.x && location.y) {
            $("#latitude").html(location.x);
            $("#longitude").html(location.y);
            $("#name").html(that.currentState);

          }
        }
        engine.registerQuery(q, cb, id);
      }
  	});
    // $('#slideRange').on("mousedown", (e) => {
    //   console.log("mouse down");
    //   this.mouseDown = true;
    // });
    // $('#slideRange').on("mouseup", (e) => {
    //   console.log("mouse up");
    //   const slider = $('#slideRange');
    //   const width = slider.width();
    //   const offset = slider.offset();
    //   const value = Math.round(((e.pageX - offset.left) / width) * (this.state.length)) + 0;
    //   this.mouseDown = false;
    //   if (this.state[value] !== this.currentState) {
    //     this.currentState = this.state[value];
    //     this.send(this.currentState, this.qtemplate[0]);
    //   }
    // });
  	$('#slideRange').on("change", () => {
      const value = $('#slideRange').val();
      this.send(this.state[parseInt(value)], this.qtemplate[0])
  	});
  }

  Viz.prototype.render = function(data) {
    if (data.length) {
      this.centerLat = _.reduce(data, function(memo, num) {
        return memo + num.x;
      }, 0) / (data.length === 0 ? 1 : data.length);
      this.centerLon = _.reduce(data, function(memo, num) {
          return memo + num.y;
      }, 0) / (data.length === 0 ? 1 : data.length);
    }


    if (this.map) {
      this.map.off();
      this.map.remove();
    }
    this.xf = crossfilter(data);
    this.facilities = this.xf.dimension(function(d) {return [d.x, d.y];});
    this.facilitiesGroup = this.facilities.group().reduceCount();
    this.chart = this.chart || dc.leafletMarkerChart("#simpleViz .map", this.groupname);
    this.chart = this.chart
        .dimension(this.facilities)
        .group(this.facilitiesGroup)
        .width(600)
        .height(400)
        .center([this.centerLat, this.centerLon])
        .zoom(this.zoom)
        .cluster(true)
        .renderPopup(true)
        .popup(function(d,feature) {
          return "TODO"
        });
    dc.renderAll(this.groupname);
    let mymap = this.chart.map();
    this.map = mymap;
  }

  Viz.prototype.getInteractableElements = function() {
    if (!this.element) {
      this.element = [];
      const el = $('#slideRange');
      const bound = {
        w: el.width(),
        h: el.height(),
        x: el.offset().left, // x=0 is left edge of the page
        y: el.offset().top   // y=0 is top of the page
      };
      const width = bound.w / this.state.length;
      const height = bound.h;
      const top = bound.y;

      for (let i = 0; i < this.state.length; i++) {
        const left = bound.x + i * width;
        const mock = this.getMockInteractableElements(width, height, left, top, this.state[i]);
        this.element.push(mock);
      }

    }
    return this.element;
  }

  Viz.prototype.getMockInteractableElements = function(width, height, left, top, value) {
    let mock = $('<div id=' + value + '></div>');
    $('#slider').after(mock);
    mock.css({ 
      width: width, 
      height: height,
      position: "absolute",
      left: left,
      top: top,
    });
    return mock[0];
  }

  Viz.prototype.getQueries = function(element, eventDist) {
    const state = $(element).attr('id');
    if (state) {
      return {
        "m": [new Query.Query(this.qtemplate[1], {State: state})],
        "d": [],
        "u": [new Query.Query(this.qtemplate[0], {State: state})]
      }
    }
    return {};
  }
  
  return Viz;
})(EventEmitter);

module.exports = {
  Viz: Viz
}
