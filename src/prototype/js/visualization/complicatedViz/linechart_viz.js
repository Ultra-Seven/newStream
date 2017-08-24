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
    this.metro = null;
    
    return this;
  };

  // Resize and create the plot background 
  LineViz.prototype.setup = function() {
    this.lineChart = dc.lineChart("#lineChart .lineChart");
    return this;
  }
  // data attributes are directly mapped to mark attributes
  // except for x, and y which will be transformed using this.x/yscale
  LineViz.prototype.render = function(data) {
    let data_list = [];
    if (data.length > 0) {
      if (data[0].x <= 2013 && data[0].x >= 2000) {
        _.each(data, (element) => {
          data_list.push({
            Year: element.x,
            GDP: element.y
          });
        });
      }
      else {
        _.each(data, (element) => {
          data_list.push({
            Year: element.y,
            GDP: element.x
          });
        });
      }
    }
    
    this.drawLineChart(data_list);
    this.lineChart.render();
  }

  LineViz.prototype.getInteractableElements = function() {
    return [];
  }

  LineViz.prototype.getQueries = function(element) {
    return {
      "m": [],
      "d": [],
      "u": []
    };
  }

  LineViz.prototype.setTargetMetro = function(metro) {
    this.metro = metro;
  }
  
  LineViz.prototype.drawLineChart = function(data) {
    let min = data[0].GDP;
    let max = data[0].GDP;
    _.each(data, (d)=> {
      if (d.GDP > max) {max = d.GDP}
      if (d.GDP < min) {min = d.GDP}
    })
    var ndx = crossfilter(data);
//        var all = ndx.groupAll();
    var runDimension = ndx.dimension(function(d) {return +d.Year;});
    var GDPGroup = runDimension.group().reduceSum(function(d) {
      return d.GDP;
    });
    this.lineChart
      .width(768)
      .height(480)
      .x(d3.scale.linear().domain([2000, 2014]))
      .y(d3.scale.linear().domain([min, max]))
      .interpolate('cardinal')
      // .renderArea(true)
      .brushOn(false)
      .clipPadding(10)
      .yAxisLabel("GDP")
      .xAxisLabel("Year")
      .dimension(runDimension)
      .group(GDPGroup);
  }

  return LineViz;
})(EventEmitter);

module.exports = {
  LineViz: LineViz
}
