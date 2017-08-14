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

  var getLowerBound = function(number) {
    let min = 1;
    let order = 1;
    for (let i = 10; min > 0; i = i * 10) {
      min = Math.floor(number / i);
      order = i;
    }
    return order / 10;
  }
  function TypeViz(engine, qtemplate, opts) {  
    this.qtemplate = qtemplate;
    this.engine = engine;
    this.start = {};
    this.end = {};
    this.id = opts.id || ""
    this.groupname = opts.groupname || "marker-select"
    this.barChart = null;
    this.zoom = opts["zoom"] || 12;
    this.range = opts["range"] || [];
    this.metro = opts["metro"] || null;


    return this;
  };

  // Resize and create the plot background 
  TypeViz.prototype.setup = function() {
    this.render(this.data);
    return this;
  }
  TypeViz.prototype.setTargetMetro = function(metro) {
    this.metro = metro;
  }
  TypeViz.prototype.send = function(type) {
    var q = this.metro == null ? new Query.Query(this.qtemplate, {Type: type}) : new Query.Query(this.qtemplate, {Type: type, Metro: this.metro});
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
    if (!data) {
      return;
    }
    let max = data.length > 0 ? data[0].y : 0;
    let min = data.length > 0 ? data[0].y : 0;
    _.each(data, (d)=> {
      if (d.y > max) {max = d.y}
      if (d.y < min) {min = d.y}
    })
    let lowerbound = getLowerBound(min)
    let upperbound = getLowerBound(max);
    let standard_list = [0];
    for (let i = lowerbound; i < upperbound; i = i * 10) {
      standard_list.push(i);
      standard_list.push(i * 5);
    }
    standard_list.push(upperbound);
    let data_list = [];
    const type_lists = ["AG", "ENT", "CON", "SOC", "FIN", "INF", "MAN", "MIN", "BUS", "RET", "TRA", "UTL", "WHO", "GOV", "TOT", "NAT"];
    _.each(data, (element)=> {
      let gdp = element.y;
      let level = upperbound + "~";
      for (let i = 0; i < standard_list.length; i++) {
        if (gdp < standard_list[i]) {
          level = standard_list[i - 1] + "~" + standard_list[i];
          break;
        }
      }
      data_list.push({
        Type: type_lists[element.x],
        GDP: element.y,
        level: level
      });
    });
    var xf = crossfilter(data_list);
    this.drawBarChart(data_list, xf);
    this.drawPieChart(data_list, xf);
    dc.renderAll(this.groupname);

    this.barChart.selectAll('rect.bar').on('mouseover', (d) => {
      // use the data in d to take the right action
      const type = d.data.key;
      _.each(this.engine.vizes, function(v1, i1) {
        if (v1.id == "#viz3") {
          var q = this.metro == null ? new Query.Query(v1.qtemplate, {Type: type}) : new Query.Query(v1.qtemplate, {Type: type, Metro: this.metro});
          engine.registerQuery(q, v1.render.bind(v1), v1.id);
        }
      });
    });

    this.elements = [].slice.call(document.getElementsByClassName('bar'));

  }

  TypeViz.prototype.getQueries = function(element) {
    let retQueries = [];
    const type = element.__data__.x;
    _.each(this.engine.vizes, function(v1, i1) {
      if (v1.id == "#viz3") {
        let q = this.metro == null ? new Query.Query(v1.qtemplate, {Type: type}) : new Query.Query(v1.qtemplate, {Type: type, Metro: this.metro});
        retQueries.push(q);
      }
    });
    return retQueries;
  }
  
  TypeViz.prototype.getInteractableElements = function() {
    if (!this.elements) {
      this.elements = [].slice.call(document.getElementsByClassName('bar'));
    }
    return this.elements;
  }

  TypeViz.prototype.drawBarChart = function(data, xf) {
    let max = data.length > 0 ? data[0].GDP : 0;
    _.each(data, (d)=> {
      if (d.y > max) {max = d.GDP}
    })
    var types = xf.dimension(function(d) { return d.Type; });
    var typesGroup = types.group().reduceSum(function(d) { return d.GDP; });
    this.barChart = this.barChart || dc.barChart("#container .barChart", this.groupname);
    this.barChart.width(800) // (optional) define chart width, :default = 200
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
      .y(d3.scale.linear().domain([0, max]))
      .xUnits(dc.units.ordinal)
      .gap(1)
      .brushOn(false)
      .xAxisLabel('Type')
      .yAxisLabel('GDP');
  }

  TypeViz.prototype.drawPieChart = function(data, xf) {
    var types = xf.dimension(function(d) { return d.level; });
    var typesGroup = types.group().reduceCount();
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
