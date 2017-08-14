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
    this.metro_lists = {};

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

  MapViz.prototype.getElementsInView = function() {
    let retelements = [];
    let bound = this.map.getBounds();
    const lat1 = bound._northEast.lat;
    const lon1 = bound._northEast.lng;
    const lat2 = bound._southWest.lat;
    const lon2 = bound._southWest.lng;
    _.each(this.allElements, (element) => {
      let list = element.title.split(":")[0].split(",")
      let lat = parseFloat(list[0])
      let lon = parseFloat(list[1])
      if (lat < lat1 && lat > lat2 && lon < lon1 && lon > lon2) {
        retelements.push(element);
        this.getQueries(element);
      }
    });
    return retelements;
  }

  MapViz.prototype.getInteractableElements = function() {
    if (!this.elements) {
      this.elements = this.getElementsInView();
    }
    return this.elements;
  }

  MapViz.prototype.getQueries = function(element) {
    let num = element.title.split(": ")[1];
    let metro = this.metro_lists[parseInt(num)];
    let data = {Metro: metro};
    let ret = [];
    _.each(this.engine.vizes, (v1, i1) => {
      if (v1 != this) {
        ret.push(new Query.Query(v1.qtemplate, data));
      }
    });
    return ret;
  }

  MapViz.prototype.drawMarkerSelect = function(data) {
    let num = 0;
    var xf = crossfilter(data);
    var groupname = "marker-select";
    var facilities = xf.dimension(function(d) { return d.geo; });
    var facilitiesGroup = facilities.group().reduceSum(d => {
      if (!(d.metro in this.metro_lists)) {
        num++;
        this.metro_lists[num + ""] = d.metro;
      }
      return num;
    });

    this.chart = dc.leafletMarkerChart("#container .map",groupname);
    let that = this;
    this.chart.dimension(facilities)
      .group(facilitiesGroup)
      .width(600)
      .height(400)
      .center([38.89,-77.01])
      .zoom(7)
      // .cluster(true)
      .popup((d,marker) => {
        marker.on('click', e => {
          const metro = this.metro_lists[d.value + ""];
          const data = {
            Metro: metro
          }
          _.each(that.engine.vizes, function(v1, i1) {
            if (v1 != that) {
              v1.setTargetMetro(metro);
              var q = new Query.Query(v1.qtemplate, data);
              that.engine.registerQuery(q, v1.render.bind(v1), v1.id);
            }
          });
        });
        return "Metro:" + this.metro_lists[d.value + ""];
      });

    dc.renderAll(groupname);
    this.allElements = [].slice.call(document.getElementsByClassName('leaflet-clickable'));
    this.map = this.chart.map();
    this.map.on("zoomend", (e) => {
      this.elements = this.getElementsInView();
    });
    this.map.on("moveend", (e) => {
      this.elements = this.getElementsInView();
       console.log("moveend")
    });
  }

  return MapViz;
})(EventEmitter);

module.exports = {
  MapViz: MapViz
}
