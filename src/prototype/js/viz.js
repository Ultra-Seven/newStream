var EventEmitter = require("events");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


var Viz = (function(EventEmitter) {
  extend(Viz, EventEmitter);

  function Viz(engine, qtemplate, opts) {
    this.w = opts.w || 400;
    this.h = opts.h || 300;
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.xdomain = opts.xdomain;
    this.ydomain = opts.ydomain;
    this.id = opts.id;
    if (!this.id) 
      throw new Error("Viz needs do be bound to a DOM element");
    this.el = d3.select(this.id);
    this.xscale = d3.scale.ordinal().domain(this.xdomain).rangeBands([0, this.w], 0.05);
    this.yscale = d3.scale.linear().domain(this.ydomain).range([this.h, 0]);

    this.qtemplate = qtemplate;
    this.engine = engine;
    return this;
  };

  Viz.prototype.setup = function() {
    this.el
      .attr("width", this.w)
      .attr("height", this.h);
    this.g = this.el.append("g");
    this.g.append("rect")
       .attr("width", this.w)
       .attr("height", this.h)
       .attr("x", 0)
       .attr("y", 0)
       .style("fill", "white");
    this.markg = this.g.append("g");
    this.marks = this.markg.selectAll("rect");
    return this;
  }

  // data attributes can be directly mapped to mark attributes
  // except for x, and y which will be transformed using this.x/yscale
  Viz.prototype.render = function(data) {
    var me = this;
    var bound = this.marks.data(data);

    var setAttrs = function(els) {
      els
        .classed("mark", true)
        .attr("x", function(d) { return me.xscale(d.x); })
        .attr("width", me.xscale.rangeBand())
        .attr("y", function(d) { return me.h - me.yscale(d.y); })
        .attr("height", function(d) { return me.yscale(d.y); })
        .on("mouseover", function() { me.emit("mouseover", me, this); })
        .on("mouseout", function() { me.emit("mouseout", me.this); });

      for(var attr in data) {
        if (attr != "x" && attr != "y") 
          els.attr(attr, function(d) { return d[attr]; });
      }
    };


    setAttrs(bound.enter().append("rect"));
    setAttrs(bound);
    bound.exit().remove();
    return this;
  }

  Viz.prototype.markToParams = function(el) {
    return {x: el.data().x};
    return {};
  };

  return Viz;
})(EventEmitter);





var QueryTemplate = function() {
  this.id = 0;

  function QueryTemplate(qstr) {
    this.q = parser.one(qstr);
    this.vars = q.descendents("ParamVar");
    this.id = ++QueryTemplate.id;
  };

  QueryTemplate.prototype.run = function(params) {
    for (var key in params) {
    }
  };

  return QueryTemplate;
}

module.exports = {
  Viz: Viz,
  QueryTemplate: QueryTemplate
}
