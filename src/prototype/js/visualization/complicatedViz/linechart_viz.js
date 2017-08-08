var EventEmitter = require("events");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


//
// Simple visualization model.  
// All it does is map a list of rows (js objects) to marks in an SVG element.
// 
//
var LineViz = (function(EventEmitter) {
  extend(LineViz, EventEmitter);

  function LineViz(engine, qtemplate, opts) {  
    this.qtemplate = qtemplate;
    this.engine = engine;
    this.start = {};
    this.end = {};
    this.id = opts.id || ""
    this.groupname = opts.groupname || "marker-select"
    this.lineChart = null;
    this.range = opts["range"] || [];
    

    

    return this;
  };

  // Resize and create the plot background 
  LineViz.prototype.setup = function() {
    this.lineChart = dc.lineChart("#lineChart .lineChart");
    return this;
  }
  LineViz.prototype.send = function() {
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
  LineViz.prototype.render = function(data) {
    this.drawLineChart(data);
    this.lineChart.render();
  }

  LineViz.prototype.getQueries = function(element) {
    if (element.className === "leaflet-control-zoom-in") {
      return [new Query.Query(this.qtemplate, {Zoom: "z"+(this.zoom + 1)})];
    }
    else if(element.className === "leaflet-control-zoom-out") {
      return [new Query.Query(this.qtemplate, {Zoom: "z"+(this.zoom - 1)})];
    }
    else {

    }
  }
  
  LineViz.prototype.drawLineChart = function(data) {
    var ndx = crossfilter(data);
//        var all = ndx.groupAll();
    var runDimension = ndx.dimension(function(d) {return +d.x;});
    var GDPGroup = runDimension.group().reduceSum(function(d) {
      return d.y;
    });
    this.lineChart
      .width(768)
      .height(480)
      .x(d3.scale.linear().domain([2000, 2014]))
      // .y(d3.scale.linear().domain([0,this.range["GDP"][1]]))
      .interpolate('cardinal')
      // .renderArea(true)
      .brushOn(false)
      .clipPadding(10)
      .yAxisLabel("Speed")
      .xAxisLabel("Run")
      .dimension(runDimension)
      .group(GDPGroup);
  }

  return LineViz;
})(EventEmitter);

module.exports = {
  LineViz: LineViz
}
