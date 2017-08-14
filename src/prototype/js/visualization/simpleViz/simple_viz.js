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
    return this;
  };


  // Resize and create the plot background 
  Viz.prototype.setup = function() {
    this.addButtons();
    this.render(this.data);
    return this;
  }
  Viz.prototype.send = function(state) {
    var q = new Query.Query(this.qtemplate, {State: state});
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
      // button.on("click", e => {
      //   //do something...
      //   this.send(st);
      // })
      $('#buttons').after(button);
    });
    $(".interactable").css("margin", "10px 10px 10px 10px");
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
    this.element = this.element || [].slice.call(document.getElementsByClassName('interactable'));
    return this.element;
  }

  Viz.prototype.getQueries = function(element) {
    const state = $(element).attr('id');
    if (state) {
      return [new Query.Query(this.qtemplate, {State: state})];
    }
    return [];
  }
  

  return Viz;
})(EventEmitter);

module.exports = {
  Viz: Viz
}
