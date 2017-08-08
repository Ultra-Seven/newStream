var EventEmitter = require("events");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


//
// Simple visualization model.  
// All it does is map a list of rows (js objects) to marks in an SVG element.
// 
//
var MapViz = (function(EventEmitter) {
  extend(MapViz, EventEmitter);

  function MapViz(engine, qtemplate, opts) {  
    this.qtemplate = qtemplate;
    this.engine = engine;
    this.start = {};
    this.end = {};
    this.id = opts.id || ""
    this.groupname = opts.groupname || "marker-select"
    this.chart = null;
    this.zoom = opts["zoom"] || 12;
    this.data = opts["data"] || [];
    this.map = null;

    return this;
  };

  // Resize and create the plot background 
  MapViz.prototype.setup = function() {
    d3.tsv("/static/data/metro_geo.tsv", data => {
        this.drawMarkerSelect(data);
    });
    return this;
  }
  
  // data attributes are directly mapped to mark attributes
  // except for x, and y which will be transformed using this.x/yscale
  MapViz.prototype.render = function(data) {
    if (this.map) {
      this.map.off();
      this.map.remove();
    }
    this.drawMarkerSelect(data);
  }

  
  MapViz.prototype.drawMarkerSelect = function(data) {
    var xf = crossfilter(data);
    var groupname = "marker-select";
    var facilities = xf.dimension(function(d) { return d.geo; });
    var facilitiesGroup = facilities.group().reduceCount();

    this.chart = dc.leafletMarkerChart("#container .map",groupname);
    this.chart.dimension(facilities)
      .group(facilitiesGroup)
      .width(600)
      .height(400)
      .center([38.89,-77.01])
      .zoom(7)
      .cluster(true);

    dc.renderAll(groupname);
    this.map = this.chart.map();
  }

  return MapViz;
})(EventEmitter);

module.exports = {
  MapViz: MapViz
}
