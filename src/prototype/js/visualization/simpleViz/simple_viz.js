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
    this.zoom = opts["zoom"] || 12;
    this.data = opts["data"] || [];
    this.map = null;
    return this;
  };

  // Resize and create the plot background 
  Viz.prototype.setup = function() {
    this.render(this.data);
    document.getElementById('zoomin').addEventListener('click', () => {
      this.zoom = this.zoom + 1;
      // this.map.zoomIn();
      this.send();
    });
    document.getElementById('zoomout').addEventListener('click', () => {
      this.zoom = this.zoom - 1;
      this.send();
    });
    return this;
  }
  Viz.prototype.send = function() {
    var q = new Query.Query(this.qtemplate, {Zoom: "z"+this.zoom});
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
  Viz.prototype.render = function(data) {
    if (this.map) {
      this.map.off();
      this.map.remove();
    }
    this.xf = crossfilter(data);
    this.facilities = this.xf.dimension(function(d) {return [d.y, d.z, d.x];});
    this.facilitiesGroup = this.facilities.group().reduceCount();
    this.chart = this.chart || dc.leafletMarkerChart("#simpleViz .map", this.groupname);
    this.chart = this.chart
        .dimension(this.facilities)
        .group(this.facilitiesGroup)
        .width(600)
        .height(400)
        .center([34.052235, -118.243683])
        .zoom(this.zoom)
        .cluster(true)
        .renderPopup(true)
        .popup(function(d,feature) {
          return "Population:"+" : "+d.key[2];
        });
    dc.renderAll(this.groupname);
    let mymap = this.chart.map();
    this.map = mymap;
    mymap._layersMaxZoom = 15;
    mymap._layersMinZoom = 8;
  }

  Viz.prototype.getQueries = function(element) {
    if (element.className === "leaflet-control-zoom-in") {
      return [new Query.Query(this.qtemplate, {Zoom: "z"+(this.zoom + 1)})];
    }
    else if(element.className === "leaflet-control-zoom-out") {
      return [new Query.Query(this.qtemplate, {Zoom: "z"+(this.zoom - 1)})];
    }
    else {

    }
  }
  

  return Viz;
})(EventEmitter);

module.exports = {
  Viz: Viz
}
