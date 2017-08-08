var EventEmitter = require("events");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


//
// Simple visualization model.  
// All it does is map a list of rows (js objects) to marks in an SVG element.
// 
//
var TypeViz = (function(EventEmitter) {
  extend(TypeViz, EventEmitter);

  function TypeViz(engine, qtemplate, opts) {  
    this.qtemplate = qtemplate;
    this.engine = engine;
    this.start = {};
    this.end = {};
    this.id = opts.id || ""
    this.groupname = opts.groupname || "marker-select"
    this.chart = null;
    this.zoom = opts["zoom"] || 12;
    this.range = opts["range"] || [];
    this.map = null;


    return this;
  };

  // Resize and create the plot background 
  TypeViz.prototype.setup = function() {
    this.render(this.data);
    return this;
  }
  TypeViz.prototype.send = function() {
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
  TypeViz.prototype.render = function(data) {
    let data_list = [];
    const type_lists = ["AG", "ENT", "CON", "SOC", "FIN", "INF", "MAN", "MIN", "BUS", "RET", "TRA", "UTL", "WHO", "GOV", "TOT", "NAT"];
    _.each(data, (element)=> {
      data_list.push({
        Type: type_lists[element.x],
        GDP: element.y
      });
    });
    this.drawBarChart(data_list);
    this.drawPieChart(data_list);
    dc.renderAll(this.groupname);
  }

  TypeViz.prototype.getQueries = function(element) {
    if (element.className === "leaflet-control-zoom-in") {
      return [new Query.Query(this.qtemplate, {Zoom: "z"+(this.zoom + 1)})];
    }
    else if(element.className === "leaflet-control-zoom-out") {
      return [new Query.Query(this.qtemplate, {Zoom: "z"+(this.zoom - 1)})];
    }
    else {

    }
  }
  
  TypeViz.prototype.drawBarChart = function(data) {
    var xf = crossfilter(data);
    var types = xf.dimension(function(d) { return d.Type; });
    var typesGroup = types.group().reduceSum(function(d) { return d.GDP; });
    let barChart = dc.barChart("#container .barChart", this.groupname);
    barChart.width(400) // (optional) define chart width, :default = 200
      .height(400) // (optional) define chart height, :default = 200
//            .transitionDuration(500) // (optional) define chart transition duration, :default = 500
            // (optional) define margins
//            .margins({top: 10, right: 50, bottom: 30, left: 40})
      .dimension(types)
      .group(typesGroup) // set group
            // (optional) whether chart should rescale y axis to fit data, :default = false
      .elasticY(true)
            // (optional) when elasticY is on whether padding should be applied to y axis domain, :default=0
//            .yAxisPadding(100)
            // (optional) whether chart should rescale x axis to fit data, :default = false
      .elasticX(true)
            // (optional) when elasticX is on whether padding should be applied to x axis domain, :default=0
      .xAxisPadding(100)
            // define x scale
      .x(d3.scale.ordinal())
      .xUnits(dc.units.ordinal)
      // .y(d3.scale.linear().domain([this.range["GDP"][0], this.range["GDP"][1]]))
      .gap(1)
      .brushOn(false)
      .xAxisLabel('Type')
      .yAxisLabel('GDP');
  }
  TypeViz.prototype.drawPieChart = function(data) {
    var xf = crossfilter(data);

    var types = xf.dimension(function(d) { return d.Type; });
    var typesGroup = types.group().reduceSum(function(d) { return d.GDP; });
    dc.pieChart("#container .pieChart", this.groupname)
      .dimension(types)
      .group(typesGroup)
      .width(200)
      .height(200)
      .renderLabel(true)
      .renderTitle(true)
      .ordering(function (p) {
        return -p.value;
      });
  }

  return TypeViz;
})(EventEmitter);

module.exports = {
  TypeViz: TypeViz
}
