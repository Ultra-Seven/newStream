(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

var EventEmitter = require("events");

module.exports = {
}


},{"events":19}],2:[function(require,module,exports){
var DataStructure = require("./datastruct").DataStructure;
var Decoders = require("./decoders");
var RangeIndex = require("./rangeidx");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


var CubeManager = (function(DataStructure) {
  extend(CubeManager, DataStructure);

  var encoding = 0;
  this.encoding = encoding;

  function CubeManager() {
    this.decoder = new Decoders.TableDecoder();
    this.rangeIdx = new RangeIndex.RangeIndex();

    DataStructure.call(this);
  };

  CubeManager.prototype.addBlock = function(range, block) {
    var table = this.decoder.decode(block);
    var data = {
      block: block,
      table: table
    };
    this.rangeIdx.add(range, data);
  };

  CubeManager.prototype.dealloc = function(sidx, eidx) {
    this.rangeIdx.rm([sidx, eidx]);
  }

  CubeManager.prototype.tryExec = function(q) {
  }

  return CubeManager;
})(DataStructure);


module.exports = {
  CubeManager: CubeManager
}

},{"./datastruct":3,"./decoders":4,"./rangeidx":10}],3:[function(require,module,exports){

var DataStructure = (function() {

  function DataStructure() {
  };

  //
  // if data structure supports this type of query. 
  // For example, data cube data structures may not support arbitrary queries
  //
  // @return true if could answer, false otherwise
  DataStructure.prototype.canAnswer = function(q, cb) {
    return false;
  };



  //
  // if can execute q from data structure's cached content, 
  // then get the result and send it to @param{cb}
  // @return true if could answer, false otherwise
  DataStructure.prototype.tryExec = function(q, cb) {
    if (!this.canAnswer(q)) return false;
    return false;
  };

  DataStructure.prototype.decode = function(sidx, eidx) { };

  DataStructure.prototype.free = function(sidx, eidx) { };

  return DataStructure;
})();

module.exports = {
  DataStructure: DataStructure
};

 

},{}],4:[function(require,module,exports){
var proto = require("./table_pb");
var Table = proto.Table;

var TableDecoder = (function() {
  var TableDecoder = function() {};

  TableDecoder.prototype.decode = function(buf) {
    return Table.deserializeBinary(buf);
    return decodeTable(buf);
  };

  return TableDecoder;
})();




var JSONDecoder = (function(){
  var dec = new TextDecoder("utf-8")

  var JSONDecoder = function() { };
   
  JSONDecoder.prototype.decode = function(buf) {
    var txt = dec.decode(new Uint32Array(buf));
    return JSON.parse(txt);
  };
  return JSONDecoder;
})();



module.exports = {
  TableDecoder: TableDecoder
}

},{"./table_pb":12}],5:[function(require,module,exports){
var EventEmitter = require("events");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


// helper function
function qToKey(q) {
  return q.template.id + ":" + JSON.stringify(q.data);
}



// Models a distribution  at a single instant in time.  
// The code doesn't support predicting into the future yet.
//
// A Distribution implements
//
//  set(object, prob) --> set the probability of object
//  get(object)       --> return some probabiity value 
//  getAllAbove(prob) --> [ [ object, probability]* ]
//  toWire()          --> JSON object to send to the server
//
var DistributionBase = (function() {
  function DistributionBase() {};

  // get the probability of some object, or 0 if not found
  DistributionBase.prototype.get = function(o) { return 0; };

  // @prob minimum probability for returned list
  // @return the list of all objects and their probabilities for all
  // objects whose probability is above @param{prob}
  DistributionBase.prototype.getAllAbove = function(prob) { return []; };


  // to a JSON-able representation that we can pass to jquery
  // aka a dictionary
  DistributionBase.prototype.toWire = function() { 
    return this.getAllAbove(0); 
  }

  return DistributionBase;
})();

//
// subclass DistributionBase for specific types of distributions
// The reason for subclasses is that we may want more efficient representations of  to predict mouse 
// positions in a discretized fashion, rather than on a pixel by pixel basis.
// If this is the case, then there may be more efficient representations.
//

var NaiveDistribution = (function(Base) {
  extend(NaiveDistribution, Base);

  NaiveDistribution.from = function(q) {
    var d = new NaiveDistribution();
    d.set(q, 1);
    return d;
  };


  function NaiveDistribution() {
    this.dist = {};
    // call parent constructor 
    Base.call(this);
  }

  NaiveDistribution.prototype.set = function(q, prob) {
    this.dist[qToKey(q)] = [q, prob]; 
  };

  NaiveDistribution.prototype.get = function(q) {
    if (q == null || q === undefined) return 0;
    var key = qToKey(q);
    if (key in this.dist) return this.dist[key][1];
    return 0;
  };

  NaiveDistribution.prototype.getAllAbove = function(prob) {
    prob = prob || 0;
    return _.filter(_.values(this.dist), function(pair) {
      return pair[1] >= prob;
    });
  };

  return NaiveDistribution;
})(DistributionBase);




// The requester runs as an infinite loop to regularly send a query distribution to the backend.  
//
// The sent distribution is defined as a dictionary:
//
//    {
//      dt: [query template id, params, probability]
//    }
//
// where
//
//    dt is thenumber of milliseconds into the future this distribution represents
//    query template id is the ID assigned to the query template object
//    params is a dictionary of query parameter -> value
//    probability is a float between 0 and 1
//
var Requester = (function(EventEmitter) {
  extend(Requester, EventEmitter);

  function Requester(engine, opts) {
    opts = opts || {};
    this.engine = engine;
    this.minInterval = opts.minInterval || 100;

    EventEmitter.call(this);
  };

  // Run the requester forever
  Requester.prototype.run = function() {
    var distribution = this.getQueryDistribution();
    if (distribution != null) 
      this.send(distribution);
    setTimeout(this.run().bind(this), this.minInterval);
  };

  // manually send a distribution to the server
  Requester.prototype.send = function(dist) {
    $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/distribution/set",
      data:  JSON.stringify(dist.toWire()),
      success: function (data) {
        // TODO: could use a debugging statement here
        console.log(data);
      },
      dataType: "json"
    });
  }

  ////////////////////////////////////////////////////////
  //
  //  Everything below is an unimplemented skeleton
  //  for actually generating a real query distribution
  //
  ////////////////////////////////////////////////////////

  // @param el a DOM element
  // @return bounding box of the element
  var getBoundingBox = function(el) {
    el = $(el);
    return {
      w: el.width(),
      h: el.height(),
      x: el.offset().left, // x=0 is left edge of the page
      y: el.offset().top   // y=0 is top of the page
    };
  };

  //
  // NOT IMPLEMENTED
  // @param dt number of milliseconds into the future
  // @return distribution of mouse positions
  //
  var getMouseDistribution = function(dt) {
    return new Distribution();
  }

  //
  // NOT IMPLEMENTED
  // Maps the mouse distribution to a distribution of queries, 
  // since we know the positions of all interactible DOM elements
  //
  // @mouseDist distribuiton of mouse positions (unimplementd)
  // @return query distribution
  var mapMouseToQueryDistribution = function(mouseDist) {

    // 1. get interactable DOM elements
    var els = $("button, .mark");

    // 2. be able to map a DOM element to the query+params that it would
    //    trigger if the user interacts with it
    var magicalGetQueryParams = function(el) {
      // not implemented
      return null;
    }

    // 3. be able to compute the probability of interacting with a DOM element
    //    super stupid way:
    var markProbability = function(el) {
      var bound = getBoundingBox(el);
      var probs = [];
      for (var dx = 0; dx < bound.w; dx++) {
        for (var dy = 0; dy < bound.w; dy++) {
          probs.push(mouseDist.get([bound.x+dx, bound.y+dy]))
        }
      }
      return d3.mean(probs);
    };

    // 4. use the above to construct a query distribution
    els.each(function(el) {
      var query = magicalGetQueryParams(el);
      // add it to a query distribution
    });

  }

  // @param dt number of milliseconds into the future
  // @return a list of [querytemplateid, params, probability]
  //         that conforms to the Requester wire format
  var getQueryDistribution = function(dt) {
    return null;
  };


  return Requester;
})(EventEmitter);



module.exports = {
  Requester: Requester,
  DistributionBase: DistributionBase,
  NaiveDistribution: NaiveDistribution
}

},{"events":19}],6:[function(require,module,exports){
var EventEmitter = require("events");
var RingBuffer = require("./ringbuffer").RingBuffer;
var Dist = require("./dist");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


var Engine = (function(EventEmitter) {
  extend(Engine, EventEmitter);

  function Engine(nMB) {
    this.queryTemplates = {};
    this.vizes = {};
    this.datastructs = {};
    this.ringbuf = new RingBuffer(nMB);
    this.requester = new Dist.Requester(this);

    EventEmitter.call(this);
  };

  Engine.prototype.registerDataStruct = function(ds) {
    this.ringbuf.register(encoding, ds);
    this.ringbuf.on("dealloc", ds.dealloc.bind(ds));
  };

  Engine.prototype.registerQueryTemplate = function(template, cb) {
    var id = _.size(this.queryTemplates) + 1;
    this.queryTemplates[id] = template;
    template.id = id;

    // register with the server!
    $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/register/querytemplate",
      data:  JSON.stringify(template.toWire()),
      success: function (data) {
        // TODO: could use a debugging statement here
      },
      dataType: "json"
    });

    if (cb && _.isFunction(cb)) cb(id);
    return id;
  }

  Engine.prototype.registerViz = function(viz) {
    var id = _.size(this.vizes) + 1;
    this.vizes[id] = viz;
    viz.on("update", function(qtemplate, params, cb) {
      if (qtemplate.id != 0 && !qtemplate.id) return;
    });
    return id;
   }

  //
  // a viz wants to actually run a query.
  //
  Engine.prototype.registerQuery = function(q, cb) {

    // 1. see if the data structures can immediately answer the query
    for (var dsid in this.datastructs) {
      var ds = this.datastructs[tid];
      if (ds.tryExec(q, cb)) return;
    }
    
    // 2. register with data structures that support this query
    for (var dsid in this.datastructs) {
      var ds = this.datastructs[tid];
      if (ds.canAnswer(q)) 
        ds.register(q, function() {
          // TODO: deregister all other registrations of this query

          cb.apply(arguments);
        });
    }

    // 3. send an explicit query distirubiton
    var dist = Dist.NaiveDistribution.from(q);
    this.requester.send(dist);

    // WU: there may end up being a minor race condition between the client sending
    // updated distributions and the server sending data based on stale distributions.
    // it could end up being not-so-efficient
  }

  return Engine;
})(EventEmitter);

module.exports = {
  Engine: Engine
};


},{"./dist":5,"./ringbuffer":11,"events":19}],7:[function(require,module,exports){
var Engine = require("./engine").Engine;
var Main = require("./main");
var CubeManager = require("./cubemgr").CubeManager;
var Query = require("./query");
var Viz = require("./viz");

var cubemgr = new CubeManager();
var engine = window.engine = new Engine(0.00041);
engine.registerDataStruct(cubemgr);


var qstr = "SELECT x, sum(y) AS y, 'black' AS fill FROM data WHERE :z  = $z | true: GROUP BY x";

var cubeQ1 = new Query.CubeQueryTemplate(
    { x: "a", y: "avg(b)", fill: "'black'" },
    "data",
    [ "a"],
    { "c": "num", "d": "num", "e": "num" } 
);
engine.registerQueryTemplate(cubeQ1);


var opts = {id: "#viz1", xdomain: [1, 2, 3, 4, 5], ydomain: [0, 100]};
var viz1 = new Viz.Viz(engine, cubeQ1, opts)
  .setup()
  .render([{x: 1, y: 10}, {x: 2, y: 50}, {x:4, y: 30}]);
engine.registerViz(viz1);


var cubeQ2 = new Query.CubeQueryTemplate(
    { x: "c", y: "avg(d)", fill: "'black'" },
    "data",
    [ "c"],
    { "a": "num", "b": "num", "c": "num" } 
);
engine.registerQueryTemplate(cubeQ2);
var opts = {id: "#viz2", xdomain: [1, 2, 3, 4, 5], ydomain: [0, 100]};
var viz2 = new Viz.Viz(engine, cubeQ2, opts)
  .setup()
  .render([{x: 1, y: 10}, {x: 2, y: 50}, {x:4, y: 30}]);
engine.registerViz(viz1);




viz1.on("mouseover", function(viz, el) {
  var data = d3.select(el).data();
  var q = new Query.Query(cubeQ2, {x:3});
  engine.registerQuery(q, viz2.render.bind(viz2));
  console.log(el);
});

viz2.on("mouseover", function(viz, el) {
  var data = d3.select(el).data();
  var q = new Query.Query(cubeQ1, {x:3});
  engine.registerQuery(q, viz1.render.bind(viz1));
  console.log(el);
});





Main.stream_from("/data", function(arr) {
  Main.Debug.update(arr);
  engine.ringbuf.write(arr);
}, Main.Debug.debug.bind(Main.Debug));






},{"./cubemgr":2,"./engine":6,"./main":8,"./query":9,"./viz":13}],8:[function(require,module,exports){


//
// using fetch
var stream_from = function(url, cb, final_cb) {
  fetch(url).then(function(resp) {
    if (!resp.body) return;
    var reader = resp.body.getReader();
    function loop() {
      return reader.read().then(function(res) {
        if (res.done) return "done!";
        if (cb) cb(res.value);
        return setTimeout(loop);
      });
    }
    return loop();
  }).then(function(data) {
    if (final_cb) final_cb(data);
  });
};


function binarySum(a,b) { return a + b;}

var Debug = (function Debug() {
  var start = Date.now();
  var counts = [];
  var i = 1;

  function Debug() { };
  Debug.prototype.debug = function(arr) {
    var cost = Date.now() - start;
    var total = counts.reduce(binarySum, 0)
    var stats = [total/cost/1000 + "mb/s", cost, total];

    console.log(stats.join("\t"));
    start = Date.now();
    counts = [];
  };

  Debug.prototype.update = function(arr) {
    counts.push(arr.length);

    if (counts.length > 1000 || (Date.now() - start) > 1000 * 2) {
      this.debug();
    }
  };
  return Debug;
})();
Debug = new Debug();




module.exports = {
  stream_from: stream_from,
  Debug: Debug
}

},{}],9:[function(require,module,exports){
var parser = require("jssqlparser");
var EventEmitter = require("events");
var _ = require("underscore");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;



//
// A query is simply an object that exposes parameters that can be set, and can generate a SQL string
//
var QueryTemplateBase = (function(EventEmitter) {
  extend(QueryTemplateBase, EventEmitter);
  QueryTemplateBase.name = "querybase";

  function QueryTemplateBase() { 
    EventEmitter.call(this);
  }

  // @return a list of parameter name and type [ {name:, type: }]
  //         type can be "num", "str"
  //
  QueryTemplateBase.prototype.getParams = function() {return [];}

  // Return a query string, or null if params are invalid in some way
  QueryTemplateBase.prototype.toSQL = function(params) {return null;}

  QueryTemplateBase.prototype.toWire = function() {return this.toSQL({});}

  return QueryTemplateBase;
})(EventEmitter);


// Uses jssqlparser package to parse a parameterized query string into a query object
//
// XXX: We don't use this because it requires a corresponding SQL parser
//      on the server, which we don't have.
//
var QueryTemplate = (function(QueryTemplateBase) {
  extend(QueryTemplate, QueryTemplateBase);
  QueryTemplate.name = "query";

  function QueryTemplate(qstr) {
    this.qstr = qstr;
    this.parsed = parser.one(qstr);
    QueryTemplateBase.call(this);
  }

  QueryTemplate.prototype.getParams = function() {
    var o = {};
    _.each(this.parsed.descendents("ParamVar"), function(pvar) {
      // XXX: assumes everything is a number
      o[pvar.name] = "num";
    });
    return o;
  };

  QueryTemplate.prototype.toSQL = function(params) {
    // TODO: apply params to sql AST
    return this.parser.toSQL();
  }

  // @param data is the dictionary of parameter -> value mappings
  //        due to name conflict it's called "data" here rather than "params"
  QueryTemplate.prototype.toWire = function() { 
    return {
      qid: (this.id || -1),
      name: QueryTemplate.name,
      qstr: this.qstr
    };
  };

  return QueryTemplate;
})(QueryTemplateBase);


// Highly constrained subset of single-table olap queries
var CubeQueryTemplate = (function(QueryTemplateBase) {
  extend(CubeQueryTemplate, QueryTemplateBase);
  CubeQueryTemplate.name = "cubequery";

  // @param select: a mapping from output alias to an expression string
  //         { x: "month", y: "avg(salary)" }
  // @param from:   table name
  // @param groupby list of groupby strings
  //         [ "month" ]
  // @param params: a mapping from an attribute to its data type.
  //         specifies the attribute predicates in the WHERE clause
  //
  //         for example, if params is { "hour": "num" } 
  //         then setting "hour" to 1 is the same as adding
  //
  //           WHERE hour = 1
  //         to the query
  //
  function CubeQueryTemplate(select, from, groupby, params) {
    this.select = select;
    this.from = from;
    this.groupby = groupby;
    this.params = params || {};
    QueryTemplateBase.call(this);
  }

  CubeQueryTemplate.prototype.getParams = function() { return this.params; }

  CubeQueryTemplate.prototype.toSQL = function(params) {
    // which of the arguments are allowed by this.params?
    var p = {};
    params = params || {};
    for (var key in this.params) {
      if (key in params && !_.isNull(params[key])) {
       p[key] = params[key] 
      }
    }

    var sel = _.map(this.select, function(e, alias) {
      return e + " AS " + alias;
    }).join(", ");

    var gb = this.groupby.join(", ");
    
    // TODO: make work for str attr types too.  Either way, not very secure..
    var where = _.map(p, function(v, attr) { return attr + " = " + v; });
    where = where.join(" AND ");
    where = (where.length > 0)? " WHERE " + where : "";
    
    var sql = ["SELECT", sel, "FROM", this.from, where, "GROUP BY", gb].join(" ");
    return sql;
  }

  CubeQueryTemplate.prototype.toWire = function() {
    return {
      qid: this.id,
      name: CubeQueryTemplate.name,
      select: this.select,
      from: this.from,
      groupby: this.groupby,
      params: this.params
    };
  }

  return CubeQueryTemplate;
})(QueryTemplateBase);

//var q = new CubeQueryTemplate({x: "avg(sal)", y: "sum(sal)"}, "data", ["month"], { a: "num", b: "num"});
//console.log(q.toSQL({a: 1, b: 99}))


// A query is simply a query template (one of the above classes) and a dictionary of
// parameter values
var Query = (function(EventEmitter) {
  extend(Query, EventEmitter);

  function Query(template, data) {
    this.template = template;
    this.data = data;
    EventEmitter.call(this);
  }

  // Return a query string, or null if params are invalid in some way
  Query.prototype.toSQL = function() {
    return this.template.toSQL(this.data);
  }

  Query.prototype.toWire = function() {
    return {
      template: this.template.toWire(),
      data: this.data
    };
  }

  return Query;
})(EventEmitter);

 module.exports = {
   CubeQueryTemplate: CubeQueryTemplate,
   Query: Query
}

},{"events":19,"jssqlparser":16,"underscore":18}],10:[function(require,module,exports){
var EventEmitter = require("events");

var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


var RangeIndex = (function(EventEmitter) {

  var RangeIndex = function() {
    EventEmitter.call(this);

    this.idx = {};
  };

  RangeIndex.prototype.add = function(range, data) {
    this.idx[range+""] = {
      range: range,
      data: data
    };
    var nkeys = 0;
    for (var key in this.idx) { nkeys++; }

    //console.log("add " + range.join(", ") + "\t" + nkeys);
  }

  RangeIndex.prototype.get = function(range) {
    for (var key in this.idx) {
      var r = this.idx[key].range;
      if (overlaps(range, r)) 
        return this.idx[key].data;
    }
    return null;
  };

  var overlaps = function(r1, r2) {
    //console.log(JSON.stringify([r1, r2]));
    return ((r1[0] < r2[0] && r2[0] < r1[1]) || 
            (r1[0] < r2[1] && r2[1] < r1[1]))
  }

  RangeIndex.prototype.rm = function(range) {
    var rmkeys = [];
    var nkeys = 0;
    for (var key in this.idx) {
      var r = this.idx[key].range;
      if (overlaps(range, r))
        rmkeys.push(key);
      nkeys ++;
    }

    var rm = [];
    for (var i = 0; i < rmkeys.length; i++) {
      rm.push(this.idx[rmkeys[i]]);
      delete this.idx[rmkeys[i]];
    }
    //console.log("rm " + range.join(", ") + "\t" + nkeys + "\t" + rmkeys.length);
    return rm;
  };

  RangeIndex.prototype.__proto__ = EventEmitter.prototype;
  return RangeIndex;
})(EventEmitter);

module.exports = {
  RangeIndex: RangeIndex
}

},{"events":19}],11:[function(require,module,exports){
var EventEmitter = require("events");
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;


var Head = (function() {
  function Head(buflen, pos, iter) {
    this.buflen = buflen;
    this.pos = pos || 0;    // position in array
    this.iter = iter || 0;  // # times looped array
  }
  Head.prototype.move = function(len) {
    if (this.pos + len >= this.buflen) {
      this.iter += 1;
    }
    this.pos = (this.pos + len) % this.buflen;
  }
  Head.prototype.moveNew = function(len) {
    var buflen = this.buflen,
        pos = this.pos,
        iter = this.iter;
    if (pos + len >= buflen) 
      iter += 1;
    pos = (pos + len) % buflen;
    return new Head(buflen, pos, iter);
  }
  Head.prototype.isLarger = function(o) {
    return (this.iter > o.iter) || (this.pos > o.pos && this.iter == o.iter);
  }
  // number of bytes this can write before overtaking o
  Head.prototype.bytesCanWrite = function(o) {
    if (this.iter == o.iter) {
      if (this.pos >= o.pos) 
        return (this.buflen - this.pos) + o.pos;
    }
    if (this.iter == o.iter + 1) {
      if (o.pos >= this.pos)
        return o.pos - this.pos;
    }
    return null;
  }
  Head.prototype.toString = function() {
    return [this.pos, ":", this.iter].join("")
  };
  return Head;
})();


//
// The ring buffer is a single block of memory represented as an arraybuffer
// We use two pointers --- a read head and a write head --- to keep track of what has
// been read and written.
//
// Data structures can register to be informed of blocks of bytes that are relevant to them.
//
// TODO: use WebWorker?
//
var RingBuffer = (function(EventEmitter) {
  extend(RingBuffer, EventEmitter);

  var bytespermb = 1048576;

  function RingBuffer(sizeInMB) {
    this.decoders = {};
    this.listeners = {};
    this.buflen = Math.floor(bytespermb * sizeInMB);
    this.buffer = new ArrayBuffer(this.buflen);

    // We need to copy in terms of 8 bit integers otherwise
    // js will expand each byte into 16/32 bits on copy!
    this.uint = new Uint8Array(this.buffer);
    this.whead = new Head(this.buflen);
    this.rhead = new Head(this.buflen);
    this.bufs = [];
    this.size = 0;

    EventEmitter.call(this);
  }

  //
  // write to the ring buffer.  
  //
  RingBuffer.prototype.write = function(fromBuf) {
    this.readAvailBlocks()

    // figure out maximum number of bytes we can write before overtaking
    // the read head pointer.
    var toWrite = this.whead.bytesCanWrite(this.rhead);
    if (toWrite == null || toWrite == 0) {
      throw Error("There's no way to write to the ring buffer without the write pointer overtaking the read pointer")
    }
    // we can continuously write to the read head, the end of the buffer, or the size of fromBuf
    toWrite = Math.min(toWrite, this.buflen - this.whead.pos, fromBuf.byteLength);
    var from = fromBuf.slice(0, toWrite);
    this.uint.set(from, this.whead.pos);

    // since we are overwriting these bytes, make sure any data structures
    // dependent on those bytes know
    this.emit("dealloc", this.whead.pos, this.whead.moveNew(toWrite).pos);

    this.whead.move(toWrite);

    // if we didn't get to write everything in the fromBuf, try to write the rest
    if (toWrite < fromBuf.byteLength) 
      this.write(fromBuf.slice(toWrite));

    this.readAvailBlocks();
  }

  // Keeps reading blocks of the buffer and incrementing the read head if the data is available
  RingBuffer.prototype.readAvailBlocks = function() {
    while(1) {
      var tmp = this.readAvailBlock();
      if (tmp == null) break;
      var block = tmp.block,
          enc = tmp.enc,
          byteRange = tmp.byteRange;
      this.rhead.move(tmp.nBytesRead);

      if (enc in this.decoders) {
        this.decoders[enc].addBlock(byteRange, block);
      }
    }
  };

  // Helper function that blindly reads @param{len} bytes.
  // @param wrap set to false to throw error if requires wrapping around the buffer
  // @return a 8-bit unsigned integer array (Uint8Array)
  RingBuffer.prototype.read = function(offset, len, wrap) {
    wrap = wrap || false;
    var eidx = (offset + len) % this.buflen
    if (offset + len > this.buflen && !wrap) {
      throw Error();
    }
   
    var ret = this.uint.slice(offset, offset+len);
    if (eidx < offset ) {
      ret = new Uint8Array(new ArrayBuffer(len));
      ret.set(this.uint.slice(offset), 0);
      ret.set(this.uint.slice(0, eidx), (len - eidx));
    }

    return ret;
  };

  RingBuffer.prototype.allowedToRead = function(len, rhead) {
    rhead = rhead || this.rhead;
    return !rhead.moveNew(len).isLarger(this.whead);
  };

  // try to read the next contigious block of data.  Block header contains two
  // 32 bit integers representing the length of the body of the block followed by 
  // the encoding of the data structure.  
  //
  //      block format: [len] [enc] [.....len bytes......]
  //
  RingBuffer.prototype.readAvailBlock = function() {
    if (!this.allowedToRead(8)) {
        return null;
    }
    var buf = new Uint32Array(this.read(this.rhead.pos, 8, true)); 
    var len = buf[0];
    var enc = buf[1];
    var offset = 8; // in terms of 8 bit array
    var curRhead = this.rhead.moveNew(8);

    if (!this.allowedToRead(len+offset)) {
      //console.log(["can't read: ", curRhead.pos, len, this.whead.pos]);
      return null;
    }

    //console.log(["reading: ", curRhead.toString(), len, enc])
    
    // if (enc is not recognized) throw Error

    return {
      enc: enc,
      block: this.read(curRhead.pos, len, true),
      byteRange: [this.rhead.pos, this.rhead.moveNew(offset+len).pos],
      nBytesRead: offset+len
    }
  }

  // use this to register a new decoder
  RingBuffer.prototype.register = function(encoderId, decoder) {
    this.decoders[encoderId] = decoder;
  };

  return RingBuffer;
})(EventEmitter);



module.exports = {
  RingBuffer: RingBuffer
}

},{"events":19}],12:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

goog.exportSymbol('proto.Table', null, global);
goog.exportSymbol('proto.Table.Col', null, global);
goog.exportSymbol('proto.Table.Schema', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.Table = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.Table.repeatedFields_, null);
};
goog.inherits(proto.Table, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.Table.displayName = 'proto.Table';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.Table.repeatedFields_ = [2];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.Table.prototype.toObject = function(opt_includeInstance) {
  return proto.Table.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.Table} msg The msg instance to transform.
 * @return {!Object}
 */
proto.Table.toObject = function(includeInstance, msg) {
  var f, obj = {
    schema: (f = msg.getSchema()) && proto.Table.Schema.toObject(includeInstance, f),
    colsList: jspb.Message.toObjectList(msg.getColsList(),
    proto.Table.Col.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.Table}
 */
proto.Table.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.Table;
  return proto.Table.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.Table} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.Table}
 */
proto.Table.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.Table.Schema;
      reader.readMessage(value,proto.Table.Schema.deserializeBinaryFromReader);
      msg.setSchema(value);
      break;
    case 2:
      var value = new proto.Table.Col;
      reader.readMessage(value,proto.Table.Col.deserializeBinaryFromReader);
      msg.addCols(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.Table.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.Table.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.Table} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.Table.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getSchema();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      proto.Table.Schema.serializeBinaryToWriter
    );
  }
  f = message.getColsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      2,
      f,
      proto.Table.Col.serializeBinaryToWriter
    );
  }
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.Table.Col = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.Table.Col.repeatedFields_, null);
};
goog.inherits(proto.Table.Col, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.Table.Col.displayName = 'proto.Table.Col';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.Table.Col.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.Table.Col.prototype.toObject = function(opt_includeInstance) {
  return proto.Table.Col.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.Table.Col} msg The msg instance to transform.
 * @return {!Object}
 */
proto.Table.Col.toObject = function(includeInstance, msg) {
  var f, obj = {
    valList: jspb.Message.getField(msg, 1)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.Table.Col}
 */
proto.Table.Col.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.Table.Col;
  return proto.Table.Col.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.Table.Col} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.Table.Col}
 */
proto.Table.Col.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {!Array.<number>} */ (reader.readPackedInt32());
      msg.setValList(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.Table.Col.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.Table.Col.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.Table.Col} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.Table.Col.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getValList();
  if (f.length > 0) {
    writer.writePackedInt32(
      1,
      f
    );
  }
};


/**
 * repeated int32 val = 1;
 * If you change this array by adding, removing or replacing elements, or if you
 * replace the array itself, then you must call the setter to update it.
 * @return {!Array.<number>}
 */
proto.Table.Col.prototype.getValList = function() {
  return /** @type {!Array.<number>} */ (jspb.Message.getField(this, 1));
};


/** @param {!Array.<number>} value */
proto.Table.Col.prototype.setValList = function(value) {
  jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {!number} value
 * @param {number=} opt_index
 */
proto.Table.Col.prototype.addVal = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


proto.Table.Col.prototype.clearValList = function() {
  this.setValList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.Table.Schema = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.Table.Schema.repeatedFields_, null);
};
goog.inherits(proto.Table.Schema, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.Table.Schema.displayName = 'proto.Table.Schema';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.Table.Schema.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.Table.Schema.prototype.toObject = function(opt_includeInstance) {
  return proto.Table.Schema.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.Table.Schema} msg The msg instance to transform.
 * @return {!Object}
 */
proto.Table.Schema.toObject = function(includeInstance, msg) {
  var f, obj = {
    nameList: jspb.Message.getField(msg, 1)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.Table.Schema}
 */
proto.Table.Schema.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.Table.Schema;
  return proto.Table.Schema.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.Table.Schema} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.Table.Schema}
 */
proto.Table.Schema.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.addName(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.Table.Schema.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.Table.Schema.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.Table.Schema} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.Table.Schema.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getNameList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      1,
      f
    );
  }
};


/**
 * repeated string name = 1;
 * If you change this array by adding, removing or replacing elements, or if you
 * replace the array itself, then you must call the setter to update it.
 * @return {!Array.<string>}
 */
proto.Table.Schema.prototype.getNameList = function() {
  return /** @type {!Array.<string>} */ (jspb.Message.getField(this, 1));
};


/** @param {!Array.<string>} value */
proto.Table.Schema.prototype.setNameList = function(value) {
  jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.Table.Schema.prototype.addName = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


proto.Table.Schema.prototype.clearNameList = function() {
  this.setNameList([]);
};


/**
 * optional Schema schema = 1;
 * @return {?proto.Table.Schema}
 */
proto.Table.prototype.getSchema = function() {
  return /** @type{?proto.Table.Schema} */ (
    jspb.Message.getWrapperField(this, proto.Table.Schema, 1));
};


/** @param {?proto.Table.Schema|undefined} value */
proto.Table.prototype.setSchema = function(value) {
  jspb.Message.setWrapperField(this, 1, value);
};


proto.Table.prototype.clearSchema = function() {
  this.setSchema(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.Table.prototype.hasSchema = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * repeated Col cols = 2;
 * If you change this array by adding, removing or replacing elements, or if you
 * replace the array itself, then you must call the setter to update it.
 * @return {!Array.<!proto.Table.Col>}
 */
proto.Table.prototype.getColsList = function() {
  return /** @type{!Array.<!proto.Table.Col>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.Table.Col, 2));
};


/** @param {!Array.<!proto.Table.Col>} value */
proto.Table.prototype.setColsList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 2, value);
};


/**
 * @param {!proto.Table.Col=} opt_value
 * @param {number=} opt_index
 * @return {!proto.Table.Col}
 */
proto.Table.prototype.addCols = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 2, opt_value, proto.Table.Col, opt_index);
};


proto.Table.prototype.clearColsList = function() {
  this.setColsList([]);
};


goog.object.extend(exports, proto);

},{"google-protobuf":14}],13:[function(require,module,exports){
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

},{"events":19}],14:[function(require,module,exports){
(function (global){
var $jscomp={scope:{},getGlobal:function(a){return"undefined"!=typeof window&&window===a?a:"undefined"!=typeof global?global:a}};$jscomp.global=$jscomp.getGlobal(this);$jscomp.initSymbol=function(){$jscomp.global.Symbol||($jscomp.global.Symbol=$jscomp.Symbol);$jscomp.initSymbol=function(){}};$jscomp.symbolCounter_=0;$jscomp.Symbol=function(a){return"jscomp_symbol_"+a+$jscomp.symbolCounter_++};
$jscomp.initSymbolIterator=function(){$jscomp.initSymbol();$jscomp.global.Symbol.iterator||($jscomp.global.Symbol.iterator=$jscomp.global.Symbol("iterator"));$jscomp.initSymbolIterator=function(){}};$jscomp.makeIterator=function(a){$jscomp.initSymbolIterator();$jscomp.initSymbol();$jscomp.initSymbolIterator();var b=a[Symbol.iterator];if(b)return b.call(a);var c=0;return{next:function(){return c<a.length?{done:!1,value:a[c++]}:{done:!0}}}};
$jscomp.arrayFromIterator=function(a){for(var b,c=[];!(b=a.next()).done;)c.push(b.value);return c};$jscomp.arrayFromIterable=function(a){return a instanceof Array?a:$jscomp.arrayFromIterator($jscomp.makeIterator(a))};$jscomp.inherits=function(a,b){function c(){}c.prototype=b.prototype;a.prototype=new c;a.prototype.constructor=a;for(var d in b)if(Object.defineProperties){var e=Object.getOwnPropertyDescriptor(b,d);e&&Object.defineProperty(a,d,e)}else a[d]=b[d]};$jscomp.array=$jscomp.array||{};
$jscomp.iteratorFromArray=function(a,b){$jscomp.initSymbolIterator();a instanceof String&&(a+="");var c=0,d={next:function(){if(c<a.length){var e=c++;return{value:b(e,a[e]),done:!1}}d.next=function(){return{done:!0,value:void 0}};return d.next()}};$jscomp.initSymbol();$jscomp.initSymbolIterator();d[Symbol.iterator]=function(){return d};return d};
$jscomp.findInternal=function(a,b,c){a instanceof String&&(a=String(a));for(var d=a.length,e=0;e<d;e++){var f=a[e];if(b.call(c,f,e,a))return{i:e,v:f}}return{i:-1,v:void 0}};
$jscomp.array.from=function(a,b,c){$jscomp.initSymbolIterator();b=null!=b?b:function(a){return a};var d=[];$jscomp.initSymbol();$jscomp.initSymbolIterator();var e=a[Symbol.iterator];"function"==typeof e&&(a=e.call(a));if("function"==typeof a.next)for(;!(e=a.next()).done;)d.push(b.call(c,e.value));else for(var e=a.length,f=0;f<e;f++)d.push(b.call(c,a[f]));return d};$jscomp.array.of=function(a){return $jscomp.array.from(arguments)};
$jscomp.array.entries=function(){return $jscomp.iteratorFromArray(this,function(a,b){return[a,b]})};$jscomp.array.installHelper_=function(a,b){!Array.prototype[a]&&Object.defineProperties&&Object.defineProperty&&Object.defineProperty(Array.prototype,a,{configurable:!0,enumerable:!1,writable:!0,value:b})};$jscomp.array.entries$install=function(){$jscomp.array.installHelper_("entries",$jscomp.array.entries)};$jscomp.array.keys=function(){return $jscomp.iteratorFromArray(this,function(a){return a})};
$jscomp.array.keys$install=function(){$jscomp.array.installHelper_("keys",$jscomp.array.keys)};$jscomp.array.values=function(){return $jscomp.iteratorFromArray(this,function(a,b){return b})};$jscomp.array.values$install=function(){$jscomp.array.installHelper_("values",$jscomp.array.values)};
$jscomp.array.copyWithin=function(a,b,c){var d=this.length;a=Number(a);b=Number(b);c=Number(null!=c?c:d);if(a<b)for(c=Math.min(c,d);b<c;)b in this?this[a++]=this[b++]:(delete this[a++],b++);else for(c=Math.min(c,d+b-a),a+=c-b;c>b;)--c in this?this[--a]=this[c]:delete this[a];return this};$jscomp.array.copyWithin$install=function(){$jscomp.array.installHelper_("copyWithin",$jscomp.array.copyWithin)};
$jscomp.array.fill=function(a,b,c){var d=this.length||0;0>b&&(b=Math.max(0,d+b));if(null==c||c>d)c=d;c=Number(c);0>c&&(c=Math.max(0,d+c));for(b=Number(b||0);b<c;b++)this[b]=a;return this};$jscomp.array.fill$install=function(){$jscomp.array.installHelper_("fill",$jscomp.array.fill)};$jscomp.array.find=function(a,b){return $jscomp.findInternal(this,a,b).v};$jscomp.array.find$install=function(){$jscomp.array.installHelper_("find",$jscomp.array.find)};
$jscomp.array.findIndex=function(a,b){return $jscomp.findInternal(this,a,b).i};$jscomp.array.findIndex$install=function(){$jscomp.array.installHelper_("findIndex",$jscomp.array.findIndex)};$jscomp.ASSUME_NO_NATIVE_MAP=!1;
$jscomp.Map$isConformant=function(){if($jscomp.ASSUME_NO_NATIVE_MAP)return!1;var a=$jscomp.global.Map;if(!a||!a.prototype.entries||"function"!=typeof Object.seal)return!1;try{var b=Object.seal({x:4}),c=new a($jscomp.makeIterator([[b,"s"]]));if("s"!=c.get(b)||1!=c.size||c.get({x:4})||c.set({x:4},"t")!=c||2!=c.size)return!1;var d=c.entries(),e=d.next();if(e.done||e.value[0]!=b||"s"!=e.value[1])return!1;e=d.next();return e.done||4!=e.value[0].x||"t"!=e.value[1]||!d.next().done?!1:!0}catch(f){return!1}};
$jscomp.Map=function(a){this.data_={};this.head_=$jscomp.Map.createHead();this.size=0;if(a){a=$jscomp.makeIterator(a);for(var b;!(b=a.next()).done;)b=b.value,this.set(b[0],b[1])}};
$jscomp.Map.prototype.set=function(a,b){var c=$jscomp.Map.maybeGetEntry(this,a);c.list||(c.list=this.data_[c.id]=[]);c.entry?c.entry.value=b:(c.entry={next:this.head_,previous:this.head_.previous,head:this.head_,key:a,value:b},c.list.push(c.entry),this.head_.previous.next=c.entry,this.head_.previous=c.entry,this.size++);return this};
$jscomp.Map.prototype["delete"]=function(a){a=$jscomp.Map.maybeGetEntry(this,a);return a.entry&&a.list?(a.list.splice(a.index,1),a.list.length||delete this.data_[a.id],a.entry.previous.next=a.entry.next,a.entry.next.previous=a.entry.previous,a.entry.head=null,this.size--,!0):!1};$jscomp.Map.prototype.clear=function(){this.data_={};this.head_=this.head_.previous=$jscomp.Map.createHead();this.size=0};$jscomp.Map.prototype.has=function(a){return!!$jscomp.Map.maybeGetEntry(this,a).entry};
$jscomp.Map.prototype.get=function(a){return(a=$jscomp.Map.maybeGetEntry(this,a).entry)&&a.value};$jscomp.Map.prototype.entries=function(){return $jscomp.Map.makeIterator_(this,function(a){return[a.key,a.value]})};$jscomp.Map.prototype.keys=function(){return $jscomp.Map.makeIterator_(this,function(a){return a.key})};$jscomp.Map.prototype.values=function(){return $jscomp.Map.makeIterator_(this,function(a){return a.value})};
$jscomp.Map.prototype.forEach=function(a,b){for(var c=this.entries(),d;!(d=c.next()).done;)d=d.value,a.call(b,d[1],d[0],this)};$jscomp.Map.maybeGetEntry=function(a,b){var c=$jscomp.Map.getId(b),d=a.data_[c];if(d&&Object.prototype.hasOwnProperty.call(a.data_,c))for(var e=0;e<d.length;e++){var f=d[e];if(b!==b&&f.key!==f.key||b===f.key)return{id:c,list:d,index:e,entry:f}}return{id:c,list:d,index:-1,entry:void 0}};
$jscomp.Map.makeIterator_=function(a,b){var c=a.head_,d={next:function(){if(c){for(;c.head!=a.head_;)c=c.previous;for(;c.next!=c.head;)return c=c.next,{done:!1,value:b(c)};c=null}return{done:!0,value:void 0}}};$jscomp.initSymbol();$jscomp.initSymbolIterator();d[Symbol.iterator]=function(){return d};return d};$jscomp.Map.mapIndex_=0;$jscomp.Map.createHead=function(){var a={};return a.previous=a.next=a.head=a};
$jscomp.Map.getId=function(a){if(!(a instanceof Object))return"p_"+a;if(!($jscomp.Map.idKey in a))try{$jscomp.Map.defineProperty(a,$jscomp.Map.idKey,{value:++$jscomp.Map.mapIndex_})}catch(b){}return $jscomp.Map.idKey in a?a[$jscomp.Map.idKey]:"o_ "+a};$jscomp.Map.defineProperty=Object.defineProperty?function(a,b,c){Object.defineProperty(a,b,{value:String(c)})}:function(a,b,c){a[b]=String(c)};$jscomp.Map.Entry=function(){};
$jscomp.Map$install=function(){$jscomp.initSymbol();$jscomp.initSymbolIterator();$jscomp.Map$isConformant()?$jscomp.Map=$jscomp.global.Map:($jscomp.initSymbol(),$jscomp.initSymbolIterator(),$jscomp.Map.prototype[Symbol.iterator]=$jscomp.Map.prototype.entries,$jscomp.initSymbol(),$jscomp.Map.idKey=Symbol("map-id-key"),$jscomp.Map$install=function(){})};$jscomp.math=$jscomp.math||{};
$jscomp.math.clz32=function(a){a=Number(a)>>>0;if(0===a)return 32;var b=0;0===(a&4294901760)&&(a<<=16,b+=16);0===(a&4278190080)&&(a<<=8,b+=8);0===(a&4026531840)&&(a<<=4,b+=4);0===(a&3221225472)&&(a<<=2,b+=2);0===(a&2147483648)&&b++;return b};$jscomp.math.imul=function(a,b){a=Number(a);b=Number(b);var c=a&65535,d=b&65535;return c*d+((a>>>16&65535)*d+c*(b>>>16&65535)<<16>>>0)|0};$jscomp.math.sign=function(a){a=Number(a);return 0===a||isNaN(a)?a:0<a?1:-1};
$jscomp.math.log10=function(a){return Math.log(a)/Math.LN10};$jscomp.math.log2=function(a){return Math.log(a)/Math.LN2};$jscomp.math.log1p=function(a){a=Number(a);if(.25>a&&-.25<a){for(var b=a,c=1,d=a,e=0,f=1;e!=d;)b*=a,f*=-1,d=(e=d)+f*b/++c;return d}return Math.log(1+a)};$jscomp.math.expm1=function(a){a=Number(a);if(.25>a&&-.25<a){for(var b=a,c=1,d=a,e=0;e!=d;)b*=a/++c,d=(e=d)+b;return d}return Math.exp(a)-1};$jscomp.math.cosh=function(a){a=Number(a);return(Math.exp(a)+Math.exp(-a))/2};
$jscomp.math.sinh=function(a){a=Number(a);return 0===a?a:(Math.exp(a)-Math.exp(-a))/2};$jscomp.math.tanh=function(a){a=Number(a);if(0===a)return a;var b=Math.exp(-2*Math.abs(a)),b=(1-b)/(1+b);return 0>a?-b:b};$jscomp.math.acosh=function(a){a=Number(a);return Math.log(a+Math.sqrt(a*a-1))};$jscomp.math.asinh=function(a){a=Number(a);if(0===a)return a;var b=Math.log(Math.abs(a)+Math.sqrt(a*a+1));return 0>a?-b:b};
$jscomp.math.atanh=function(a){a=Number(a);return($jscomp.math.log1p(a)-$jscomp.math.log1p(-a))/2};$jscomp.math.hypot=function(a,b,c){a=Number(a);b=Number(b);var d,e,f,g=Math.max(Math.abs(a),Math.abs(b));for(d=2;d<arguments.length;d++)g=Math.max(g,Math.abs(arguments[d]));if(1E100<g||1E-100>g){a/=g;b/=g;f=a*a+b*b;for(d=2;d<arguments.length;d++)e=Number(arguments[d])/g,f+=e*e;return Math.sqrt(f)*g}f=a*a+b*b;for(d=2;d<arguments.length;d++)e=Number(arguments[d]),f+=e*e;return Math.sqrt(f)};
$jscomp.math.trunc=function(a){a=Number(a);if(isNaN(a)||Infinity===a||-Infinity===a||0===a)return a;var b=Math.floor(Math.abs(a));return 0>a?-b:b};$jscomp.math.cbrt=function(a){if(0===a)return a;a=Number(a);var b=Math.pow(Math.abs(a),1/3);return 0>a?-b:b};$jscomp.number=$jscomp.number||{};$jscomp.number.isFinite=function(a){return"number"!==typeof a?!1:!isNaN(a)&&Infinity!==a&&-Infinity!==a};$jscomp.number.isInteger=function(a){return $jscomp.number.isFinite(a)?a===Math.floor(a):!1};
$jscomp.number.isNaN=function(a){return"number"===typeof a&&isNaN(a)};$jscomp.number.isSafeInteger=function(a){return $jscomp.number.isInteger(a)&&Math.abs(a)<=$jscomp.number.MAX_SAFE_INTEGER};$jscomp.number.EPSILON=function(){return Math.pow(2,-52)}();$jscomp.number.MAX_SAFE_INTEGER=function(){return 9007199254740991}();$jscomp.number.MIN_SAFE_INTEGER=function(){return-9007199254740991}();$jscomp.object=$jscomp.object||{};
$jscomp.object.assign=function(a,b){for(var c=1;c<arguments.length;c++){var d=arguments[c];if(d)for(var e in d)Object.prototype.hasOwnProperty.call(d,e)&&(a[e]=d[e])}return a};$jscomp.object.is=function(a,b){return a===b?0!==a||1/a===1/b:a!==a&&b!==b};$jscomp.ASSUME_NO_NATIVE_SET=!1;
$jscomp.Set$isConformant=function(){if($jscomp.ASSUME_NO_NATIVE_SET)return!1;var a=$jscomp.global.Set;if(!a||!a.prototype.entries||"function"!=typeof Object.seal)return!1;try{var b=Object.seal({x:4}),c=new a($jscomp.makeIterator([b]));if(!c.has(b)||1!=c.size||c.add(b)!=c||1!=c.size||c.add({x:4})!=c||2!=c.size)return!1;var d=c.entries(),e=d.next();if(e.done||e.value[0]!=b||e.value[1]!=b)return!1;e=d.next();return e.done||e.value[0]==b||4!=e.value[0].x||e.value[1]!=e.value[0]?!1:d.next().done}catch(f){return!1}};
$jscomp.Set=function(a){this.map_=new $jscomp.Map;if(a){a=$jscomp.makeIterator(a);for(var b;!(b=a.next()).done;)this.add(b.value)}this.size=this.map_.size};$jscomp.Set.prototype.add=function(a){this.map_.set(a,a);this.size=this.map_.size;return this};$jscomp.Set.prototype["delete"]=function(a){a=this.map_["delete"](a);this.size=this.map_.size;return a};$jscomp.Set.prototype.clear=function(){this.map_.clear();this.size=0};$jscomp.Set.prototype.has=function(a){return this.map_.has(a)};
$jscomp.Set.prototype.entries=function(){return this.map_.entries()};$jscomp.Set.prototype.values=function(){return this.map_.values()};$jscomp.Set.prototype.forEach=function(a,b){var c=this;this.map_.forEach(function(d){return a.call(b,d,d,c)})};$jscomp.Set$install=function(){$jscomp.Map$install();$jscomp.Set$isConformant()?$jscomp.Set=$jscomp.global.Set:($jscomp.initSymbol(),$jscomp.initSymbolIterator(),$jscomp.Set.prototype[Symbol.iterator]=$jscomp.Set.prototype.values,$jscomp.Set$install=function(){})};
$jscomp.string=$jscomp.string||{};$jscomp.checkStringArgs=function(a,b,c){if(null==a)throw new TypeError("The 'this' value for String.prototype."+c+" must not be null or undefined");if(b instanceof RegExp)throw new TypeError("First argument to String.prototype."+c+" must not be a regular expression");return a+""};
$jscomp.string.fromCodePoint=function(a){for(var b="",c=0;c<arguments.length;c++){var d=Number(arguments[c]);if(0>d||1114111<d||d!==Math.floor(d))throw new RangeError("invalid_code_point "+d);65535>=d?b+=String.fromCharCode(d):(d-=65536,b+=String.fromCharCode(d>>>10&1023|55296),b+=String.fromCharCode(d&1023|56320))}return b};
$jscomp.string.repeat=function(a){var b=$jscomp.checkStringArgs(this,null,"repeat");if(0>a||1342177279<a)throw new RangeError("Invalid count value");a|=0;for(var c="";a;)if(a&1&&(c+=b),a>>>=1)b+=b;return c};$jscomp.string.repeat$install=function(){String.prototype.repeat||(String.prototype.repeat=$jscomp.string.repeat)};
$jscomp.string.codePointAt=function(a){var b=$jscomp.checkStringArgs(this,null,"codePointAt"),c=b.length;a=Number(a)||0;if(0<=a&&a<c){a|=0;var d=b.charCodeAt(a);if(55296>d||56319<d||a+1===c)return d;a=b.charCodeAt(a+1);return 56320>a||57343<a?d:1024*(d-55296)+a+9216}};$jscomp.string.codePointAt$install=function(){String.prototype.codePointAt||(String.prototype.codePointAt=$jscomp.string.codePointAt)};
$jscomp.string.includes=function(a,b){return-1!==$jscomp.checkStringArgs(this,a,"includes").indexOf(a,b||0)};$jscomp.string.includes$install=function(){String.prototype.includes||(String.prototype.includes=$jscomp.string.includes)};$jscomp.string.startsWith=function(a,b){var c=$jscomp.checkStringArgs(this,a,"startsWith");a+="";for(var d=c.length,e=a.length,f=Math.max(0,Math.min(b|0,c.length)),g=0;g<e&&f<d;)if(c[f++]!=a[g++])return!1;return g>=e};
$jscomp.string.startsWith$install=function(){String.prototype.startsWith||(String.prototype.startsWith=$jscomp.string.startsWith)};$jscomp.string.endsWith=function(a,b){var c=$jscomp.checkStringArgs(this,a,"endsWith");a+="";void 0===b&&(b=c.length);for(var d=Math.max(0,Math.min(b|0,c.length)),e=a.length;0<e&&0<d;)if(c[--d]!=a[--e])return!1;return 0>=e};$jscomp.string.endsWith$install=function(){String.prototype.endsWith||(String.prototype.endsWith=$jscomp.string.endsWith)};
var COMPILED=!0,goog=goog||{};goog.global=this;goog.isDef=function(a){return void 0!==a};goog.exportPath_=function(a,b,c){a=a.split(".");c=c||goog.global;a[0]in c||!c.execScript||c.execScript("var "+a[0]);for(var d;a.length&&(d=a.shift());)!a.length&&goog.isDef(b)?c[d]=b:c=c[d]?c[d]:c[d]={}};
goog.define=function(a,b){var c=b;COMPILED||(goog.global.CLOSURE_UNCOMPILED_DEFINES&&Object.prototype.hasOwnProperty.call(goog.global.CLOSURE_UNCOMPILED_DEFINES,a)?c=goog.global.CLOSURE_UNCOMPILED_DEFINES[a]:goog.global.CLOSURE_DEFINES&&Object.prototype.hasOwnProperty.call(goog.global.CLOSURE_DEFINES,a)&&(c=goog.global.CLOSURE_DEFINES[a]));goog.exportPath_(a,c)};goog.DEBUG=!0;goog.LOCALE="en";goog.TRUSTED_SITE=!0;goog.STRICT_MODE_COMPATIBLE=!1;goog.DISALLOW_TEST_ONLY_CODE=COMPILED&&!goog.DEBUG;
goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING=!1;goog.provide=function(a){if(!COMPILED&&goog.isProvided_(a))throw Error('Namespace "'+a+'" already declared.');goog.constructNamespace_(a)};goog.constructNamespace_=function(a,b){if(!COMPILED){delete goog.implicitNamespaces_[a];for(var c=a;(c=c.substring(0,c.lastIndexOf(".")))&&!goog.getObjectByName(c);)goog.implicitNamespaces_[c]=!0}goog.exportPath_(a,b)};goog.VALID_MODULE_RE_=/^[a-zA-Z_$][a-zA-Z0-9._$]*$/;
goog.module=function(a){if(!goog.isString(a)||!a||-1==a.search(goog.VALID_MODULE_RE_))throw Error("Invalid module identifier");if(!goog.isInModuleLoader_())throw Error("Module "+a+" has been loaded incorrectly.");if(goog.moduleLoaderState_.moduleName)throw Error("goog.module may only be called once per module.");goog.moduleLoaderState_.moduleName=a;if(!COMPILED){if(goog.isProvided_(a))throw Error('Namespace "'+a+'" already declared.');delete goog.implicitNamespaces_[a]}};goog.module.get=function(a){return goog.module.getInternal_(a)};
goog.module.getInternal_=function(a){if(!COMPILED)return goog.isProvided_(a)?a in goog.loadedModules_?goog.loadedModules_[a]:goog.getObjectByName(a):null};goog.moduleLoaderState_=null;goog.isInModuleLoader_=function(){return null!=goog.moduleLoaderState_};
goog.module.declareLegacyNamespace=function(){if(!COMPILED&&!goog.isInModuleLoader_())throw Error("goog.module.declareLegacyNamespace must be called from within a goog.module");if(!COMPILED&&!goog.moduleLoaderState_.moduleName)throw Error("goog.module must be called prior to goog.module.declareLegacyNamespace.");goog.moduleLoaderState_.declareLegacyNamespace=!0};
goog.setTestOnly=function(a){if(goog.DISALLOW_TEST_ONLY_CODE)throw a=a||"",Error("Importing test-only code into non-debug environment"+(a?": "+a:"."));};goog.forwardDeclare=function(a){};COMPILED||(goog.isProvided_=function(a){return a in goog.loadedModules_||!goog.implicitNamespaces_[a]&&goog.isDefAndNotNull(goog.getObjectByName(a))},goog.implicitNamespaces_={"goog.module":!0});
goog.getObjectByName=function(a,b){for(var c=a.split("."),d=b||goog.global,e;e=c.shift();)if(goog.isDefAndNotNull(d[e]))d=d[e];else return null;return d};goog.globalize=function(a,b){var c=b||goog.global,d;for(d in a)c[d]=a[d]};goog.addDependency=function(a,b,c,d){if(goog.DEPENDENCIES_ENABLED){var e;a=a.replace(/\\/g,"/");for(var f=goog.dependencies_,g=0;e=b[g];g++)f.nameToPath[e]=a,f.pathIsModule[a]=!!d;for(d=0;b=c[d];d++)a in f.requires||(f.requires[a]={}),f.requires[a][b]=!0}};
goog.ENABLE_DEBUG_LOADER=!0;goog.logToConsole_=function(a){goog.global.console&&goog.global.console.error(a)};goog.require=function(a){if(!COMPILED){goog.ENABLE_DEBUG_LOADER&&goog.IS_OLD_IE_&&goog.maybeProcessDeferredDep_(a);if(goog.isProvided_(a))return goog.isInModuleLoader_()?goog.module.getInternal_(a):null;if(goog.ENABLE_DEBUG_LOADER){var b=goog.getPathFromDeps_(a);if(b)return goog.writeScripts_(b),null}a="goog.require could not find: "+a;goog.logToConsole_(a);throw Error(a);}};
goog.basePath="";goog.nullFunction=function(){};goog.abstractMethod=function(){throw Error("unimplemented abstract method");};goog.addSingletonGetter=function(a){a.getInstance=function(){if(a.instance_)return a.instance_;goog.DEBUG&&(goog.instantiatedSingletons_[goog.instantiatedSingletons_.length]=a);return a.instance_=new a}};goog.instantiatedSingletons_=[];goog.LOAD_MODULE_USING_EVAL=!0;goog.SEAL_MODULE_EXPORTS=goog.DEBUG;goog.loadedModules_={};goog.DEPENDENCIES_ENABLED=!COMPILED&&goog.ENABLE_DEBUG_LOADER;
goog.DEPENDENCIES_ENABLED&&(goog.dependencies_={pathIsModule:{},nameToPath:{},requires:{},visited:{},written:{},deferred:{}},goog.inHtmlDocument_=function(){var a=goog.global.document;return null!=a&&"write"in a},goog.findBasePath_=function(){if(goog.isDef(goog.global.CLOSURE_BASE_PATH))goog.basePath=goog.global.CLOSURE_BASE_PATH;else if(goog.inHtmlDocument_())for(var a=goog.global.document.getElementsByTagName("SCRIPT"),b=a.length-1;0<=b;--b){var c=a[b].src,d=c.lastIndexOf("?"),d=-1==d?c.length:
d;if("base.js"==c.substr(d-7,7)){goog.basePath=c.substr(0,d-7);break}}},goog.importScript_=function(a,b){(goog.global.CLOSURE_IMPORT_SCRIPT||goog.writeScriptTag_)(a,b)&&(goog.dependencies_.written[a]=!0)},goog.IS_OLD_IE_=!(goog.global.atob||!goog.global.document||!goog.global.document.all),goog.importModule_=function(a){goog.importScript_("",'goog.retrieveAndExecModule_("'+a+'");')&&(goog.dependencies_.written[a]=!0)},goog.queuedModules_=[],goog.wrapModule_=function(a,b){return goog.LOAD_MODULE_USING_EVAL&&
goog.isDef(goog.global.JSON)?"goog.loadModule("+goog.global.JSON.stringify(b+"\n//# sourceURL="+a+"\n")+");":'goog.loadModule(function(exports) {"use strict";'+b+"\n;return exports});\n//# sourceURL="+a+"\n"},goog.loadQueuedModules_=function(){var a=goog.queuedModules_.length;if(0<a){var b=goog.queuedModules_;goog.queuedModules_=[];for(var c=0;c<a;c++)goog.maybeProcessDeferredPath_(b[c])}},goog.maybeProcessDeferredDep_=function(a){goog.isDeferredModule_(a)&&goog.allDepsAreAvailable_(a)&&(a=goog.getPathFromDeps_(a),
goog.maybeProcessDeferredPath_(goog.basePath+a))},goog.isDeferredModule_=function(a){return(a=goog.getPathFromDeps_(a))&&goog.dependencies_.pathIsModule[a]?goog.basePath+a in goog.dependencies_.deferred:!1},goog.allDepsAreAvailable_=function(a){if((a=goog.getPathFromDeps_(a))&&a in goog.dependencies_.requires)for(var b in goog.dependencies_.requires[a])if(!goog.isProvided_(b)&&!goog.isDeferredModule_(b))return!1;return!0},goog.maybeProcessDeferredPath_=function(a){if(a in goog.dependencies_.deferred){var b=
goog.dependencies_.deferred[a];delete goog.dependencies_.deferred[a];goog.globalEval(b)}},goog.loadModuleFromUrl=function(a){goog.retrieveAndExecModule_(a)},goog.loadModule=function(a){var b=goog.moduleLoaderState_;try{goog.moduleLoaderState_={moduleName:void 0,declareLegacyNamespace:!1};var c;if(goog.isFunction(a))c=a.call(goog.global,{});else if(goog.isString(a))c=goog.loadModuleFromSource_.call(goog.global,a);else throw Error("Invalid module definition");var d=goog.moduleLoaderState_.moduleName;
if(!goog.isString(d)||!d)throw Error('Invalid module name "'+d+'"');goog.moduleLoaderState_.declareLegacyNamespace?goog.constructNamespace_(d,c):goog.SEAL_MODULE_EXPORTS&&Object.seal&&Object.seal(c);goog.loadedModules_[d]=c}finally{goog.moduleLoaderState_=b}},goog.loadModuleFromSource_=function(a){eval(a);return{}},goog.writeScriptSrcNode_=function(a){goog.global.document.write('<script type="text/javascript" src="'+a+'">\x3c/script>')},goog.appendScriptSrcNode_=function(a){var b=goog.global.document,
c=b.createElement("script");c.type="text/javascript";c.src=a;c.defer=!1;c.async=!1;b.head.appendChild(c)},goog.writeScriptTag_=function(a,b){if(goog.inHtmlDocument_()){var c=goog.global.document;if(!goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING&&"complete"==c.readyState){if(/\bdeps.js$/.test(a))return!1;throw Error('Cannot write "'+a+'" after document load');}var d=goog.IS_OLD_IE_;void 0===b?d?(d=" onreadystatechange='goog.onScriptLoad_(this, "+ ++goog.lastNonModuleScriptIndex_+")' ",c.write('<script type="text/javascript" src="'+
a+'"'+d+">\x3c/script>")):goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING?goog.appendScriptSrcNode_(a):goog.writeScriptSrcNode_(a):c.write('<script type="text/javascript">'+b+"\x3c/script>");return!0}return!1},goog.lastNonModuleScriptIndex_=0,goog.onScriptLoad_=function(a,b){"complete"==a.readyState&&goog.lastNonModuleScriptIndex_==b&&goog.loadQueuedModules_();return!0},goog.writeScripts_=function(a){function b(a){if(!(a in e.written||a in e.visited)){e.visited[a]=!0;if(a in e.requires)for(var f in e.requires[a])if(!goog.isProvided_(f))if(f in
e.nameToPath)b(e.nameToPath[f]);else throw Error("Undefined nameToPath for "+f);a in d||(d[a]=!0,c.push(a))}}var c=[],d={},e=goog.dependencies_;b(a);for(a=0;a<c.length;a++){var f=c[a];goog.dependencies_.written[f]=!0}var g=goog.moduleLoaderState_;goog.moduleLoaderState_=null;for(a=0;a<c.length;a++)if(f=c[a])e.pathIsModule[f]?goog.importModule_(goog.basePath+f):goog.importScript_(goog.basePath+f);else throw goog.moduleLoaderState_=g,Error("Undefined script input");goog.moduleLoaderState_=g},goog.getPathFromDeps_=
function(a){return a in goog.dependencies_.nameToPath?goog.dependencies_.nameToPath[a]:null},goog.findBasePath_(),goog.global.CLOSURE_NO_DEPS||goog.importScript_(goog.basePath+"deps.js"));goog.normalizePath_=function(a){a=a.split("/");for(var b=0;b<a.length;)"."==a[b]?a.splice(b,1):b&&".."==a[b]&&a[b-1]&&".."!=a[b-1]?a.splice(--b,2):b++;return a.join("/")};
goog.loadFileSync_=function(a){if(goog.global.CLOSURE_LOAD_FILE_SYNC)return goog.global.CLOSURE_LOAD_FILE_SYNC(a);var b=new goog.global.XMLHttpRequest;b.open("get",a,!1);b.send();return b.responseText};
goog.retrieveAndExecModule_=function(a){if(!COMPILED){var b=a;a=goog.normalizePath_(a);var c=goog.global.CLOSURE_IMPORT_SCRIPT||goog.writeScriptTag_,d=goog.loadFileSync_(a);if(null!=d)d=goog.wrapModule_(a,d),goog.IS_OLD_IE_?(goog.dependencies_.deferred[b]=d,goog.queuedModules_.push(b)):c(a,d);else throw Error("load of "+a+"failed");}};
goog.typeOf=function(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b};goog.isNull=function(a){return null===a};goog.isDefAndNotNull=function(a){return null!=a};goog.isArray=function(a){return"array"==goog.typeOf(a)};goog.isArrayLike=function(a){var b=goog.typeOf(a);return"array"==b||"object"==b&&"number"==typeof a.length};goog.isDateLike=function(a){return goog.isObject(a)&&"function"==typeof a.getFullYear};goog.isString=function(a){return"string"==typeof a};
goog.isBoolean=function(a){return"boolean"==typeof a};goog.isNumber=function(a){return"number"==typeof a};goog.isFunction=function(a){return"function"==goog.typeOf(a)};goog.isObject=function(a){var b=typeof a;return"object"==b&&null!=a||"function"==b};goog.getUid=function(a){return a[goog.UID_PROPERTY_]||(a[goog.UID_PROPERTY_]=++goog.uidCounter_)};goog.hasUid=function(a){return!!a[goog.UID_PROPERTY_]};
goog.removeUid=function(a){null!==a&&"removeAttribute"in a&&a.removeAttribute(goog.UID_PROPERTY_);try{delete a[goog.UID_PROPERTY_]}catch(b){}};goog.UID_PROPERTY_="closure_uid_"+(1E9*Math.random()>>>0);goog.uidCounter_=0;goog.getHashCode=goog.getUid;goog.removeHashCode=goog.removeUid;goog.cloneObject=function(a){var b=goog.typeOf(a);if("object"==b||"array"==b){if(a.clone)return a.clone();var b="array"==b?[]:{},c;for(c in a)b[c]=goog.cloneObject(a[c]);return b}return a};
goog.bindNative_=function(a,b,c){return a.call.apply(a.bind,arguments)};goog.bindJs_=function(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}};
goog.bind=function(a,b,c){Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?goog.bind=goog.bindNative_:goog.bind=goog.bindJs_;return goog.bind.apply(null,arguments)};goog.partial=function(a,b){var c=Array.prototype.slice.call(arguments,1);return function(){var b=c.slice();b.push.apply(b,arguments);return a.apply(this,b)}};goog.mixin=function(a,b){for(var c in b)a[c]=b[c]};goog.now=goog.TRUSTED_SITE&&Date.now||function(){return+new Date};
goog.globalEval=function(a){if(goog.global.execScript)goog.global.execScript(a,"JavaScript");else if(goog.global.eval){if(null==goog.evalWorksForGlobals_)if(goog.global.eval("var _evalTest_ = 1;"),"undefined"!=typeof goog.global._evalTest_){try{delete goog.global._evalTest_}catch(d){}goog.evalWorksForGlobals_=!0}else goog.evalWorksForGlobals_=!1;if(goog.evalWorksForGlobals_)goog.global.eval(a);else{var b=goog.global.document,c=b.createElement("SCRIPT");c.type="text/javascript";c.defer=!1;c.appendChild(b.createTextNode(a));
b.body.appendChild(c);b.body.removeChild(c)}}else throw Error("goog.globalEval not available");};goog.evalWorksForGlobals_=null;goog.getCssName=function(a,b){var c=function(a){return goog.cssNameMapping_[a]||a},d=function(a){a=a.split("-");for(var b=[],d=0;d<a.length;d++)b.push(c(a[d]));return b.join("-")},d=goog.cssNameMapping_?"BY_WHOLE"==goog.cssNameMappingStyle_?c:d:function(a){return a};return b?a+"-"+d(b):d(a)};
goog.setCssNameMapping=function(a,b){goog.cssNameMapping_=a;goog.cssNameMappingStyle_=b};!COMPILED&&goog.global.CLOSURE_CSS_NAME_MAPPING&&(goog.cssNameMapping_=goog.global.CLOSURE_CSS_NAME_MAPPING);goog.getMsg=function(a,b){b&&(a=a.replace(/\{\$([^}]+)}/g,function(a,d){return null!=b&&d in b?b[d]:a}));return a};goog.getMsgWithFallback=function(a,b){return a};goog.exportSymbol=function(a,b,c){goog.exportPath_(a,b,c)};goog.exportProperty=function(a,b,c){a[b]=c};
goog.inherits=function(a,b){function c(){}c.prototype=b.prototype;a.superClass_=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.base=function(a,c,f){for(var g=Array(arguments.length-2),h=2;h<arguments.length;h++)g[h-2]=arguments[h];return b.prototype[c].apply(a,g)}};
goog.base=function(a,b,c){var d=arguments.callee.caller;if(goog.STRICT_MODE_COMPATIBLE||goog.DEBUG&&!d)throw Error("arguments.caller not defined.  goog.base() cannot be used with strict mode code. See http://www.ecma-international.org/ecma-262/5.1/#sec-C");if(d.superClass_){for(var e=Array(arguments.length-1),f=1;f<arguments.length;f++)e[f-1]=arguments[f];return d.superClass_.constructor.apply(a,e)}e=Array(arguments.length-2);for(f=2;f<arguments.length;f++)e[f-2]=arguments[f];for(var f=!1,g=a.constructor;g;g=
g.superClass_&&g.superClass_.constructor)if(g.prototype[b]===d)f=!0;else if(f)return g.prototype[b].apply(a,e);if(a[b]===d)return a.constructor.prototype[b].apply(a,e);throw Error("goog.base called from a method of one name to a method of a different name");};goog.scope=function(a){a.call(goog.global)};COMPILED||(goog.global.COMPILED=COMPILED);
goog.defineClass=function(a,b){var c=b.constructor,d=b.statics;c&&c!=Object.prototype.constructor||(c=function(){throw Error("cannot instantiate an interface (no constructor defined).");});c=goog.defineClass.createSealingConstructor_(c,a);a&&goog.inherits(c,a);delete b.constructor;delete b.statics;goog.defineClass.applyProperties_(c.prototype,b);null!=d&&(d instanceof Function?d(c):goog.defineClass.applyProperties_(c,d));return c};goog.defineClass.SEAL_CLASS_INSTANCES=goog.DEBUG;
goog.defineClass.createSealingConstructor_=function(a,b){if(goog.defineClass.SEAL_CLASS_INSTANCES&&Object.seal instanceof Function){if(b&&b.prototype&&b.prototype[goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_])return a;var c=function(){var b=a.apply(this,arguments)||this;b[goog.UID_PROPERTY_]=b[goog.UID_PROPERTY_];this.constructor===c&&Object.seal(b);return b};return c}return a};goog.defineClass.OBJECT_PROTOTYPE_FIELDS_="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
goog.defineClass.applyProperties_=function(a,b){for(var c in b)Object.prototype.hasOwnProperty.call(b,c)&&(a[c]=b[c]);for(var d=0;d<goog.defineClass.OBJECT_PROTOTYPE_FIELDS_.length;d++)c=goog.defineClass.OBJECT_PROTOTYPE_FIELDS_[d],Object.prototype.hasOwnProperty.call(b,c)&&(a[c]=b[c])};goog.tagUnsealableClass=function(a){!COMPILED&&goog.defineClass.SEAL_CLASS_INSTANCES&&(a.prototype[goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_]=!0)};goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_="goog_defineClass_legacy_unsealable";goog.debug={};goog.debug.Error=function(a){if(Error.captureStackTrace)Error.captureStackTrace(this,goog.debug.Error);else{var b=Error().stack;b&&(this.stack=b)}a&&(this.message=String(a));this.reportErrorToServer=!0};goog.inherits(goog.debug.Error,Error);goog.debug.Error.prototype.name="CustomError";goog.dom={};goog.dom.NodeType={ELEMENT:1,ATTRIBUTE:2,TEXT:3,CDATA_SECTION:4,ENTITY_REFERENCE:5,ENTITY:6,PROCESSING_INSTRUCTION:7,COMMENT:8,DOCUMENT:9,DOCUMENT_TYPE:10,DOCUMENT_FRAGMENT:11,NOTATION:12};goog.string={};goog.string.DETECT_DOUBLE_ESCAPING=!1;goog.string.FORCE_NON_DOM_HTML_UNESCAPING=!1;goog.string.Unicode={NBSP:"\u00a0"};goog.string.startsWith=function(a,b){return 0==a.lastIndexOf(b,0)};goog.string.endsWith=function(a,b){var c=a.length-b.length;return 0<=c&&a.indexOf(b,c)==c};goog.string.caseInsensitiveStartsWith=function(a,b){return 0==goog.string.caseInsensitiveCompare(b,a.substr(0,b.length))};
goog.string.caseInsensitiveEndsWith=function(a,b){return 0==goog.string.caseInsensitiveCompare(b,a.substr(a.length-b.length,b.length))};goog.string.caseInsensitiveEquals=function(a,b){return a.toLowerCase()==b.toLowerCase()};goog.string.subs=function(a,b){for(var c=a.split("%s"),d="",e=Array.prototype.slice.call(arguments,1);e.length&&1<c.length;)d+=c.shift()+e.shift();return d+c.join("%s")};goog.string.collapseWhitespace=function(a){return a.replace(/[\s\xa0]+/g," ").replace(/^\s+|\s+$/g,"")};
goog.string.isEmptyOrWhitespace=function(a){return/^[\s\xa0]*$/.test(a)};goog.string.isEmptyString=function(a){return 0==a.length};goog.string.isEmpty=goog.string.isEmptyOrWhitespace;goog.string.isEmptyOrWhitespaceSafe=function(a){return goog.string.isEmptyOrWhitespace(goog.string.makeSafe(a))};goog.string.isEmptySafe=goog.string.isEmptyOrWhitespaceSafe;goog.string.isBreakingWhitespace=function(a){return!/[^\t\n\r ]/.test(a)};goog.string.isAlpha=function(a){return!/[^a-zA-Z]/.test(a)};
goog.string.isNumeric=function(a){return!/[^0-9]/.test(a)};goog.string.isAlphaNumeric=function(a){return!/[^a-zA-Z0-9]/.test(a)};goog.string.isSpace=function(a){return" "==a};goog.string.isUnicodeChar=function(a){return 1==a.length&&" "<=a&&"~">=a||"\u0080"<=a&&"\ufffd">=a};goog.string.stripNewlines=function(a){return a.replace(/(\r\n|\r|\n)+/g," ")};goog.string.canonicalizeNewlines=function(a){return a.replace(/(\r\n|\r|\n)/g,"\n")};
goog.string.normalizeWhitespace=function(a){return a.replace(/\xa0|\s/g," ")};goog.string.normalizeSpaces=function(a){return a.replace(/\xa0|[ \t]+/g," ")};goog.string.collapseBreakingSpaces=function(a){return a.replace(/[\t\r\n ]+/g," ").replace(/^[\t\r\n ]+|[\t\r\n ]+$/g,"")};goog.string.trim=goog.TRUSTED_SITE&&String.prototype.trim?function(a){return a.trim()}:function(a){return a.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")};goog.string.trimLeft=function(a){return a.replace(/^[\s\xa0]+/,"")};
goog.string.trimRight=function(a){return a.replace(/[\s\xa0]+$/,"")};goog.string.caseInsensitiveCompare=function(a,b){var c=String(a).toLowerCase(),d=String(b).toLowerCase();return c<d?-1:c==d?0:1};
goog.string.numberAwareCompare_=function(a,b,c){if(a==b)return 0;if(!a)return-1;if(!b)return 1;for(var d=a.toLowerCase().match(c),e=b.toLowerCase().match(c),f=Math.min(d.length,e.length),g=0;g<f;g++){c=d[g];var h=e[g];if(c!=h)return a=parseInt(c,10),!isNaN(a)&&(b=parseInt(h,10),!isNaN(b)&&a-b)?a-b:c<h?-1:1}return d.length!=e.length?d.length-e.length:a<b?-1:1};goog.string.intAwareCompare=function(a,b){return goog.string.numberAwareCompare_(a,b,/\d+|\D+/g)};
goog.string.floatAwareCompare=function(a,b){return goog.string.numberAwareCompare_(a,b,/\d+|\.\d+|\D+/g)};goog.string.numerateCompare=goog.string.floatAwareCompare;goog.string.urlEncode=function(a){return encodeURIComponent(String(a))};goog.string.urlDecode=function(a){return decodeURIComponent(a.replace(/\+/g," "))};goog.string.newLineToBr=function(a,b){return a.replace(/(\r\n|\r|\n)/g,b?"<br />":"<br>")};
goog.string.htmlEscape=function(a,b){if(b)a=a.replace(goog.string.AMP_RE_,"&amp;").replace(goog.string.LT_RE_,"&lt;").replace(goog.string.GT_RE_,"&gt;").replace(goog.string.QUOT_RE_,"&quot;").replace(goog.string.SINGLE_QUOTE_RE_,"&#39;").replace(goog.string.NULL_RE_,"&#0;"),goog.string.DETECT_DOUBLE_ESCAPING&&(a=a.replace(goog.string.E_RE_,"&#101;"));else{if(!goog.string.ALL_RE_.test(a))return a;-1!=a.indexOf("&")&&(a=a.replace(goog.string.AMP_RE_,"&amp;"));-1!=a.indexOf("<")&&(a=a.replace(goog.string.LT_RE_,
"&lt;"));-1!=a.indexOf(">")&&(a=a.replace(goog.string.GT_RE_,"&gt;"));-1!=a.indexOf('"')&&(a=a.replace(goog.string.QUOT_RE_,"&quot;"));-1!=a.indexOf("'")&&(a=a.replace(goog.string.SINGLE_QUOTE_RE_,"&#39;"));-1!=a.indexOf("\x00")&&(a=a.replace(goog.string.NULL_RE_,"&#0;"));goog.string.DETECT_DOUBLE_ESCAPING&&-1!=a.indexOf("e")&&(a=a.replace(goog.string.E_RE_,"&#101;"))}return a};goog.string.AMP_RE_=/&/g;goog.string.LT_RE_=/</g;goog.string.GT_RE_=/>/g;goog.string.QUOT_RE_=/"/g;
goog.string.SINGLE_QUOTE_RE_=/'/g;goog.string.NULL_RE_=/\x00/g;goog.string.E_RE_=/e/g;goog.string.ALL_RE_=goog.string.DETECT_DOUBLE_ESCAPING?/[\x00&<>"'e]/:/[\x00&<>"']/;goog.string.unescapeEntities=function(a){return goog.string.contains(a,"&")?!goog.string.FORCE_NON_DOM_HTML_UNESCAPING&&"document"in goog.global?goog.string.unescapeEntitiesUsingDom_(a):goog.string.unescapePureXmlEntities_(a):a};
goog.string.unescapeEntitiesWithDocument=function(a,b){return goog.string.contains(a,"&")?goog.string.unescapeEntitiesUsingDom_(a,b):a};
goog.string.unescapeEntitiesUsingDom_=function(a,b){var c={"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"'},d;d=b?b.createElement("div"):goog.global.document.createElement("div");return a.replace(goog.string.HTML_ENTITY_PATTERN_,function(a,b){var g=c[a];if(g)return g;if("#"==b.charAt(0)){var h=Number("0"+b.substr(1));isNaN(h)||(g=String.fromCharCode(h))}g||(d.innerHTML=a+" ",g=d.firstChild.nodeValue.slice(0,-1));return c[a]=g})};
goog.string.unescapePureXmlEntities_=function(a){return a.replace(/&([^;]+);/g,function(a,c){switch(c){case "amp":return"&";case "lt":return"<";case "gt":return">";case "quot":return'"';default:if("#"==c.charAt(0)){var d=Number("0"+c.substr(1));if(!isNaN(d))return String.fromCharCode(d)}return a}})};goog.string.HTML_ENTITY_PATTERN_=/&([^;\s<&]+);?/g;goog.string.whitespaceEscape=function(a,b){return goog.string.newLineToBr(a.replace(/  /g," &#160;"),b)};
goog.string.preserveSpaces=function(a){return a.replace(/(^|[\n ]) /g,"$1"+goog.string.Unicode.NBSP)};goog.string.stripQuotes=function(a,b){for(var c=b.length,d=0;d<c;d++){var e=1==c?b:b.charAt(d);if(a.charAt(0)==e&&a.charAt(a.length-1)==e)return a.substring(1,a.length-1)}return a};goog.string.truncate=function(a,b,c){c&&(a=goog.string.unescapeEntities(a));a.length>b&&(a=a.substring(0,b-3)+"...");c&&(a=goog.string.htmlEscape(a));return a};
goog.string.truncateMiddle=function(a,b,c,d){c&&(a=goog.string.unescapeEntities(a));if(d&&a.length>b){d>b&&(d=b);var e=a.length-d;a=a.substring(0,b-d)+"..."+a.substring(e)}else a.length>b&&(d=Math.floor(b/2),e=a.length-d,a=a.substring(0,d+b%2)+"..."+a.substring(e));c&&(a=goog.string.htmlEscape(a));return a};goog.string.specialEscapeChars_={"\x00":"\\0","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t","\x0B":"\\x0B",'"':'\\"',"\\":"\\\\","<":"<"};goog.string.jsEscapeCache_={"'":"\\'"};
goog.string.quote=function(a){a=String(a);for(var b=['"'],c=0;c<a.length;c++){var d=a.charAt(c),e=d.charCodeAt(0);b[c+1]=goog.string.specialEscapeChars_[d]||(31<e&&127>e?d:goog.string.escapeChar(d))}b.push('"');return b.join("")};goog.string.escapeString=function(a){for(var b=[],c=0;c<a.length;c++)b[c]=goog.string.escapeChar(a.charAt(c));return b.join("")};
goog.string.escapeChar=function(a){if(a in goog.string.jsEscapeCache_)return goog.string.jsEscapeCache_[a];if(a in goog.string.specialEscapeChars_)return goog.string.jsEscapeCache_[a]=goog.string.specialEscapeChars_[a];var b,c=a.charCodeAt(0);if(31<c&&127>c)b=a;else{if(256>c){if(b="\\x",16>c||256<c)b+="0"}else b="\\u",4096>c&&(b+="0");b+=c.toString(16).toUpperCase()}return goog.string.jsEscapeCache_[a]=b};goog.string.contains=function(a,b){return-1!=a.indexOf(b)};
goog.string.caseInsensitiveContains=function(a,b){return goog.string.contains(a.toLowerCase(),b.toLowerCase())};goog.string.countOf=function(a,b){return a&&b?a.split(b).length-1:0};goog.string.removeAt=function(a,b,c){var d=a;0<=b&&b<a.length&&0<c&&(d=a.substr(0,b)+a.substr(b+c,a.length-b-c));return d};goog.string.remove=function(a,b){var c=new RegExp(goog.string.regExpEscape(b),"");return a.replace(c,"")};
goog.string.removeAll=function(a,b){var c=new RegExp(goog.string.regExpEscape(b),"g");return a.replace(c,"")};goog.string.regExpEscape=function(a){return String(a).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g,"\\$1").replace(/\x08/g,"\\x08")};goog.string.repeat=String.prototype.repeat?function(a,b){return a.repeat(b)}:function(a,b){return Array(b+1).join(a)};
goog.string.padNumber=function(a,b,c){a=goog.isDef(c)?a.toFixed(c):String(a);c=a.indexOf(".");-1==c&&(c=a.length);return goog.string.repeat("0",Math.max(0,b-c))+a};goog.string.makeSafe=function(a){return null==a?"":String(a)};goog.string.buildString=function(a){return Array.prototype.join.call(arguments,"")};goog.string.getRandomString=function(){return Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^goog.now()).toString(36)};
goog.string.compareVersions=function(a,b){for(var c=0,d=goog.string.trim(String(a)).split("."),e=goog.string.trim(String(b)).split("."),f=Math.max(d.length,e.length),g=0;0==c&&g<f;g++){var h=d[g]||"",k=e[g]||"",l=RegExp("(\\d*)(\\D*)","g"),p=RegExp("(\\d*)(\\D*)","g");do{var m=l.exec(h)||["","",""],n=p.exec(k)||["","",""];if(0==m[0].length&&0==n[0].length)break;var c=0==m[1].length?0:parseInt(m[1],10),q=0==n[1].length?0:parseInt(n[1],10),c=goog.string.compareElements_(c,q)||goog.string.compareElements_(0==
m[2].length,0==n[2].length)||goog.string.compareElements_(m[2],n[2])}while(0==c)}return c};goog.string.compareElements_=function(a,b){return a<b?-1:a>b?1:0};goog.string.hashCode=function(a){for(var b=0,c=0;c<a.length;++c)b=31*b+a.charCodeAt(c)>>>0;return b};goog.string.uniqueStringCounter_=2147483648*Math.random()|0;goog.string.createUniqueString=function(){return"goog_"+goog.string.uniqueStringCounter_++};
goog.string.toNumber=function(a){var b=Number(a);return 0==b&&goog.string.isEmptyOrWhitespace(a)?NaN:b};goog.string.isLowerCamelCase=function(a){return/^[a-z]+([A-Z][a-z]*)*$/.test(a)};goog.string.isUpperCamelCase=function(a){return/^([A-Z][a-z]*)+$/.test(a)};goog.string.toCamelCase=function(a){return String(a).replace(/\-([a-z])/g,function(a,c){return c.toUpperCase()})};goog.string.toSelectorCase=function(a){return String(a).replace(/([A-Z])/g,"-$1").toLowerCase()};
goog.string.toTitleCase=function(a,b){var c=goog.isString(b)?goog.string.regExpEscape(b):"\\s";return a.replace(new RegExp("(^"+(c?"|["+c+"]+":"")+")([a-z])","g"),function(a,b,c){return b+c.toUpperCase()})};goog.string.capitalize=function(a){return String(a.charAt(0)).toUpperCase()+String(a.substr(1)).toLowerCase()};goog.string.parseInt=function(a){isFinite(a)&&(a=String(a));return goog.isString(a)?/^\s*-?0x/i.test(a)?parseInt(a,16):parseInt(a,10):NaN};
goog.string.splitLimit=function(a,b,c){a=a.split(b);for(var d=[];0<c&&a.length;)d.push(a.shift()),c--;a.length&&d.push(a.join(b));return d};goog.string.editDistance=function(a,b){var c=[],d=[];if(a==b)return 0;if(!a.length||!b.length)return Math.max(a.length,b.length);for(var e=0;e<b.length+1;e++)c[e]=e;for(e=0;e<a.length;e++){d[0]=e+1;for(var f=0;f<b.length;f++)d[f+1]=Math.min(d[f]+1,c[f+1]+1,c[f]+Number(a[e]!=b[f]));for(f=0;f<c.length;f++)c[f]=d[f]}return d[b.length]};goog.asserts={};goog.asserts.ENABLE_ASSERTS=goog.DEBUG;goog.asserts.AssertionError=function(a,b){b.unshift(a);goog.debug.Error.call(this,goog.string.subs.apply(null,b));b.shift();this.messagePattern=a};goog.inherits(goog.asserts.AssertionError,goog.debug.Error);goog.asserts.AssertionError.prototype.name="AssertionError";goog.asserts.DEFAULT_ERROR_HANDLER=function(a){throw a;};goog.asserts.errorHandler_=goog.asserts.DEFAULT_ERROR_HANDLER;
goog.asserts.doAssertFailure_=function(a,b,c,d){var e="Assertion failed";if(c)var e=e+(": "+c),f=d;else a&&(e+=": "+a,f=b);a=new goog.asserts.AssertionError(""+e,f||[]);goog.asserts.errorHandler_(a)};goog.asserts.setErrorHandler=function(a){goog.asserts.ENABLE_ASSERTS&&(goog.asserts.errorHandler_=a)};goog.asserts.assert=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!a&&goog.asserts.doAssertFailure_("",null,b,Array.prototype.slice.call(arguments,2));return a};
goog.asserts.fail=function(a,b){goog.asserts.ENABLE_ASSERTS&&goog.asserts.errorHandler_(new goog.asserts.AssertionError("Failure"+(a?": "+a:""),Array.prototype.slice.call(arguments,1)))};goog.asserts.assertNumber=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isNumber(a)&&goog.asserts.doAssertFailure_("Expected number but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};
goog.asserts.assertString=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isString(a)&&goog.asserts.doAssertFailure_("Expected string but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};goog.asserts.assertFunction=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isFunction(a)&&goog.asserts.doAssertFailure_("Expected function but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};
goog.asserts.assertObject=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isObject(a)&&goog.asserts.doAssertFailure_("Expected object but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};goog.asserts.assertArray=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isArray(a)&&goog.asserts.doAssertFailure_("Expected array but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};
goog.asserts.assertBoolean=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isBoolean(a)&&goog.asserts.doAssertFailure_("Expected boolean but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};goog.asserts.assertElement=function(a,b,c){!goog.asserts.ENABLE_ASSERTS||goog.isObject(a)&&a.nodeType==goog.dom.NodeType.ELEMENT||goog.asserts.doAssertFailure_("Expected Element but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};
goog.asserts.assertInstanceof=function(a,b,c,d){!goog.asserts.ENABLE_ASSERTS||a instanceof b||goog.asserts.doAssertFailure_("Expected instanceof %s but got %s.",[goog.asserts.getType_(b),goog.asserts.getType_(a)],c,Array.prototype.slice.call(arguments,3));return a};goog.asserts.assertObjectPrototypeIsIntact=function(){for(var a in Object.prototype)goog.asserts.fail(a+" should not be enumerable in Object.prototype.")};
goog.asserts.getType_=function(a){return a instanceof Function?a.displayName||a.name||"unknown type name":a instanceof Object?a.constructor.displayName||a.constructor.name||Object.prototype.toString.call(a):null===a?"null":typeof a};goog.array={};goog.NATIVE_ARRAY_PROTOTYPES=goog.TRUSTED_SITE;goog.array.ASSUME_NATIVE_FUNCTIONS=!1;goog.array.peek=function(a){return a[a.length-1]};goog.array.last=goog.array.peek;
goog.array.indexOf=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.indexOf)?function(a,b,c){goog.asserts.assert(null!=a.length);return Array.prototype.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if(goog.isString(a))return goog.isString(b)&&1==b.length?a.indexOf(b,c):-1;for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1};
goog.array.lastIndexOf=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.lastIndexOf)?function(a,b,c){goog.asserts.assert(null!=a.length);return Array.prototype.lastIndexOf.call(a,b,null==c?a.length-1:c)}:function(a,b,c){c=null==c?a.length-1:c;0>c&&(c=Math.max(0,a.length+c));if(goog.isString(a))return goog.isString(b)&&1==b.length?a.lastIndexOf(b,c):-1;for(;0<=c;c--)if(c in a&&a[c]===b)return c;return-1};
goog.array.forEach=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.forEach)?function(a,b,c){goog.asserts.assert(null!=a.length);Array.prototype.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)};goog.array.forEachRight=function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,d=d-1;0<=d;--d)d in e&&b.call(c,e[d],d,a)};
goog.array.filter=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.filter)?function(a,b,c){goog.asserts.assert(null!=a.length);return Array.prototype.filter.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=[],f=0,g=goog.isString(a)?a.split(""):a,h=0;h<d;h++)if(h in g){var k=g[h];b.call(c,k,h,a)&&(e[f++]=k)}return e};
goog.array.map=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.map)?function(a,b,c){goog.asserts.assert(null!=a.length);return Array.prototype.map.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=Array(d),f=goog.isString(a)?a.split(""):a,g=0;g<d;g++)g in f&&(e[g]=b.call(c,f[g],g,a));return e};
goog.array.reduce=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.reduce)?function(a,b,c,d){goog.asserts.assert(null!=a.length);d&&(b=goog.bind(b,d));return Array.prototype.reduce.call(a,b,c)}:function(a,b,c,d){var e=c;goog.array.forEach(a,function(c,g){e=b.call(d,e,c,g,a)});return e};
goog.array.reduceRight=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.reduceRight)?function(a,b,c,d){goog.asserts.assert(null!=a.length);goog.asserts.assert(null!=b);d&&(b=goog.bind(b,d));return Array.prototype.reduceRight.call(a,b,c)}:function(a,b,c,d){var e=c;goog.array.forEachRight(a,function(c,g){e=b.call(d,e,c,g,a)});return e};
goog.array.some=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.some)?function(a,b,c){goog.asserts.assert(null!=a.length);return Array.prototype.some.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&b.call(c,e[f],f,a))return!0;return!1};
goog.array.every=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.every)?function(a,b,c){goog.asserts.assert(null!=a.length);return Array.prototype.every.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&!b.call(c,e[f],f,a))return!1;return!0};goog.array.count=function(a,b,c){var d=0;goog.array.forEach(a,function(a,f,g){b.call(c,a,f,g)&&++d},c);return d};
goog.array.find=function(a,b,c){b=goog.array.findIndex(a,b,c);return 0>b?null:goog.isString(a)?a.charAt(b):a[b]};goog.array.findIndex=function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&b.call(c,e[f],f,a))return f;return-1};goog.array.findRight=function(a,b,c){b=goog.array.findIndexRight(a,b,c);return 0>b?null:goog.isString(a)?a.charAt(b):a[b]};
goog.array.findIndexRight=function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,d=d-1;0<=d;d--)if(d in e&&b.call(c,e[d],d,a))return d;return-1};goog.array.contains=function(a,b){return 0<=goog.array.indexOf(a,b)};goog.array.isEmpty=function(a){return 0==a.length};goog.array.clear=function(a){if(!goog.isArray(a))for(var b=a.length-1;0<=b;b--)delete a[b];a.length=0};goog.array.insert=function(a,b){goog.array.contains(a,b)||a.push(b)};
goog.array.insertAt=function(a,b,c){goog.array.splice(a,c,0,b)};goog.array.insertArrayAt=function(a,b,c){goog.partial(goog.array.splice,a,c,0).apply(null,b)};goog.array.insertBefore=function(a,b,c){var d;2==arguments.length||0>(d=goog.array.indexOf(a,c))?a.push(b):goog.array.insertAt(a,b,d)};goog.array.remove=function(a,b){var c=goog.array.indexOf(a,b),d;(d=0<=c)&&goog.array.removeAt(a,c);return d};
goog.array.removeAt=function(a,b){goog.asserts.assert(null!=a.length);return 1==Array.prototype.splice.call(a,b,1).length};goog.array.removeIf=function(a,b,c){b=goog.array.findIndex(a,b,c);return 0<=b?(goog.array.removeAt(a,b),!0):!1};goog.array.removeAllIf=function(a,b,c){var d=0;goog.array.forEachRight(a,function(e,f){b.call(c,e,f,a)&&goog.array.removeAt(a,f)&&d++});return d};goog.array.concat=function(a){return Array.prototype.concat.apply(Array.prototype,arguments)};
goog.array.join=function(a){return Array.prototype.concat.apply(Array.prototype,arguments)};goog.array.toArray=function(a){var b=a.length;if(0<b){for(var c=Array(b),d=0;d<b;d++)c[d]=a[d];return c}return[]};goog.array.clone=goog.array.toArray;goog.array.extend=function(a,b){for(var c=1;c<arguments.length;c++){var d=arguments[c];if(goog.isArrayLike(d)){var e=a.length||0,f=d.length||0;a.length=e+f;for(var g=0;g<f;g++)a[e+g]=d[g]}else a.push(d)}};
goog.array.splice=function(a,b,c,d){goog.asserts.assert(null!=a.length);return Array.prototype.splice.apply(a,goog.array.slice(arguments,1))};goog.array.slice=function(a,b,c){goog.asserts.assert(null!=a.length);return 2>=arguments.length?Array.prototype.slice.call(a,b):Array.prototype.slice.call(a,b,c)};
goog.array.removeDuplicates=function(a,b,c){b=b||a;var d=function(a){return goog.isObject(a)?"o"+goog.getUid(a):(typeof a).charAt(0)+a};c=c||d;for(var d={},e=0,f=0;f<a.length;){var g=a[f++],h=c(g);Object.prototype.hasOwnProperty.call(d,h)||(d[h]=!0,b[e++]=g)}b.length=e};goog.array.binarySearch=function(a,b,c){return goog.array.binarySearch_(a,c||goog.array.defaultCompare,!1,b)};goog.array.binarySelect=function(a,b,c){return goog.array.binarySearch_(a,b,!0,void 0,c)};
goog.array.binarySearch_=function(a,b,c,d,e){for(var f=0,g=a.length,h;f<g;){var k=f+g>>1,l;l=c?b.call(e,a[k],k,a):b(d,a[k]);0<l?f=k+1:(g=k,h=!l)}return h?f:~f};goog.array.sort=function(a,b){a.sort(b||goog.array.defaultCompare)};goog.array.stableSort=function(a,b){for(var c=0;c<a.length;c++)a[c]={index:c,value:a[c]};var d=b||goog.array.defaultCompare;goog.array.sort(a,function(a,b){return d(a.value,b.value)||a.index-b.index});for(c=0;c<a.length;c++)a[c]=a[c].value};
goog.array.sortByKey=function(a,b,c){var d=c||goog.array.defaultCompare;goog.array.sort(a,function(a,c){return d(b(a),b(c))})};goog.array.sortObjectsByKey=function(a,b,c){goog.array.sortByKey(a,function(a){return a[b]},c)};goog.array.isSorted=function(a,b,c){b=b||goog.array.defaultCompare;for(var d=1;d<a.length;d++){var e=b(a[d-1],a[d]);if(0<e||0==e&&c)return!1}return!0};
goog.array.equals=function(a,b,c){if(!goog.isArrayLike(a)||!goog.isArrayLike(b)||a.length!=b.length)return!1;var d=a.length;c=c||goog.array.defaultCompareEquality;for(var e=0;e<d;e++)if(!c(a[e],b[e]))return!1;return!0};goog.array.compare3=function(a,b,c){c=c||goog.array.defaultCompare;for(var d=Math.min(a.length,b.length),e=0;e<d;e++){var f=c(a[e],b[e]);if(0!=f)return f}return goog.array.defaultCompare(a.length,b.length)};goog.array.defaultCompare=function(a,b){return a>b?1:a<b?-1:0};
goog.array.inverseDefaultCompare=function(a,b){return-goog.array.defaultCompare(a,b)};goog.array.defaultCompareEquality=function(a,b){return a===b};goog.array.binaryInsert=function(a,b,c){c=goog.array.binarySearch(a,b,c);return 0>c?(goog.array.insertAt(a,b,-(c+1)),!0):!1};goog.array.binaryRemove=function(a,b,c){b=goog.array.binarySearch(a,b,c);return 0<=b?goog.array.removeAt(a,b):!1};
goog.array.bucket=function(a,b,c){for(var d={},e=0;e<a.length;e++){var f=a[e],g=b.call(c,f,e,a);goog.isDef(g)&&(d[g]||(d[g]=[])).push(f)}return d};goog.array.toObject=function(a,b,c){var d={};goog.array.forEach(a,function(e,f){d[b.call(c,e,f,a)]=e});return d};goog.array.range=function(a,b,c){var d=[],e=0,f=a;c=c||1;void 0!==b&&(e=a,f=b);if(0>c*(f-e))return[];if(0<c)for(a=e;a<f;a+=c)d.push(a);else for(a=e;a>f;a+=c)d.push(a);return d};
goog.array.repeat=function(a,b){for(var c=[],d=0;d<b;d++)c[d]=a;return c};goog.array.flatten=function(a){for(var b=[],c=0;c<arguments.length;c++){var d=arguments[c];if(goog.isArray(d))for(var e=0;e<d.length;e+=8192)for(var f=goog.array.slice(d,e,e+8192),f=goog.array.flatten.apply(null,f),g=0;g<f.length;g++)b.push(f[g]);else b.push(d)}return b};
goog.array.rotate=function(a,b){goog.asserts.assert(null!=a.length);a.length&&(b%=a.length,0<b?Array.prototype.unshift.apply(a,a.splice(-b,b)):0>b&&Array.prototype.push.apply(a,a.splice(0,-b)));return a};goog.array.moveItem=function(a,b,c){goog.asserts.assert(0<=b&&b<a.length);goog.asserts.assert(0<=c&&c<a.length);b=Array.prototype.splice.call(a,b,1);Array.prototype.splice.call(a,c,0,b[0])};
goog.array.zip=function(a){if(!arguments.length)return[];for(var b=[],c=arguments[0].length,d=1;d<arguments.length;d++)arguments[d].length<c&&(c=arguments[d].length);for(d=0;d<c;d++){for(var e=[],f=0;f<arguments.length;f++)e.push(arguments[f][d]);b.push(e)}return b};goog.array.shuffle=function(a,b){for(var c=b||Math.random,d=a.length-1;0<d;d--){var e=Math.floor(c()*(d+1)),f=a[d];a[d]=a[e];a[e]=f}};goog.array.copyByIndex=function(a,b){var c=[];goog.array.forEach(b,function(b){c.push(a[b])});return c};goog.crypt={};goog.crypt.stringToByteArray=function(a){for(var b=[],c=0,d=0;d<a.length;d++){for(var e=a.charCodeAt(d);255<e;)b[c++]=e&255,e>>=8;b[c++]=e}return b};goog.crypt.byteArrayToString=function(a){if(8192>=a.length)return String.fromCharCode.apply(null,a);for(var b="",c=0;c<a.length;c+=8192)var d=goog.array.slice(a,c,c+8192),b=b+String.fromCharCode.apply(null,d);return b};goog.crypt.byteArrayToHex=function(a){return goog.array.map(a,function(a){a=a.toString(16);return 1<a.length?a:"0"+a}).join("")};
goog.crypt.hexToByteArray=function(a){goog.asserts.assert(0==a.length%2,"Key string length must be multiple of 2");for(var b=[],c=0;c<a.length;c+=2)b.push(parseInt(a.substring(c,c+2),16));return b};
goog.crypt.stringToUtf8ByteArray=function(a){for(var b=[],c=0,d=0;d<a.length;d++){var e=a.charCodeAt(d);128>e?b[c++]=e:(2048>e?b[c++]=e>>6|192:(55296==(e&64512)&&d+1<a.length&&56320==(a.charCodeAt(d+1)&64512)?(e=65536+((e&1023)<<10)+(a.charCodeAt(++d)&1023),b[c++]=e>>18|240,b[c++]=e>>12&63|128):b[c++]=e>>12|224,b[c++]=e>>6&63|128),b[c++]=e&63|128)}return b};
goog.crypt.utf8ByteArrayToString=function(a){for(var b=[],c=0,d=0;c<a.length;){var e=a[c++];if(128>e)b[d++]=String.fromCharCode(e);else if(191<e&&224>e){var f=a[c++];b[d++]=String.fromCharCode((e&31)<<6|f&63)}else if(239<e&&365>e){var f=a[c++],g=a[c++],h=a[c++],e=((e&7)<<18|(f&63)<<12|(g&63)<<6|h&63)-65536;b[d++]=String.fromCharCode(55296+(e>>10));b[d++]=String.fromCharCode(56320+(e&1023))}else f=a[c++],g=a[c++],b[d++]=String.fromCharCode((e&15)<<12|(f&63)<<6|g&63)}return b.join("")};
goog.crypt.xorByteArray=function(a,b){goog.asserts.assert(a.length==b.length,"XOR array lengths must match");for(var c=[],d=0;d<a.length;d++)c.push(a[d]^b[d]);return c};goog.labs={};goog.labs.userAgent={};goog.labs.userAgent.util={};goog.labs.userAgent.util.getNativeUserAgentString_=function(){var a=goog.labs.userAgent.util.getNavigator_();return a&&(a=a.userAgent)?a:""};goog.labs.userAgent.util.getNavigator_=function(){return goog.global.navigator};goog.labs.userAgent.util.userAgent_=goog.labs.userAgent.util.getNativeUserAgentString_();goog.labs.userAgent.util.setUserAgent=function(a){goog.labs.userAgent.util.userAgent_=a||goog.labs.userAgent.util.getNativeUserAgentString_()};
goog.labs.userAgent.util.getUserAgent=function(){return goog.labs.userAgent.util.userAgent_};goog.labs.userAgent.util.matchUserAgent=function(a){var b=goog.labs.userAgent.util.getUserAgent();return goog.string.contains(b,a)};goog.labs.userAgent.util.matchUserAgentIgnoreCase=function(a){var b=goog.labs.userAgent.util.getUserAgent();return goog.string.caseInsensitiveContains(b,a)};
goog.labs.userAgent.util.extractVersionTuples=function(a){for(var b=RegExp("(\\w[\\w ]+)/([^\\s]+)\\s*(?:\\((.*?)\\))?","g"),c=[],d;d=b.exec(a);)c.push([d[1],d[2],d[3]||void 0]);return c};goog.object={};goog.object.forEach=function(a,b,c){for(var d in a)b.call(c,a[d],d,a)};goog.object.filter=function(a,b,c){var d={},e;for(e in a)b.call(c,a[e],e,a)&&(d[e]=a[e]);return d};goog.object.map=function(a,b,c){var d={},e;for(e in a)d[e]=b.call(c,a[e],e,a);return d};goog.object.some=function(a,b,c){for(var d in a)if(b.call(c,a[d],d,a))return!0;return!1};goog.object.every=function(a,b,c){for(var d in a)if(!b.call(c,a[d],d,a))return!1;return!0};
goog.object.getCount=function(a){var b=0,c;for(c in a)b++;return b};goog.object.getAnyKey=function(a){for(var b in a)return b};goog.object.getAnyValue=function(a){for(var b in a)return a[b]};goog.object.contains=function(a,b){return goog.object.containsValue(a,b)};goog.object.getValues=function(a){var b=[],c=0,d;for(d in a)b[c++]=a[d];return b};goog.object.getKeys=function(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b};
goog.object.getValueByKeys=function(a,b){for(var c=goog.isArrayLike(b),d=c?b:arguments,c=c?0:1;c<d.length&&(a=a[d[c]],goog.isDef(a));c++);return a};goog.object.containsKey=function(a,b){return null!==a&&b in a};goog.object.containsValue=function(a,b){for(var c in a)if(a[c]==b)return!0;return!1};goog.object.findKey=function(a,b,c){for(var d in a)if(b.call(c,a[d],d,a))return d};goog.object.findValue=function(a,b,c){return(b=goog.object.findKey(a,b,c))&&a[b]};
goog.object.isEmpty=function(a){for(var b in a)return!1;return!0};goog.object.clear=function(a){for(var b in a)delete a[b]};goog.object.remove=function(a,b){var c;(c=b in a)&&delete a[b];return c};goog.object.add=function(a,b,c){if(null!==a&&b in a)throw Error('The object already contains the key "'+b+'"');goog.object.set(a,b,c)};goog.object.get=function(a,b,c){return null!==a&&b in a?a[b]:c};goog.object.set=function(a,b,c){a[b]=c};
goog.object.setIfUndefined=function(a,b,c){return b in a?a[b]:a[b]=c};goog.object.setWithReturnValueIfNotSet=function(a,b,c){if(b in a)return a[b];c=c();return a[b]=c};goog.object.equals=function(a,b){for(var c in a)if(!(c in b)||a[c]!==b[c])return!1;for(c in b)if(!(c in a))return!1;return!0};goog.object.clone=function(a){var b={},c;for(c in a)b[c]=a[c];return b};
goog.object.unsafeClone=function(a){var b=goog.typeOf(a);if("object"==b||"array"==b){if(goog.isFunction(a.clone))return a.clone();var b="array"==b?[]:{},c;for(c in a)b[c]=goog.object.unsafeClone(a[c]);return b}return a};goog.object.transpose=function(a){var b={},c;for(c in a)b[a[c]]=c;return b};goog.object.PROTOTYPE_FIELDS_="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
goog.object.extend=function(a,b){for(var c,d,e=1;e<arguments.length;e++){d=arguments[e];for(c in d)a[c]=d[c];for(var f=0;f<goog.object.PROTOTYPE_FIELDS_.length;f++)c=goog.object.PROTOTYPE_FIELDS_[f],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c])}};
goog.object.create=function(a){var b=arguments.length;if(1==b&&goog.isArray(arguments[0]))return goog.object.create.apply(null,arguments[0]);if(b%2)throw Error("Uneven number of arguments");for(var c={},d=0;d<b;d+=2)c[arguments[d]]=arguments[d+1];return c};goog.object.createSet=function(a){var b=arguments.length;if(1==b&&goog.isArray(arguments[0]))return goog.object.createSet.apply(null,arguments[0]);for(var c={},d=0;d<b;d++)c[arguments[d]]=!0;return c};
goog.object.createImmutableView=function(a){var b=a;Object.isFrozen&&!Object.isFrozen(a)&&(b=Object.create(a),Object.freeze(b));return b};goog.object.isImmutableView=function(a){return!!Object.isFrozen&&Object.isFrozen(a)};goog.labs.userAgent.browser={};goog.labs.userAgent.browser.matchOpera_=function(){return goog.labs.userAgent.util.matchUserAgent("Opera")||goog.labs.userAgent.util.matchUserAgent("OPR")};goog.labs.userAgent.browser.matchIE_=function(){return goog.labs.userAgent.util.matchUserAgent("Trident")||goog.labs.userAgent.util.matchUserAgent("MSIE")};goog.labs.userAgent.browser.matchEdge_=function(){return goog.labs.userAgent.util.matchUserAgent("Edge")};goog.labs.userAgent.browser.matchFirefox_=function(){return goog.labs.userAgent.util.matchUserAgent("Firefox")};
goog.labs.userAgent.browser.matchSafari_=function(){return goog.labs.userAgent.util.matchUserAgent("Safari")&&!(goog.labs.userAgent.browser.matchChrome_()||goog.labs.userAgent.browser.matchCoast_()||goog.labs.userAgent.browser.matchOpera_()||goog.labs.userAgent.browser.matchEdge_()||goog.labs.userAgent.browser.isSilk()||goog.labs.userAgent.util.matchUserAgent("Android"))};goog.labs.userAgent.browser.matchCoast_=function(){return goog.labs.userAgent.util.matchUserAgent("Coast")};
goog.labs.userAgent.browser.matchIosWebview_=function(){return(goog.labs.userAgent.util.matchUserAgent("iPad")||goog.labs.userAgent.util.matchUserAgent("iPhone"))&&!goog.labs.userAgent.browser.matchSafari_()&&!goog.labs.userAgent.browser.matchChrome_()&&!goog.labs.userAgent.browser.matchCoast_()&&goog.labs.userAgent.util.matchUserAgent("AppleWebKit")};
goog.labs.userAgent.browser.matchChrome_=function(){return(goog.labs.userAgent.util.matchUserAgent("Chrome")||goog.labs.userAgent.util.matchUserAgent("CriOS"))&&!goog.labs.userAgent.browser.matchOpera_()&&!goog.labs.userAgent.browser.matchEdge_()};goog.labs.userAgent.browser.matchAndroidBrowser_=function(){return goog.labs.userAgent.util.matchUserAgent("Android")&&!(goog.labs.userAgent.browser.isChrome()||goog.labs.userAgent.browser.isFirefox()||goog.labs.userAgent.browser.isOpera()||goog.labs.userAgent.browser.isSilk())};
goog.labs.userAgent.browser.isOpera=goog.labs.userAgent.browser.matchOpera_;goog.labs.userAgent.browser.isIE=goog.labs.userAgent.browser.matchIE_;goog.labs.userAgent.browser.isEdge=goog.labs.userAgent.browser.matchEdge_;goog.labs.userAgent.browser.isFirefox=goog.labs.userAgent.browser.matchFirefox_;goog.labs.userAgent.browser.isSafari=goog.labs.userAgent.browser.matchSafari_;goog.labs.userAgent.browser.isCoast=goog.labs.userAgent.browser.matchCoast_;goog.labs.userAgent.browser.isIosWebview=goog.labs.userAgent.browser.matchIosWebview_;
goog.labs.userAgent.browser.isChrome=goog.labs.userAgent.browser.matchChrome_;goog.labs.userAgent.browser.isAndroidBrowser=goog.labs.userAgent.browser.matchAndroidBrowser_;goog.labs.userAgent.browser.isSilk=function(){return goog.labs.userAgent.util.matchUserAgent("Silk")};
goog.labs.userAgent.browser.getVersion=function(){function a(a){a=goog.array.find(a,d);return c[a]||""}var b=goog.labs.userAgent.util.getUserAgent();if(goog.labs.userAgent.browser.isIE())return goog.labs.userAgent.browser.getIEVersion_(b);var b=goog.labs.userAgent.util.extractVersionTuples(b),c={};goog.array.forEach(b,function(a){c[a[0]]=a[1]});var d=goog.partial(goog.object.containsKey,c);return goog.labs.userAgent.browser.isOpera()?a(["Version","Opera","OPR"]):goog.labs.userAgent.browser.isEdge()?
a(["Edge"]):goog.labs.userAgent.browser.isChrome()?a(["Chrome","CriOS"]):(b=b[2])&&b[1]||""};goog.labs.userAgent.browser.isVersionOrHigher=function(a){return 0<=goog.string.compareVersions(goog.labs.userAgent.browser.getVersion(),a)};
goog.labs.userAgent.browser.getIEVersion_=function(a){var b=/rv: *([\d\.]*)/.exec(a);if(b&&b[1])return b[1];var b="",c=/MSIE +([\d\.]+)/.exec(a);if(c&&c[1])if(a=/Trident\/(\d.\d)/.exec(a),"7.0"==c[1])if(a&&a[1])switch(a[1]){case "4.0":b="8.0";break;case "5.0":b="9.0";break;case "6.0":b="10.0";break;case "7.0":b="11.0"}else b="7.0";else b=c[1];return b};goog.labs.userAgent.engine={};goog.labs.userAgent.engine.isPresto=function(){return goog.labs.userAgent.util.matchUserAgent("Presto")};goog.labs.userAgent.engine.isTrident=function(){return goog.labs.userAgent.util.matchUserAgent("Trident")||goog.labs.userAgent.util.matchUserAgent("MSIE")};goog.labs.userAgent.engine.isEdge=function(){return goog.labs.userAgent.util.matchUserAgent("Edge")};
goog.labs.userAgent.engine.isWebKit=function(){return goog.labs.userAgent.util.matchUserAgentIgnoreCase("WebKit")&&!goog.labs.userAgent.engine.isEdge()};goog.labs.userAgent.engine.isGecko=function(){return goog.labs.userAgent.util.matchUserAgent("Gecko")&&!goog.labs.userAgent.engine.isWebKit()&&!goog.labs.userAgent.engine.isTrident()&&!goog.labs.userAgent.engine.isEdge()};
goog.labs.userAgent.engine.getVersion=function(){var a=goog.labs.userAgent.util.getUserAgent();if(a){var a=goog.labs.userAgent.util.extractVersionTuples(a),b=goog.labs.userAgent.engine.getEngineTuple_(a);if(b)return"Gecko"==b[0]?goog.labs.userAgent.engine.getVersionForKey_(a,"Firefox"):b[1];var a=a[0],c;if(a&&(c=a[2])&&(c=/Trident\/([^\s;]+)/.exec(c)))return c[1]}return""};
goog.labs.userAgent.engine.getEngineTuple_=function(a){if(!goog.labs.userAgent.engine.isEdge())return a[1];for(var b=0;b<a.length;b++){var c=a[b];if("Edge"==c[0])return c}};goog.labs.userAgent.engine.isVersionOrHigher=function(a){return 0<=goog.string.compareVersions(goog.labs.userAgent.engine.getVersion(),a)};goog.labs.userAgent.engine.getVersionForKey_=function(a,b){var c=goog.array.find(a,function(a){return b==a[0]});return c&&c[1]||""};goog.labs.userAgent.platform={};goog.labs.userAgent.platform.isAndroid=function(){return goog.labs.userAgent.util.matchUserAgent("Android")};goog.labs.userAgent.platform.isIpod=function(){return goog.labs.userAgent.util.matchUserAgent("iPod")};goog.labs.userAgent.platform.isIphone=function(){return goog.labs.userAgent.util.matchUserAgent("iPhone")&&!goog.labs.userAgent.util.matchUserAgent("iPod")&&!goog.labs.userAgent.util.matchUserAgent("iPad")};goog.labs.userAgent.platform.isIpad=function(){return goog.labs.userAgent.util.matchUserAgent("iPad")};
goog.labs.userAgent.platform.isIos=function(){return goog.labs.userAgent.platform.isIphone()||goog.labs.userAgent.platform.isIpad()||goog.labs.userAgent.platform.isIpod()};goog.labs.userAgent.platform.isMacintosh=function(){return goog.labs.userAgent.util.matchUserAgent("Macintosh")};goog.labs.userAgent.platform.isLinux=function(){return goog.labs.userAgent.util.matchUserAgent("Linux")};goog.labs.userAgent.platform.isWindows=function(){return goog.labs.userAgent.util.matchUserAgent("Windows")};
goog.labs.userAgent.platform.isChromeOS=function(){return goog.labs.userAgent.util.matchUserAgent("CrOS")};
goog.labs.userAgent.platform.getVersion=function(){var a=goog.labs.userAgent.util.getUserAgent(),b="";goog.labs.userAgent.platform.isWindows()?(b=/Windows (?:NT|Phone) ([0-9.]+)/,b=(a=b.exec(a))?a[1]:"0.0"):goog.labs.userAgent.platform.isIos()?(b=/(?:iPhone|iPod|iPad|CPU)\s+OS\s+(\S+)/,b=(a=b.exec(a))&&a[1].replace(/_/g,".")):goog.labs.userAgent.platform.isMacintosh()?(b=/Mac OS X ([0-9_.]+)/,b=(a=b.exec(a))?a[1].replace(/_/g,"."):"10"):goog.labs.userAgent.platform.isAndroid()?(b=/Android\s+([^\);]+)(\)|;)/,
b=(a=b.exec(a))&&a[1]):goog.labs.userAgent.platform.isChromeOS()&&(b=/(?:CrOS\s+(?:i686|x86_64)\s+([0-9.]+))/,b=(a=b.exec(a))&&a[1]);return b||""};goog.labs.userAgent.platform.isVersionOrHigher=function(a){return 0<=goog.string.compareVersions(goog.labs.userAgent.platform.getVersion(),a)};goog.userAgent={};goog.userAgent.ASSUME_IE=!1;goog.userAgent.ASSUME_EDGE=!1;goog.userAgent.ASSUME_GECKO=!1;goog.userAgent.ASSUME_WEBKIT=!1;goog.userAgent.ASSUME_MOBILE_WEBKIT=!1;goog.userAgent.ASSUME_OPERA=!1;goog.userAgent.ASSUME_ANY_VERSION=!1;goog.userAgent.BROWSER_KNOWN_=goog.userAgent.ASSUME_IE||goog.userAgent.ASSUME_EDGE||goog.userAgent.ASSUME_GECKO||goog.userAgent.ASSUME_MOBILE_WEBKIT||goog.userAgent.ASSUME_WEBKIT||goog.userAgent.ASSUME_OPERA;goog.userAgent.getUserAgentString=function(){return goog.labs.userAgent.util.getUserAgent()};
goog.userAgent.getNavigator=function(){return goog.global.navigator||null};goog.userAgent.OPERA=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_OPERA:goog.labs.userAgent.browser.isOpera();goog.userAgent.IE=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_IE:goog.labs.userAgent.browser.isIE();goog.userAgent.EDGE=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_EDGE:goog.labs.userAgent.engine.isEdge();goog.userAgent.EDGE_OR_IE=goog.userAgent.EDGE||goog.userAgent.IE;
goog.userAgent.GECKO=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_GECKO:goog.labs.userAgent.engine.isGecko();goog.userAgent.WEBKIT=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_WEBKIT||goog.userAgent.ASSUME_MOBILE_WEBKIT:goog.labs.userAgent.engine.isWebKit();goog.userAgent.isMobile_=function(){return goog.userAgent.WEBKIT&&goog.labs.userAgent.util.matchUserAgent("Mobile")};goog.userAgent.MOBILE=goog.userAgent.ASSUME_MOBILE_WEBKIT||goog.userAgent.isMobile_();goog.userAgent.SAFARI=goog.userAgent.WEBKIT;
goog.userAgent.determinePlatform_=function(){var a=goog.userAgent.getNavigator();return a&&a.platform||""};goog.userAgent.PLATFORM=goog.userAgent.determinePlatform_();goog.userAgent.ASSUME_MAC=!1;goog.userAgent.ASSUME_WINDOWS=!1;goog.userAgent.ASSUME_LINUX=!1;goog.userAgent.ASSUME_X11=!1;goog.userAgent.ASSUME_ANDROID=!1;goog.userAgent.ASSUME_IPHONE=!1;goog.userAgent.ASSUME_IPAD=!1;
goog.userAgent.PLATFORM_KNOWN_=goog.userAgent.ASSUME_MAC||goog.userAgent.ASSUME_WINDOWS||goog.userAgent.ASSUME_LINUX||goog.userAgent.ASSUME_X11||goog.userAgent.ASSUME_ANDROID||goog.userAgent.ASSUME_IPHONE||goog.userAgent.ASSUME_IPAD;goog.userAgent.MAC=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_MAC:goog.labs.userAgent.platform.isMacintosh();goog.userAgent.WINDOWS=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_WINDOWS:goog.labs.userAgent.platform.isWindows();
goog.userAgent.isLegacyLinux_=function(){return goog.labs.userAgent.platform.isLinux()||goog.labs.userAgent.platform.isChromeOS()};goog.userAgent.LINUX=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_LINUX:goog.userAgent.isLegacyLinux_();goog.userAgent.isX11_=function(){var a=goog.userAgent.getNavigator();return!!a&&goog.string.contains(a.appVersion||"","X11")};goog.userAgent.X11=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_X11:goog.userAgent.isX11_();
goog.userAgent.ANDROID=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_ANDROID:goog.labs.userAgent.platform.isAndroid();goog.userAgent.IPHONE=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_IPHONE:goog.labs.userAgent.platform.isIphone();goog.userAgent.IPAD=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_IPAD:goog.labs.userAgent.platform.isIpad();goog.userAgent.operaVersion_=function(){var a=goog.global.opera.version;try{return a()}catch(b){return a}};
goog.userAgent.determineVersion_=function(){if(goog.userAgent.OPERA&&goog.global.opera)return goog.userAgent.operaVersion_();var a="",b=goog.userAgent.getVersionRegexResult_();b&&(a=b?b[1]:"");return goog.userAgent.IE&&(b=goog.userAgent.getDocumentMode_(),b>parseFloat(a))?String(b):a};
goog.userAgent.getVersionRegexResult_=function(){var a=goog.userAgent.getUserAgentString();if(goog.userAgent.GECKO)return/rv\:([^\);]+)(\)|;)/.exec(a);if(goog.userAgent.EDGE)return/Edge\/([\d\.]+)/.exec(a);if(goog.userAgent.IE)return/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);if(goog.userAgent.WEBKIT)return/WebKit\/(\S+)/.exec(a)};goog.userAgent.getDocumentMode_=function(){var a=goog.global.document;return a?a.documentMode:void 0};goog.userAgent.VERSION=goog.userAgent.determineVersion_();
goog.userAgent.compare=function(a,b){return goog.string.compareVersions(a,b)};goog.userAgent.isVersionOrHigherCache_={};goog.userAgent.isVersionOrHigher=function(a){return goog.userAgent.ASSUME_ANY_VERSION||goog.userAgent.isVersionOrHigherCache_[a]||(goog.userAgent.isVersionOrHigherCache_[a]=0<=goog.string.compareVersions(goog.userAgent.VERSION,a))};goog.userAgent.isVersion=goog.userAgent.isVersionOrHigher;
goog.userAgent.isDocumentModeOrHigher=function(a){return Number(goog.userAgent.DOCUMENT_MODE)>=a};goog.userAgent.isDocumentMode=goog.userAgent.isDocumentModeOrHigher;goog.userAgent.DOCUMENT_MODE=function(){var a=goog.global.document,b=goog.userAgent.getDocumentMode_();return a&&goog.userAgent.IE?b||("CSS1Compat"==a.compatMode?parseInt(goog.userAgent.VERSION,10):5):void 0}();goog.userAgent.product={};goog.userAgent.product.ASSUME_FIREFOX=!1;goog.userAgent.product.ASSUME_IPHONE=!1;goog.userAgent.product.ASSUME_IPAD=!1;goog.userAgent.product.ASSUME_ANDROID=!1;goog.userAgent.product.ASSUME_CHROME=!1;goog.userAgent.product.ASSUME_SAFARI=!1;
goog.userAgent.product.PRODUCT_KNOWN_=goog.userAgent.ASSUME_IE||goog.userAgent.ASSUME_EDGE||goog.userAgent.ASSUME_OPERA||goog.userAgent.product.ASSUME_FIREFOX||goog.userAgent.product.ASSUME_IPHONE||goog.userAgent.product.ASSUME_IPAD||goog.userAgent.product.ASSUME_ANDROID||goog.userAgent.product.ASSUME_CHROME||goog.userAgent.product.ASSUME_SAFARI;goog.userAgent.product.OPERA=goog.userAgent.OPERA;goog.userAgent.product.IE=goog.userAgent.IE;goog.userAgent.product.EDGE=goog.userAgent.EDGE;
goog.userAgent.product.FIREFOX=goog.userAgent.product.PRODUCT_KNOWN_?goog.userAgent.product.ASSUME_FIREFOX:goog.labs.userAgent.browser.isFirefox();goog.userAgent.product.isIphoneOrIpod_=function(){return goog.labs.userAgent.platform.isIphone()||goog.labs.userAgent.platform.isIpod()};goog.userAgent.product.IPHONE=goog.userAgent.product.PRODUCT_KNOWN_?goog.userAgent.product.ASSUME_IPHONE:goog.userAgent.product.isIphoneOrIpod_();
goog.userAgent.product.IPAD=goog.userAgent.product.PRODUCT_KNOWN_?goog.userAgent.product.ASSUME_IPAD:goog.labs.userAgent.platform.isIpad();goog.userAgent.product.ANDROID=goog.userAgent.product.PRODUCT_KNOWN_?goog.userAgent.product.ASSUME_ANDROID:goog.labs.userAgent.browser.isAndroidBrowser();goog.userAgent.product.CHROME=goog.userAgent.product.PRODUCT_KNOWN_?goog.userAgent.product.ASSUME_CHROME:goog.labs.userAgent.browser.isChrome();
goog.userAgent.product.isSafariDesktop_=function(){return goog.labs.userAgent.browser.isSafari()&&!goog.labs.userAgent.platform.isIos()};goog.userAgent.product.SAFARI=goog.userAgent.product.PRODUCT_KNOWN_?goog.userAgent.product.ASSUME_SAFARI:goog.userAgent.product.isSafariDesktop_();goog.crypt.base64={};goog.crypt.base64.byteToCharMap_=null;goog.crypt.base64.charToByteMap_=null;goog.crypt.base64.byteToCharMapWebSafe_=null;goog.crypt.base64.ENCODED_VALS_BASE="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";goog.crypt.base64.ENCODED_VALS=goog.crypt.base64.ENCODED_VALS_BASE+"+/=";goog.crypt.base64.ENCODED_VALS_WEBSAFE=goog.crypt.base64.ENCODED_VALS_BASE+"-_.";
goog.crypt.base64.ASSUME_NATIVE_SUPPORT_=goog.userAgent.GECKO||goog.userAgent.WEBKIT&&!goog.userAgent.product.SAFARI||goog.userAgent.OPERA;goog.crypt.base64.HAS_NATIVE_ENCODE_=goog.crypt.base64.ASSUME_NATIVE_SUPPORT_||"function"==typeof goog.global.btoa;goog.crypt.base64.HAS_NATIVE_DECODE_=goog.crypt.base64.ASSUME_NATIVE_SUPPORT_||!goog.userAgent.product.SAFARI&&!goog.userAgent.IE&&"function"==typeof goog.global.atob;
goog.crypt.base64.encodeByteArray=function(a,b){goog.asserts.assert(goog.isArrayLike(a),"encodeByteArray takes an array as a parameter");goog.crypt.base64.init_();for(var c=b?goog.crypt.base64.byteToCharMapWebSafe_:goog.crypt.base64.byteToCharMap_,d=[],e=0;e<a.length;e+=3){var f=a[e],g=e+1<a.length,h=g?a[e+1]:0,k=e+2<a.length,l=k?a[e+2]:0,p=f>>2,f=(f&3)<<4|h>>4,h=(h&15)<<2|l>>6,l=l&63;k||(l=64,g||(h=64));d.push(c[p],c[f],c[h],c[l])}return d.join("")};
goog.crypt.base64.encodeString=function(a,b){return goog.crypt.base64.HAS_NATIVE_ENCODE_&&!b?goog.global.btoa(a):goog.crypt.base64.encodeByteArray(goog.crypt.stringToByteArray(a),b)};goog.crypt.base64.decodeString=function(a,b){if(goog.crypt.base64.HAS_NATIVE_DECODE_&&!b)return goog.global.atob(a);var c="";goog.crypt.base64.decodeStringInternal_(a,function(a){c+=String.fromCharCode(a)});return c};
goog.crypt.base64.decodeStringToByteArray=function(a,b){var c=[];goog.crypt.base64.decodeStringInternal_(a,function(a){c.push(a)});return c};goog.crypt.base64.decodeStringToUint8Array=function(a){goog.asserts.assert(!goog.userAgent.IE||goog.userAgent.isVersionOrHigher("10"),"Browser does not support typed arrays");var b=new Uint8Array(Math.ceil(3*a.length/4)),c=0;goog.crypt.base64.decodeStringInternal_(a,function(a){b[c++]=a});return b.subarray(0,c)};
goog.crypt.base64.decodeStringInternal_=function(a,b){function c(b){for(;d<a.length;){var c=a.charAt(d++),e=goog.crypt.base64.charToByteMap_[c];if(null!=e)return e;if(!goog.string.isEmptyOrWhitespace(c))throw Error("Unknown base64 encoding at char: "+c);}return b}goog.crypt.base64.init_();for(var d=0;;){var e=c(-1),f=c(0),g=c(64),h=c(64);if(64===h&&-1===e)break;b(e<<2|f>>4);64!=g&&(b(f<<4&240|g>>2),64!=h&&b(g<<6&192|h))}};
goog.crypt.base64.init_=function(){if(!goog.crypt.base64.byteToCharMap_){goog.crypt.base64.byteToCharMap_={};goog.crypt.base64.charToByteMap_={};goog.crypt.base64.byteToCharMapWebSafe_={};for(var a=0;a<goog.crypt.base64.ENCODED_VALS.length;a++)goog.crypt.base64.byteToCharMap_[a]=goog.crypt.base64.ENCODED_VALS.charAt(a),goog.crypt.base64.charToByteMap_[goog.crypt.base64.byteToCharMap_[a]]=a,goog.crypt.base64.byteToCharMapWebSafe_[a]=goog.crypt.base64.ENCODED_VALS_WEBSAFE.charAt(a),a>=goog.crypt.base64.ENCODED_VALS_BASE.length&&
(goog.crypt.base64.charToByteMap_[goog.crypt.base64.ENCODED_VALS_WEBSAFE.charAt(a)]=a)}};goog.json={};goog.json.USE_NATIVE_JSON=!1;goog.json.isValid=function(a){return/^\s*$/.test(a)?!1:/^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g,"@").replace(/(?:"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)[\s\u2028\u2029]*(?=:|,|]|}|$)/g,"]").replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,""))};
goog.json.parse=goog.json.USE_NATIVE_JSON?goog.global.JSON.parse:function(a){a=String(a);if(goog.json.isValid(a))try{return eval("("+a+")")}catch(b){}throw Error("Invalid JSON string: "+a);};goog.json.unsafeParse=goog.json.USE_NATIVE_JSON?goog.global.JSON.parse:function(a){return eval("("+a+")")};goog.json.serialize=goog.json.USE_NATIVE_JSON?goog.global.JSON.stringify:function(a,b){return(new goog.json.Serializer(b)).serialize(a)};goog.json.Serializer=function(a){this.replacer_=a};
goog.json.Serializer.prototype.serialize=function(a){var b=[];this.serializeInternal(a,b);return b.join("")};
goog.json.Serializer.prototype.serializeInternal=function(a,b){if(null==a)b.push("null");else{if("object"==typeof a){if(goog.isArray(a)){this.serializeArray(a,b);return}if(a instanceof String||a instanceof Number||a instanceof Boolean)a=a.valueOf();else{this.serializeObject_(a,b);return}}switch(typeof a){case "string":this.serializeString_(a,b);break;case "number":this.serializeNumber_(a,b);break;case "boolean":b.push(String(a));break;case "function":b.push("null");break;default:throw Error("Unknown type: "+
typeof a);}}};goog.json.Serializer.charToJsonCharCache_={'"':'\\"',"\\":"\\\\","/":"\\/","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t","\x0B":"\\u000b"};goog.json.Serializer.charsToReplace_=/\uffff/.test("\uffff")?/[\\\"\x00-\x1f\x7f-\uffff]/g:/[\\\"\x00-\x1f\x7f-\xff]/g;
goog.json.Serializer.prototype.serializeString_=function(a,b){b.push('"',a.replace(goog.json.Serializer.charsToReplace_,function(a){var b=goog.json.Serializer.charToJsonCharCache_[a];b||(b="\\u"+(a.charCodeAt(0)|65536).toString(16).substr(1),goog.json.Serializer.charToJsonCharCache_[a]=b);return b}),'"')};goog.json.Serializer.prototype.serializeNumber_=function(a,b){b.push(isFinite(a)&&!isNaN(a)?String(a):"null")};
goog.json.Serializer.prototype.serializeArray=function(a,b){var c=a.length;b.push("[");for(var d="",e=0;e<c;e++)b.push(d),d=a[e],this.serializeInternal(this.replacer_?this.replacer_.call(a,String(e),d):d,b),d=",";b.push("]")};
goog.json.Serializer.prototype.serializeObject_=function(a,b){b.push("{");var c="",d;for(d in a)if(Object.prototype.hasOwnProperty.call(a,d)){var e=a[d];"function"!=typeof e&&(b.push(c),this.serializeString_(d,b),b.push(":"),this.serializeInternal(this.replacer_?this.replacer_.call(a,d,e):e,b),c=",")}b.push("}")};var jspb={Map:function(a,b){this.arr_=a;this.valueCtor_=b;this.map_={};this.arrClean=!0;0<this.arr_.length&&this.loadFromArray_()}};jspb.Map.prototype.loadFromArray_=function(){for(var a=0;a<this.arr_.length;a++){var b=this.arr_[a],c=b[0];this.map_[c.toString()]=new jspb.Map.Entry_(c,b[1])}this.arrClean=!0};
jspb.Map.prototype.toArray=function(){if(this.arrClean){if(this.valueCtor_){var a=this.map_,b;for(b in a)if(Object.prototype.hasOwnProperty.call(a,b)){var c=a[b].valueWrapper;c&&c.toArray()}}}else{this.arr_.length=0;a=this.stringKeys_();a.sort();for(b=0;b<a.length;b++){var d=this.map_[a[b]];(c=d.valueWrapper)&&c.toArray();this.arr_.push([d.key,d.value])}this.arrClean=!0}return this.arr_};
jspb.Map.prototype.toObject=function(a,b){for(var c=this.toArray(),d=[],e=0;e<c.length;e++){var f=this.map_[c[e][0].toString()];this.wrapEntry_(f);var g=f.valueWrapper;g?(goog.asserts.assert(b),d.push([f.key,b(a,g)])):d.push([f.key,f.value])}return d};jspb.Map.fromObject=function(a,b,c){b=new jspb.Map([],b);for(var d=0;d<a.length;d++){var e=a[d][0],f=c(a[d][1]);b.set(e,f)}return b};jspb.Map.ArrayIteratorIterable_=function(a){this.idx_=0;this.arr_=a};
jspb.Map.ArrayIteratorIterable_.prototype.next=function(){return this.idx_<this.arr_.length?{done:!1,value:this.arr_[this.idx_++]}:{done:!0,value:void 0}};$jscomp.initSymbol();"undefined"!=typeof Symbol&&($jscomp.initSymbol(),$jscomp.initSymbolIterator(),jspb.Map.ArrayIteratorIterable_.prototype[Symbol.iterator]=function(){return this});jspb.Map.prototype.getLength=function(){return this.stringKeys_().length};jspb.Map.prototype.clear=function(){this.map_={};this.arrClean=!1};
jspb.Map.prototype.del=function(a){a=a.toString();var b=this.map_.hasOwnProperty(a);delete this.map_[a];this.arrClean=!1;return b};jspb.Map.prototype.getEntryList=function(){var a=[],b=this.stringKeys_();b.sort();for(var c=0;c<b.length;c++){var d=this.map_[b[c]];a.push([d.key,d.value])}return a};jspb.Map.prototype.entries=function(){var a=[],b=this.stringKeys_();b.sort();for(var c=0;c<b.length;c++){var d=this.map_[b[c]];a.push([d.key,this.wrapEntry_(d)])}return new jspb.Map.ArrayIteratorIterable_(a)};
jspb.Map.prototype.keys=function(){var a=[],b=this.stringKeys_();b.sort();for(var c=0;c<b.length;c++)a.push(this.map_[b[c]].key);return new jspb.Map.ArrayIteratorIterable_(a)};jspb.Map.prototype.values=function(){var a=[],b=this.stringKeys_();b.sort();for(var c=0;c<b.length;c++)a.push(this.wrapEntry_(this.map_[b[c]]));return new jspb.Map.ArrayIteratorIterable_(a)};
jspb.Map.prototype.forEach=function(a,b){var c=this.stringKeys_();c.sort();for(var d=0;d<c.length;d++){var e=this.map_[c[d]];a.call(b,this.wrapEntry_(e),e.key,this)}};jspb.Map.prototype.set=function(a,b){var c=new jspb.Map.Entry_(a);this.valueCtor_?(c.valueWrapper=b,c.value=b.toArray()):c.value=b;this.map_[a.toString()]=c;this.arrClean=!1;return this};jspb.Map.prototype.wrapEntry_=function(a){return this.valueCtor_?(a.valueWrapper||(a.valueWrapper=new this.valueCtor_(a.value)),a.valueWrapper):a.value};
jspb.Map.prototype.get=function(a){if(a=this.map_[a.toString()])return this.wrapEntry_(a)};jspb.Map.prototype.has=function(a){return a.toString()in this.map_};jspb.Map.prototype.serializeBinary=function(a,b,c,d,e){var f=this.stringKeys_();f.sort();for(var g=0;g<f.length;g++){var h=this.map_[f[g]];b.beginSubMessage(a);c.call(b,1,h.key);this.valueCtor_?d.call(b,2,this.wrapEntry_(h),e):d.call(b,2,h.value);b.endSubMessage()}};
jspb.Map.deserializeBinary=function(a,b,c,d,e){for(var f=void 0,g=void 0;b.nextField()&&!b.isEndGroup();){var h=b.getFieldNumber();1==h?f=c.call(b):2==h&&(a.valueCtor_?(g=new a.valueCtor_,d.call(b,g,e)):g=d.call(b))}goog.asserts.assert(void 0!=f);goog.asserts.assert(void 0!=g);a.set(f,g)};jspb.Map.prototype.stringKeys_=function(){var a=this.map_,b=[],c;for(c in a)Object.prototype.hasOwnProperty.call(a,c)&&b.push(c);return b};
jspb.Map.Entry_=function(a,b){this.key=a;this.value=b;this.valueWrapper=void 0};jspb.ExtensionFieldInfo=function(a,b,c,d,e){this.fieldIndex=a;this.fieldName=b;this.ctor=c;this.toObjectFn=d;this.isRepeated=e};jspb.ExtensionFieldBinaryInfo=function(a,b,c,d,e,f){this.fieldInfo=a;this.binaryReaderFn=b;this.binaryWriterFn=c;this.binaryMessageSerializeFn=d;this.binaryMessageDeserializeFn=e;this.isPacked=f};jspb.ExtensionFieldInfo.prototype.isMessageType=function(){return!!this.ctor};jspb.Message=function(){};jspb.Message.GENERATE_TO_OBJECT=!0;jspb.Message.GENERATE_FROM_OBJECT=!goog.DISALLOW_TEST_ONLY_CODE;
jspb.Message.GENERATE_TO_STRING=!0;jspb.Message.ASSUME_LOCAL_ARRAYS=!1;jspb.Message.MINIMIZE_MEMORY_ALLOCATIONS=COMPILED;jspb.Message.SUPPORTS_UINT8ARRAY_="function"==typeof Uint8Array;jspb.Message.prototype.getJsPbMessageId=function(){return this.messageId_};jspb.Message.getIndex_=function(a,b){return b+a.arrayIndexOffset_};
jspb.Message.initialize=function(a,b,c,d,e,f){a.wrappers_=jspb.Message.MINIMIZE_MEMORY_ALLOCATIONS?null:{};b||(b=c?[c]:[]);a.messageId_=c?String(c):void 0;a.arrayIndexOffset_=0===c?-1:0;a.array=b;jspb.Message.materializeExtensionObject_(a,d);a.convertedFloatingPointFields_={};if(e)for(b=0;b<e.length;b++)c=e[b],c<a.pivot_?(c=jspb.Message.getIndex_(a,c),a.array[c]=a.array[c]||(jspb.Message.MINIMIZE_MEMORY_ALLOCATIONS?jspb.Message.EMPTY_LIST_SENTINEL_:[])):a.extensionObject_[c]=a.extensionObject_[c]||
(jspb.Message.MINIMIZE_MEMORY_ALLOCATIONS?jspb.Message.EMPTY_LIST_SENTINEL_:[]);f&&f.length&&goog.array.forEach(f,goog.partial(jspb.Message.computeOneofCase,a))};jspb.Message.EMPTY_LIST_SENTINEL_=goog.DEBUG&&Object.freeze?Object.freeze([]):[];jspb.Message.isArray_=function(a){return jspb.Message.ASSUME_LOCAL_ARRAYS?a instanceof Array:goog.isArray(a)};
jspb.Message.materializeExtensionObject_=function(a,b){if(a.array.length){var c=a.array.length-1,d=a.array[c];if(d&&"object"==typeof d&&!jspb.Message.isArray_(d)&&!(jspb.Message.SUPPORTS_UINT8ARRAY_&&d instanceof Uint8Array)){a.pivot_=c-a.arrayIndexOffset_;a.extensionObject_=d;return}}-1<b?(a.pivot_=b,c=jspb.Message.getIndex_(a,b),a.extensionObject_=jspb.Message.MINIMIZE_MEMORY_ALLOCATIONS?null:a.array[c]={}):a.pivot_=Number.MAX_VALUE};
jspb.Message.maybeInitEmptyExtensionObject_=function(a){var b=jspb.Message.getIndex_(a,a.pivot_);a.array[b]||(a.extensionObject_=a.array[b]={})};jspb.Message.toObjectList=function(a,b,c){for(var d=[],e=0;e<a.length;e++)d[e]=b.call(a[e],c,a[e]);return d};
jspb.Message.toObjectExtension=function(a,b,c,d,e){for(var f in c){var g=c[f],h=d.call(a,g);if(h){for(var k in g.fieldName)if(g.fieldName.hasOwnProperty(k))break;b[k]=g.toObjectFn?g.isRepeated?jspb.Message.toObjectList(h,g.toObjectFn,e):g.toObjectFn(e,h):h}}};
jspb.Message.serializeBinaryExtensions=function(a,b,c,d){for(var e in c){var f=c[e],g=f.fieldInfo;if(!f.binaryWriterFn)throw Error("Message extension present that was generated without binary serialization support");var h=d.call(a,g);if(h)if(g.isMessageType())if(f.binaryMessageSerializeFn)f.binaryWriterFn.call(b,g.fieldIndex,h,f.binaryMessageSerializeFn);else throw Error("Message extension present holding submessage without binary support enabled, and message is being serialized to binary format");
else f.binaryWriterFn.call(b,g.fieldIndex,h)}};jspb.Message.readBinaryExtension=function(a,b,c,d,e){var f=c[b.getFieldNumber()];if(f){c=f.fieldInfo;if(!f.binaryReaderFn)throw Error("Deserializing extension whose generated code does not support binary format");var g;c.isMessageType()?(g=new c.ctor,f.binaryReaderFn.call(b,g,f.binaryMessageDeserializeFn)):g=f.binaryReaderFn.call(b);c.isRepeated&&!f.isPacked?(b=d.call(a,c))?b.push(g):e.call(a,c,[g]):e.call(a,c,g)}else b.skipField()};
jspb.Message.getField=function(a,b){if(b<a.pivot_){var c=jspb.Message.getIndex_(a,b),d=a.array[c];return d===jspb.Message.EMPTY_LIST_SENTINEL_?a.array[c]=[]:d}d=a.extensionObject_[b];return d===jspb.Message.EMPTY_LIST_SENTINEL_?a.extensionObject_[b]=[]:d};jspb.Message.getOptionalFloatingPointField=function(a,b){var c=jspb.Message.getField(a,b);return null==c?c:+c};
jspb.Message.getRepeatedFloatingPointField=function(a,b){var c=jspb.Message.getField(a,b);a.convertedFloatingPointFields_||(a.convertedFloatingPointFields_={});if(!a.convertedFloatingPointFields_[b]){for(var d=0;d<c.length;d++)c[d]=+c[d];a.convertedFloatingPointFields_[b]=!0}return c};
jspb.Message.bytesAsB64=function(a){if(null==a||goog.isString(a))return a;if(jspb.Message.SUPPORTS_UINT8ARRAY_&&a instanceof Uint8Array)return goog.crypt.base64.encodeByteArray(a);goog.asserts.fail("Cannot coerce to b64 string: "+goog.typeOf(a));return null};jspb.Message.bytesAsU8=function(a){if(null==a||a instanceof Uint8Array)return a;if(goog.isString(a))return goog.crypt.base64.decodeStringToUint8Array(a);goog.asserts.fail("Cannot coerce to Uint8Array: "+goog.typeOf(a));return null};
jspb.Message.bytesListAsB64=function(a){jspb.Message.assertConsistentTypes_(a);return!a.length||goog.isString(a[0])?a:goog.array.map(a,jspb.Message.bytesAsB64)};jspb.Message.bytesListAsU8=function(a){jspb.Message.assertConsistentTypes_(a);return!a.length||a[0]instanceof Uint8Array?a:goog.array.map(a,jspb.Message.bytesAsU8)};
jspb.Message.assertConsistentTypes_=function(a){if(goog.DEBUG&&a&&1<a.length){var b=goog.typeOf(a[0]);goog.array.forEach(a,function(a){goog.typeOf(a)!=b&&goog.asserts.fail("Inconsistent type in JSPB repeated field array. Got "+goog.typeOf(a)+" expected "+b)})}};jspb.Message.getFieldWithDefault=function(a,b,c){a=jspb.Message.getField(a,b);return null==a?c:a};jspb.Message.getFieldProto3=jspb.Message.getFieldWithDefault;
jspb.Message.getMapField=function(a,b,c,d){a.wrappers_||(a.wrappers_={});if(b in a.wrappers_)return a.wrappers_[b];if(!c)return c=jspb.Message.getField(a,b),c||(c=[],jspb.Message.setField(a,b,c)),a.wrappers_[b]=new jspb.Map(c,d)};jspb.Message.setField=function(a,b,c){b<a.pivot_?a.array[jspb.Message.getIndex_(a,b)]=c:a.extensionObject_[b]=c};jspb.Message.addToRepeatedField=function(a,b,c,d){a=jspb.Message.getField(a,b);void 0!=d?a.splice(d,0,c):a.push(c)};
jspb.Message.setOneofField=function(a,b,c,d){(c=jspb.Message.computeOneofCase(a,c))&&c!==b&&void 0!==d&&(a.wrappers_&&c in a.wrappers_&&(a.wrappers_[c]=void 0),jspb.Message.setField(a,c,void 0));jspb.Message.setField(a,b,d)};jspb.Message.computeOneofCase=function(a,b){var c,d;goog.array.forEach(b,function(b){var f=jspb.Message.getField(a,b);goog.isDefAndNotNull(f)&&(c=b,d=f,jspb.Message.setField(a,b,void 0))});return c?(jspb.Message.setField(a,c,d),c):0};
jspb.Message.getWrapperField=function(a,b,c,d){a.wrappers_||(a.wrappers_={});if(!a.wrappers_[c]){var e=jspb.Message.getField(a,c);if(d||e)a.wrappers_[c]=new b(e)}return a.wrappers_[c]};jspb.Message.getRepeatedWrapperField=function(a,b,c){jspb.Message.wrapRepeatedField_(a,b,c);b=a.wrappers_[c];b==jspb.Message.EMPTY_LIST_SENTINEL_&&(b=a.wrappers_[c]=[]);return b};
jspb.Message.wrapRepeatedField_=function(a,b,c){a.wrappers_||(a.wrappers_={});if(!a.wrappers_[c]){for(var d=jspb.Message.getField(a,c),e=[],f=0;f<d.length;f++)e[f]=new b(d[f]);a.wrappers_[c]=e}};jspb.Message.setWrapperField=function(a,b,c){a.wrappers_||(a.wrappers_={});var d=c?c.toArray():c;a.wrappers_[b]=c;jspb.Message.setField(a,b,d)};jspb.Message.setOneofWrapperField=function(a,b,c,d){a.wrappers_||(a.wrappers_={});var e=d?d.toArray():d;a.wrappers_[b]=d;jspb.Message.setOneofField(a,b,c,e)};
jspb.Message.setRepeatedWrapperField=function(a,b,c){a.wrappers_||(a.wrappers_={});c=c||[];for(var d=[],e=0;e<c.length;e++)d[e]=c[e].toArray();a.wrappers_[b]=c;jspb.Message.setField(a,b,d)};jspb.Message.addToRepeatedWrapperField=function(a,b,c,d,e){jspb.Message.wrapRepeatedField_(a,d,b);var f=a.wrappers_[b];f||(f=a.wrappers_[b]=[]);c=c?c:new d;a=jspb.Message.getField(a,b);void 0!=e?(f.splice(e,0,c),a.splice(e,0,c.toArray())):(f.push(c),a.push(c.toArray()));return c};
jspb.Message.toMap=function(a,b,c,d){for(var e={},f=0;f<a.length;f++)e[b.call(a[f])]=c?c.call(a[f],d,a[f]):a[f];return e};jspb.Message.prototype.syncMapFields_=function(){if(this.wrappers_)for(var a in this.wrappers_){var b=this.wrappers_[a];if(goog.isArray(b))for(var c=0;c<b.length;c++)b[c]&&b[c].toArray();else b&&b.toArray()}};jspb.Message.prototype.toArray=function(){this.syncMapFields_();return this.array};
jspb.Message.GENERATE_TO_STRING&&(jspb.Message.prototype.toString=function(){this.syncMapFields_();return this.array.toString()});
jspb.Message.prototype.getExtension=function(a){if(this.extensionObject_){this.wrappers_||(this.wrappers_={});var b=a.fieldIndex;if(a.isRepeated){if(a.isMessageType())return this.wrappers_[b]||(this.wrappers_[b]=goog.array.map(this.extensionObject_[b]||[],function(b){return new a.ctor(b)})),this.wrappers_[b]}else if(a.isMessageType())return!this.wrappers_[b]&&this.extensionObject_[b]&&(this.wrappers_[b]=new a.ctor(this.extensionObject_[b])),this.wrappers_[b];return this.extensionObject_[b]}};
jspb.Message.prototype.setExtension=function(a,b){this.wrappers_||(this.wrappers_={});jspb.Message.maybeInitEmptyExtensionObject_(this);var c=a.fieldIndex;a.isRepeated?(b=b||[],a.isMessageType()?(this.wrappers_[c]=b,this.extensionObject_[c]=goog.array.map(b,function(a){return a.toArray()})):this.extensionObject_[c]=b):a.isMessageType()?(this.wrappers_[c]=b,this.extensionObject_[c]=b?b.toArray():b):this.extensionObject_[c]=b;return this};
jspb.Message.difference=function(a,b){if(!(a instanceof b.constructor))throw Error("Messages have different types.");var c=a.toArray(),d=b.toArray(),e=[],f=0,g=c.length>d.length?c.length:d.length;a.getJsPbMessageId()&&(e[0]=a.getJsPbMessageId(),f=1);for(;f<g;f++)jspb.Message.compareFields(c[f],d[f])||(e[f]=d[f]);return new a.constructor(e)};jspb.Message.equals=function(a,b){return a==b||!(!a||!b)&&a instanceof b.constructor&&jspb.Message.compareFields(a.toArray(),b.toArray())};
jspb.Message.compareExtensions=function(a,b){a=a||{};b=b||{};var c={},d;for(d in a)c[d]=0;for(d in b)c[d]=0;for(d in c)if(!jspb.Message.compareFields(a[d],b[d]))return!1;return!0};
jspb.Message.compareFields=function(a,b){if(a==b)return!0;if(!goog.isObject(a)||!goog.isObject(b)||a.constructor!=b.constructor)return!1;if(jspb.Message.SUPPORTS_UINT8ARRAY_&&a.constructor===Uint8Array){if(a.length!=b.length)return!1;for(var c=0;c<a.length;c++)if(a[c]!=b[c])return!1;return!0}if(a.constructor===Array){for(var d=void 0,e=void 0,f=Math.max(a.length,b.length),c=0;c<f;c++){var g=a[c],h=b[c];g&&g.constructor==Object&&(goog.asserts.assert(void 0===d),goog.asserts.assert(c===a.length-1),
d=g,g=void 0);h&&h.constructor==Object&&(goog.asserts.assert(void 0===e),goog.asserts.assert(c===b.length-1),e=h,h=void 0);if(!jspb.Message.compareFields(g,h))return!1}return d||e?(d=d||{},e=e||{},jspb.Message.compareExtensions(d,e)):!0}if(a.constructor===Object)return jspb.Message.compareExtensions(a,b);throw Error("Invalid type in JSPB array");};jspb.Message.prototype.cloneMessage=function(){return jspb.Message.cloneMessage(this)};jspb.Message.prototype.clone=function(){return jspb.Message.cloneMessage(this)};
jspb.Message.clone=function(a){return jspb.Message.cloneMessage(a)};jspb.Message.cloneMessage=function(a){return new a.constructor(jspb.Message.clone_(a.toArray()))};
jspb.Message.copyInto=function(a,b){goog.asserts.assertInstanceof(a,jspb.Message);goog.asserts.assertInstanceof(b,jspb.Message);goog.asserts.assert(a.constructor==b.constructor,"Copy source and target message should have the same type.");for(var c=jspb.Message.clone(a),d=b.toArray(),e=c.toArray(),f=d.length=0;f<e.length;f++)d[f]=e[f];b.wrappers_=c.wrappers_;b.extensionObject_=c.extensionObject_};
jspb.Message.clone_=function(a){var b;if(goog.isArray(a)){for(var c=Array(a.length),d=0;d<a.length;d++)null!=(b=a[d])&&(c[d]="object"==typeof b?jspb.Message.clone_(b):b);return c}if(jspb.Message.SUPPORTS_UINT8ARRAY_&&a instanceof Uint8Array)return new Uint8Array(a);c={};for(d in a)null!=(b=a[d])&&(c[d]="object"==typeof b?jspb.Message.clone_(b):b);return c};jspb.Message.registerMessageType=function(a,b){jspb.Message.registry_[a]=b;b.messageId=a};jspb.Message.registry_={};
jspb.Message.messageSetExtensions={};jspb.Message.messageSetExtensionsBinary={};jspb.BinaryConstants={};jspb.ConstBinaryMessage=function(){};jspb.BinaryMessage=function(){};jspb.BinaryConstants.FieldType={INVALID:-1,DOUBLE:1,FLOAT:2,INT64:3,UINT64:4,INT32:5,FIXED64:6,FIXED32:7,BOOL:8,STRING:9,GROUP:10,MESSAGE:11,BYTES:12,UINT32:13,ENUM:14,SFIXED32:15,SFIXED64:16,SINT32:17,SINT64:18,FHASH64:30,VHASH64:31};jspb.BinaryConstants.WireType={INVALID:-1,VARINT:0,FIXED64:1,DELIMITED:2,START_GROUP:3,END_GROUP:4,FIXED32:5};
jspb.BinaryConstants.FieldTypeToWireType=function(a){var b=jspb.BinaryConstants.FieldType,c=jspb.BinaryConstants.WireType;switch(a){case b.INT32:case b.INT64:case b.UINT32:case b.UINT64:case b.SINT32:case b.SINT64:case b.BOOL:case b.ENUM:case b.VHASH64:return c.VARINT;case b.DOUBLE:case b.FIXED64:case b.SFIXED64:case b.FHASH64:return c.FIXED64;case b.STRING:case b.MESSAGE:case b.BYTES:return c.DELIMITED;case b.FLOAT:case b.FIXED32:case b.SFIXED32:return c.FIXED32;default:return c.INVALID}};
jspb.BinaryConstants.INVALID_FIELD_NUMBER=-1;jspb.BinaryConstants.FLOAT32_EPS=1.401298464324817E-45;jspb.BinaryConstants.FLOAT32_MIN=1.1754943508222875E-38;jspb.BinaryConstants.FLOAT32_MAX=3.4028234663852886E38;jspb.BinaryConstants.FLOAT64_EPS=4.9E-324;jspb.BinaryConstants.FLOAT64_MIN=2.2250738585072014E-308;jspb.BinaryConstants.FLOAT64_MAX=1.7976931348623157E308;jspb.BinaryConstants.TWO_TO_20=1048576;jspb.BinaryConstants.TWO_TO_23=8388608;jspb.BinaryConstants.TWO_TO_31=2147483648;
jspb.BinaryConstants.TWO_TO_32=4294967296;jspb.BinaryConstants.TWO_TO_52=4503599627370496;jspb.BinaryConstants.TWO_TO_63=0x7fffffffffffffff;jspb.BinaryConstants.TWO_TO_64=1.8446744073709552E19;jspb.BinaryConstants.ZERO_HASH="\x00\x00\x00\x00\x00\x00\x00\x00";jspb.utils={};jspb.utils.split64Low=0;jspb.utils.split64High=0;jspb.utils.splitUint64=function(a){var b=a>>>0;a=Math.floor((a-b)/jspb.BinaryConstants.TWO_TO_32)>>>0;jspb.utils.split64Low=b;jspb.utils.split64High=a};jspb.utils.splitInt64=function(a){var b=0>a;a=Math.abs(a);var c=a>>>0;a=Math.floor((a-c)/jspb.BinaryConstants.TWO_TO_32);a>>>=0;b&&(a=~a>>>0,c=(~c>>>0)+1,4294967295<c&&(c=0,a++,4294967295<a&&(a=0)));jspb.utils.split64Low=c;jspb.utils.split64High=a};
jspb.utils.splitZigzag64=function(a){var b=0>a;a=2*Math.abs(a);jspb.utils.splitUint64(a);a=jspb.utils.split64Low;var c=jspb.utils.split64High;b&&(0==a?0==c?c=a=4294967295:(c--,a=4294967295):a--);jspb.utils.split64Low=a;jspb.utils.split64High=c};
jspb.utils.splitFloat32=function(a){var b=0>a?1:0;a=b?-a:a;var c;0===a?0<1/a?(jspb.utils.split64High=0,jspb.utils.split64Low=0):(jspb.utils.split64High=0,jspb.utils.split64Low=2147483648):isNaN(a)?(jspb.utils.split64High=0,jspb.utils.split64Low=2147483647):a>jspb.BinaryConstants.FLOAT32_MAX?(jspb.utils.split64High=0,jspb.utils.split64Low=(b<<31|2139095040)>>>0):a<jspb.BinaryConstants.FLOAT32_MIN?(a=Math.round(a/Math.pow(2,-149)),jspb.utils.split64High=0,jspb.utils.split64Low=(b<<31|a)>>>0):(c=Math.floor(Math.log(a)/
Math.LN2),a*=Math.pow(2,-c),a=Math.round(a*jspb.BinaryConstants.TWO_TO_23)&8388607,jspb.utils.split64High=0,jspb.utils.split64Low=(b<<31|c+127<<23|a)>>>0)};
jspb.utils.splitFloat64=function(a){var b=0>a?1:0;a=b?-a:a;if(0===a)jspb.utils.split64High=0<1/a?0:2147483648,jspb.utils.split64Low=0;else if(isNaN(a))jspb.utils.split64High=2147483647,jspb.utils.split64Low=4294967295;else if(a>jspb.BinaryConstants.FLOAT64_MAX)jspb.utils.split64High=(b<<31|2146435072)>>>0,jspb.utils.split64Low=0;else if(a<jspb.BinaryConstants.FLOAT64_MIN){var c=a/Math.pow(2,-1074);a=c/jspb.BinaryConstants.TWO_TO_32;jspb.utils.split64High=(b<<31|a)>>>0;jspb.utils.split64Low=c>>>0}else{var d=
Math.floor(Math.log(a)/Math.LN2);1024==d&&(d=1023);c=a*Math.pow(2,-d);a=c*jspb.BinaryConstants.TWO_TO_20&1048575;c=c*jspb.BinaryConstants.TWO_TO_52>>>0;jspb.utils.split64High=(b<<31|d+1023<<20|a)>>>0;jspb.utils.split64Low=c}};
jspb.utils.splitHash64=function(a){var b=a.charCodeAt(0),c=a.charCodeAt(1),d=a.charCodeAt(2),e=a.charCodeAt(3),f=a.charCodeAt(4),g=a.charCodeAt(5),h=a.charCodeAt(6);a=a.charCodeAt(7);jspb.utils.split64Low=b+(c<<8)+(d<<16)+(e<<24)>>>0;jspb.utils.split64High=f+(g<<8)+(h<<16)+(a<<24)>>>0};jspb.utils.joinUint64=function(a,b){return b*jspb.BinaryConstants.TWO_TO_32+a};
jspb.utils.joinInt64=function(a,b){var c=b&2147483648;c&&(a=~a+1>>>0,b=~b>>>0,0==a&&(b=b+1>>>0));var d=jspb.utils.joinUint64(a,b);return c?-d:d};jspb.utils.joinZigzag64=function(a,b){var c=a&1;a=(a>>>1|b<<31)>>>0;b>>>=1;c&&(a=a+1>>>0,0==a&&(b=b+1>>>0));var d=jspb.utils.joinUint64(a,b);return c?-d:d};jspb.utils.joinFloat32=function(a,b){var c=2*(a>>31)+1,d=a>>>23&255,e=a&8388607;return 255==d?e?NaN:Infinity*c:0==d?c*Math.pow(2,-149)*e:c*Math.pow(2,d-150)*(e+Math.pow(2,23))};
jspb.utils.joinFloat64=function(a,b){var c=2*(b>>31)+1,d=b>>>20&2047,e=jspb.BinaryConstants.TWO_TO_32*(b&1048575)+a;return 2047==d?e?NaN:Infinity*c:0==d?c*Math.pow(2,-1074)*e:c*Math.pow(2,d-1075)*(e+jspb.BinaryConstants.TWO_TO_52)};jspb.utils.joinHash64=function(a,b){return String.fromCharCode(a>>>0&255,a>>>8&255,a>>>16&255,a>>>24&255,b>>>0&255,b>>>8&255,b>>>16&255,b>>>24&255)};jspb.utils.DIGITS="0123456789abcdef".split("");
jspb.utils.joinUnsignedDecimalString=function(a,b){function c(a){for(var b=1E7,c=0;7>c;c++){var b=b/10,d=a/b%10>>>0;if(0!=d||h)h=!0,k+=g[d]}}if(2097151>=b)return""+(jspb.BinaryConstants.TWO_TO_32*b+a);var d=(a>>>24|b<<8)>>>0&16777215,e=b>>16&65535,f=(a&16777215)+6777216*d+6710656*e,d=d+8147497*e,e=2*e;1E7<=f&&(d+=Math.floor(f/1E7),f%=1E7);1E7<=d&&(e+=Math.floor(d/1E7),d%=1E7);var g=jspb.utils.DIGITS,h=!1,k="";(e||h)&&c(e);(d||h)&&c(d);(f||h)&&c(f);return k};
jspb.utils.joinSignedDecimalString=function(a,b){var c=b&2147483648;c&&(a=~a+1>>>0,b=~b+(0==a?1:0)>>>0);var d=jspb.utils.joinUnsignedDecimalString(a,b);return c?"-"+d:d};jspb.utils.hash64ToDecimalString=function(a,b){jspb.utils.splitHash64(a);var c=jspb.utils.split64Low,d=jspb.utils.split64High;return b?jspb.utils.joinSignedDecimalString(c,d):jspb.utils.joinUnsignedDecimalString(c,d)};
jspb.utils.hash64ArrayToDecimalStrings=function(a,b){for(var c=Array(a.length),d=0;d<a.length;d++)c[d]=jspb.utils.hash64ToDecimalString(a[d],b);return c};
jspb.utils.decimalStringToHash64=function(a){function b(a,b){for(var c=0;8>c&&(1!==a||0<b);c++){var d=a*e[c]+b;e[c]=d&255;b=d>>>8}}function c(){for(var a=0;8>a;a++)e[a]=~e[a]&255}goog.asserts.assert(0<a.length);var d=!1;"-"===a[0]&&(d=!0,a=a.slice(1));for(var e=[0,0,0,0,0,0,0,0],f=0;f<a.length;f++)b(10,jspb.utils.DIGITS.indexOf(a[f]));d&&(c(),b(1,1));return String.fromCharCode.apply(null,e)};jspb.utils.splitDecimalString=function(a){jspb.utils.splitHash64(jspb.utils.decimalStringToHash64(a))};
jspb.utils.hash64ToHexString=function(a){var b=Array(18);b[0]="0";b[1]="x";for(var c=0;8>c;c++){var d=a.charCodeAt(7-c);b[2*c+2]=jspb.utils.DIGITS[d>>4];b[2*c+3]=jspb.utils.DIGITS[d&15]}return b.join("")};jspb.utils.hexStringToHash64=function(a){a=a.toLowerCase();goog.asserts.assert(18==a.length);goog.asserts.assert("0"==a[0]);goog.asserts.assert("x"==a[1]);for(var b="",c=0;8>c;c++)var d=jspb.utils.DIGITS.indexOf(a[2*c+2]),e=jspb.utils.DIGITS.indexOf(a[2*c+3]),b=String.fromCharCode(16*d+e)+b;return b};
jspb.utils.hash64ToNumber=function(a,b){jspb.utils.splitHash64(a);var c=jspb.utils.split64Low,d=jspb.utils.split64High;return b?jspb.utils.joinInt64(c,d):jspb.utils.joinUint64(c,d)};jspb.utils.numberToHash64=function(a){jspb.utils.splitInt64(a);return jspb.utils.joinHash64(jspb.utils.split64Low,jspb.utils.split64High)};jspb.utils.countVarints=function(a,b,c){for(var d=0,e=b;e<c;e++)d+=a[e]>>7;return c-b-d};
jspb.utils.countVarintFields=function(a,b,c,d){var e=0;d=8*d+jspb.BinaryConstants.WireType.VARINT;if(128>d)for(;b<c&&a[b++]==d;)for(e++;;){var f=a[b++];if(0==(f&128))break}else for(;b<c;){for(f=d;128<f;){if(a[b]!=(f&127|128))return e;b++;f>>=7}if(a[b++]!=f)break;for(e++;f=a[b++],0!=(f&128););}return e};jspb.utils.countFixedFields_=function(a,b,c,d,e){var f=0;if(128>d)for(;b<c&&a[b++]==d;)f++,b+=e;else for(;b<c;){for(var g=d;128<g;){if(a[b++]!=(g&127|128))return f;g>>=7}if(a[b++]!=g)break;f++;b+=e}return f};
jspb.utils.countFixed32Fields=function(a,b,c,d){return jspb.utils.countFixedFields_(a,b,c,8*d+jspb.BinaryConstants.WireType.FIXED32,4)};jspb.utils.countFixed64Fields=function(a,b,c,d){return jspb.utils.countFixedFields_(a,b,c,8*d+jspb.BinaryConstants.WireType.FIXED64,8)};
jspb.utils.countDelimitedFields=function(a,b,c,d){var e=0;for(d=8*d+jspb.BinaryConstants.WireType.DELIMITED;b<c;){for(var f=d;128<f;){if(a[b++]!=(f&127|128))return e;f>>=7}if(a[b++]!=f)break;e++;for(var g=0,h=1;f=a[b++],g+=(f&127)*h,h*=128,0!=(f&128););b+=g}return e};jspb.utils.debugBytesToTextFormat=function(a){var b='"';if(a){a=jspb.utils.byteSourceToUint8Array(a);for(var c=0;c<a.length;c++)b+="\\x",16>a[c]&&(b+="0"),b+=a[c].toString(16)}return b+'"'};
jspb.utils.debugScalarToTextFormat=function(a){return goog.isString(a)?goog.string.quote(a):a.toString()};jspb.utils.stringToByteArray=function(a){for(var b=new Uint8Array(a.length),c=0;c<a.length;c++){var d=a.charCodeAt(c);if(255<d)throw Error("Conversion error: string contains codepoint outside of byte range");b[c]=d}return b};
jspb.utils.byteSourceToUint8Array=function(a){if(a.constructor===Uint8Array)return a;if(a.constructor===ArrayBuffer||a.constructor===Array)return new Uint8Array(a);if(a.constructor===String)return goog.crypt.base64.decodeStringToUint8Array(a);goog.asserts.fail("Type not convertible to Uint8Array.");return new Uint8Array(0)};jspb.BinaryIterator=function(a,b,c){this.elements_=this.nextMethod_=this.decoder_=null;this.cursor_=0;this.nextValue_=null;this.atEnd_=!0;this.init_(a,b,c)};jspb.BinaryIterator.prototype.init_=function(a,b,c){a&&b&&(this.decoder_=a,this.nextMethod_=b);this.elements_=c?c:null;this.cursor_=0;this.nextValue_=null;this.atEnd_=!this.decoder_&&!this.elements_;this.next()};jspb.BinaryIterator.instanceCache_=[];
jspb.BinaryIterator.alloc=function(a,b,c){if(jspb.BinaryIterator.instanceCache_.length){var d=jspb.BinaryIterator.instanceCache_.pop();d.init_(a,b,c);return d}return new jspb.BinaryIterator(a,b,c)};jspb.BinaryIterator.prototype.free=function(){this.clear();100>jspb.BinaryIterator.instanceCache_.length&&jspb.BinaryIterator.instanceCache_.push(this)};
jspb.BinaryIterator.prototype.clear=function(){this.decoder_&&this.decoder_.free();this.elements_=this.nextMethod_=this.decoder_=null;this.cursor_=0;this.nextValue_=null;this.atEnd_=!0};jspb.BinaryIterator.prototype.get=function(){return this.nextValue_};jspb.BinaryIterator.prototype.atEnd=function(){return this.atEnd_};
jspb.BinaryIterator.prototype.next=function(){var a=this.nextValue_;this.decoder_?this.decoder_.atEnd()?(this.nextValue_=null,this.atEnd_=!0):this.nextValue_=this.nextMethod_.call(this.decoder_):this.elements_&&(this.cursor_==this.elements_.length?(this.nextValue_=null,this.atEnd_=!0):this.nextValue_=this.elements_[this.cursor_++]);return a};jspb.BinaryDecoder=function(a,b,c){this.bytes_=null;this.tempHigh_=this.tempLow_=this.cursor_=this.end_=this.start_=0;this.error_=!1;a&&this.setBlock(a,b,c)};
jspb.BinaryDecoder.instanceCache_=[];jspb.BinaryDecoder.alloc=function(a,b,c){if(jspb.BinaryDecoder.instanceCache_.length){var d=jspb.BinaryDecoder.instanceCache_.pop();a&&d.setBlock(a,b,c);return d}return new jspb.BinaryDecoder(a,b,c)};jspb.BinaryDecoder.prototype.free=function(){this.clear();100>jspb.BinaryDecoder.instanceCache_.length&&jspb.BinaryDecoder.instanceCache_.push(this)};jspb.BinaryDecoder.prototype.clone=function(){return jspb.BinaryDecoder.alloc(this.bytes_,this.start_,this.end_-this.start_)};
jspb.BinaryDecoder.prototype.clear=function(){this.bytes_=null;this.cursor_=this.end_=this.start_=0;this.error_=!1};jspb.BinaryDecoder.prototype.getBuffer=function(){return this.bytes_};jspb.BinaryDecoder.prototype.setBlock=function(a,b,c){this.bytes_=jspb.utils.byteSourceToUint8Array(a);this.start_=goog.isDef(b)?b:0;this.end_=goog.isDef(c)?this.start_+c:this.bytes_.length;this.cursor_=this.start_};jspb.BinaryDecoder.prototype.getEnd=function(){return this.end_};
jspb.BinaryDecoder.prototype.setEnd=function(a){this.end_=a};jspb.BinaryDecoder.prototype.reset=function(){this.cursor_=this.start_};jspb.BinaryDecoder.prototype.getCursor=function(){return this.cursor_};jspb.BinaryDecoder.prototype.setCursor=function(a){this.cursor_=a};jspb.BinaryDecoder.prototype.advance=function(a){this.cursor_+=a;goog.asserts.assert(this.cursor_<=this.end_)};jspb.BinaryDecoder.prototype.atEnd=function(){return this.cursor_==this.end_};
jspb.BinaryDecoder.prototype.pastEnd=function(){return this.cursor_>this.end_};jspb.BinaryDecoder.prototype.getError=function(){return this.error_||0>this.cursor_||this.cursor_>this.end_};
jspb.BinaryDecoder.prototype.readSplitVarint64_=function(){for(var a,b=0,c,d=0;4>d;d++)if(a=this.bytes_[this.cursor_++],b|=(a&127)<<7*d,128>a){this.tempLow_=b>>>0;this.tempHigh_=0;return}a=this.bytes_[this.cursor_++];b|=(a&127)<<28;c=0|(a&127)>>4;if(128>a)this.tempLow_=b>>>0,this.tempHigh_=c>>>0;else{for(d=0;5>d;d++)if(a=this.bytes_[this.cursor_++],c|=(a&127)<<7*d+3,128>a){this.tempLow_=b>>>0;this.tempHigh_=c>>>0;return}goog.asserts.fail("Failed to read varint, encoding is invalid.");this.error_=
!0}};jspb.BinaryDecoder.prototype.skipVarint=function(){for(;this.bytes_[this.cursor_]&128;)this.cursor_++;this.cursor_++};jspb.BinaryDecoder.prototype.unskipVarint=function(a){for(;128<a;)this.cursor_--,a>>>=7;this.cursor_--};
jspb.BinaryDecoder.prototype.readUnsignedVarint32=function(){var a,b=this.bytes_;a=b[this.cursor_+0];var c=a&127;if(128>a)return this.cursor_+=1,goog.asserts.assert(this.cursor_<=this.end_),c;a=b[this.cursor_+1];c|=(a&127)<<7;if(128>a)return this.cursor_+=2,goog.asserts.assert(this.cursor_<=this.end_),c;a=b[this.cursor_+2];c|=(a&127)<<14;if(128>a)return this.cursor_+=3,goog.asserts.assert(this.cursor_<=this.end_),c;a=b[this.cursor_+3];c|=(a&127)<<21;if(128>a)return this.cursor_+=4,goog.asserts.assert(this.cursor_<=
this.end_),c;a=b[this.cursor_+4];c|=(a&15)<<28;if(128>a)return goog.asserts.assert(0==(a&240)),this.cursor_+=5,goog.asserts.assert(this.cursor_<=this.end_),c>>>0;goog.asserts.assert(240==(a&240));goog.asserts.assert(255==b[this.cursor_+5]);goog.asserts.assert(255==b[this.cursor_+6]);goog.asserts.assert(255==b[this.cursor_+7]);goog.asserts.assert(255==b[this.cursor_+8]);goog.asserts.assert(1==b[this.cursor_+9]);this.cursor_+=10;goog.asserts.assert(this.cursor_<=this.end_);return c};
jspb.BinaryDecoder.prototype.readSignedVarint32=jspb.BinaryDecoder.prototype.readUnsignedVarint32;jspb.BinaryDecoder.prototype.readUnsignedVarint32String=function(){return this.readUnsignedVarint32().toString()};jspb.BinaryDecoder.prototype.readSignedVarint32String=function(){return this.readSignedVarint32().toString()};jspb.BinaryDecoder.prototype.readZigzagVarint32=function(){var a=this.readUnsignedVarint32();return a>>>1^-(a&1)};
jspb.BinaryDecoder.prototype.readUnsignedVarint64=function(){this.readSplitVarint64_();return jspb.utils.joinUint64(this.tempLow_,this.tempHigh_)};jspb.BinaryDecoder.prototype.readUnsignedVarint64String=function(){this.readSplitVarint64_();return jspb.utils.joinUnsignedDecimalString(this.tempLow_,this.tempHigh_)};jspb.BinaryDecoder.prototype.readSignedVarint64=function(){this.readSplitVarint64_();return jspb.utils.joinInt64(this.tempLow_,this.tempHigh_)};
jspb.BinaryDecoder.prototype.readSignedVarint64String=function(){this.readSplitVarint64_();return jspb.utils.joinSignedDecimalString(this.tempLow_,this.tempHigh_)};jspb.BinaryDecoder.prototype.readZigzagVarint64=function(){this.readSplitVarint64_();return jspb.utils.joinZigzag64(this.tempLow_,this.tempHigh_)};jspb.BinaryDecoder.prototype.readZigzagVarint64String=function(){return this.readZigzagVarint64().toString()};
jspb.BinaryDecoder.prototype.readUint8=function(){var a=this.bytes_[this.cursor_+0];this.cursor_+=1;goog.asserts.assert(this.cursor_<=this.end_);return a};jspb.BinaryDecoder.prototype.readUint16=function(){var a=this.bytes_[this.cursor_+0],b=this.bytes_[this.cursor_+1];this.cursor_+=2;goog.asserts.assert(this.cursor_<=this.end_);return a<<0|b<<8};
jspb.BinaryDecoder.prototype.readUint32=function(){var a=this.bytes_[this.cursor_+0],b=this.bytes_[this.cursor_+1],c=this.bytes_[this.cursor_+2],d=this.bytes_[this.cursor_+3];this.cursor_+=4;goog.asserts.assert(this.cursor_<=this.end_);return(a<<0|b<<8|c<<16|d<<24)>>>0};jspb.BinaryDecoder.prototype.readUint64=function(){var a=this.readUint32(),b=this.readUint32();return jspb.utils.joinUint64(a,b)};
jspb.BinaryDecoder.prototype.readUint64String=function(){var a=this.readUint32(),b=this.readUint32();return jspb.utils.joinUnsignedDecimalString(a,b)};jspb.BinaryDecoder.prototype.readInt8=function(){var a=this.bytes_[this.cursor_+0];this.cursor_+=1;goog.asserts.assert(this.cursor_<=this.end_);return a<<24>>24};
jspb.BinaryDecoder.prototype.readInt16=function(){var a=this.bytes_[this.cursor_+0],b=this.bytes_[this.cursor_+1];this.cursor_+=2;goog.asserts.assert(this.cursor_<=this.end_);return(a<<0|b<<8)<<16>>16};jspb.BinaryDecoder.prototype.readInt32=function(){var a=this.bytes_[this.cursor_+0],b=this.bytes_[this.cursor_+1],c=this.bytes_[this.cursor_+2],d=this.bytes_[this.cursor_+3];this.cursor_+=4;goog.asserts.assert(this.cursor_<=this.end_);return a<<0|b<<8|c<<16|d<<24};
jspb.BinaryDecoder.prototype.readInt64=function(){var a=this.readUint32(),b=this.readUint32();return jspb.utils.joinInt64(a,b)};jspb.BinaryDecoder.prototype.readInt64String=function(){var a=this.readUint32(),b=this.readUint32();return jspb.utils.joinSignedDecimalString(a,b)};jspb.BinaryDecoder.prototype.readFloat=function(){var a=this.readUint32();return jspb.utils.joinFloat32(a,0)};
jspb.BinaryDecoder.prototype.readDouble=function(){var a=this.readUint32(),b=this.readUint32();return jspb.utils.joinFloat64(a,b)};jspb.BinaryDecoder.prototype.readBool=function(){return!!this.bytes_[this.cursor_++]};jspb.BinaryDecoder.prototype.readEnum=function(){return this.readSignedVarint32()};
jspb.BinaryDecoder.prototype.readString=function(a){var b=this.bytes_,c=this.cursor_;a=c+a;for(var d=[];c<a;){var e=b[c++];if(128>e)d.push(e);else if(!(192>e))if(224>e){var f=b[c++];d.push((e&31)<<6|f&63)}else if(240>e){var f=b[c++],g=b[c++];d.push((e&15)<<12|(f&63)<<6|g&63)}else if(248>e){var f=b[c++],g=b[c++],h=b[c++],e=(e&7)<<18|(f&63)<<12|(g&63)<<6|h&63,e=e-65536;d.push((e>>10&1023)+55296,(e&1023)+56320)}}b=String.fromCharCode.apply(null,d);this.cursor_=c;return b};
jspb.BinaryDecoder.prototype.readStringWithLength=function(){var a=this.readUnsignedVarint32();return this.readString(a)};jspb.BinaryDecoder.prototype.readBytes=function(a){if(0>a||this.cursor_+a>this.bytes_.length)return this.error_=!0,goog.asserts.fail("Invalid byte length!"),new Uint8Array(0);var b=this.bytes_.subarray(this.cursor_,this.cursor_+a);this.cursor_+=a;goog.asserts.assert(this.cursor_<=this.end_);return b};
jspb.BinaryDecoder.prototype.readVarintHash64=function(){this.readSplitVarint64_();return jspb.utils.joinHash64(this.tempLow_,this.tempHigh_)};jspb.BinaryDecoder.prototype.readFixedHash64=function(){var a=this.bytes_,b=this.cursor_,c=a[b+0],d=a[b+1],e=a[b+2],f=a[b+3],g=a[b+4],h=a[b+5],k=a[b+6],a=a[b+7];this.cursor_+=8;return String.fromCharCode(c,d,e,f,g,h,k,a)};jspb.BinaryReader=function(a,b,c){this.decoder_=jspb.BinaryDecoder.alloc(a,b,c);this.fieldCursor_=this.decoder_.getCursor();this.nextField_=jspb.BinaryConstants.INVALID_FIELD_NUMBER;this.nextWireType_=jspb.BinaryConstants.WireType.INVALID;this.error_=!1;this.readCallbacks_=null};jspb.BinaryReader.instanceCache_=[];
jspb.BinaryReader.alloc=function(a,b,c){if(jspb.BinaryReader.instanceCache_.length){var d=jspb.BinaryReader.instanceCache_.pop();a&&d.decoder_.setBlock(a,b,c);return d}return new jspb.BinaryReader(a,b,c)};jspb.BinaryReader.prototype.alloc=jspb.BinaryReader.alloc;
jspb.BinaryReader.prototype.free=function(){this.decoder_.clear();this.nextField_=jspb.BinaryConstants.INVALID_FIELD_NUMBER;this.nextWireType_=jspb.BinaryConstants.WireType.INVALID;this.error_=!1;this.readCallbacks_=null;100>jspb.BinaryReader.instanceCache_.length&&jspb.BinaryReader.instanceCache_.push(this)};jspb.BinaryReader.prototype.getFieldCursor=function(){return this.fieldCursor_};jspb.BinaryReader.prototype.getCursor=function(){return this.decoder_.getCursor()};
jspb.BinaryReader.prototype.getBuffer=function(){return this.decoder_.getBuffer()};jspb.BinaryReader.prototype.getFieldNumber=function(){return this.nextField_};jspb.BinaryReader.prototype.getWireType=function(){return this.nextWireType_};jspb.BinaryReader.prototype.isEndGroup=function(){return this.nextWireType_==jspb.BinaryConstants.WireType.END_GROUP};jspb.BinaryReader.prototype.getError=function(){return this.error_||this.decoder_.getError()};
jspb.BinaryReader.prototype.setBlock=function(a,b,c){this.decoder_.setBlock(a,b,c);this.nextField_=jspb.BinaryConstants.INVALID_FIELD_NUMBER;this.nextWireType_=jspb.BinaryConstants.WireType.INVALID};jspb.BinaryReader.prototype.reset=function(){this.decoder_.reset();this.nextField_=jspb.BinaryConstants.INVALID_FIELD_NUMBER;this.nextWireType_=jspb.BinaryConstants.WireType.INVALID};jspb.BinaryReader.prototype.advance=function(a){this.decoder_.advance(a)};
jspb.BinaryReader.prototype.nextField=function(){if(this.decoder_.atEnd())return!1;if(this.getError())return goog.asserts.fail("Decoder hit an error"),!1;this.fieldCursor_=this.decoder_.getCursor();var a=this.decoder_.readUnsignedVarint32(),b=a>>>3,a=a&7;if(a!=jspb.BinaryConstants.WireType.VARINT&&a!=jspb.BinaryConstants.WireType.FIXED32&&a!=jspb.BinaryConstants.WireType.FIXED64&&a!=jspb.BinaryConstants.WireType.DELIMITED&&a!=jspb.BinaryConstants.WireType.START_GROUP&&a!=jspb.BinaryConstants.WireType.END_GROUP)return goog.asserts.fail("Invalid wire type"),
this.error_=!0,!1;this.nextField_=b;this.nextWireType_=a;return!0};jspb.BinaryReader.prototype.unskipHeader=function(){this.decoder_.unskipVarint(this.nextField_<<3|this.nextWireType_)};jspb.BinaryReader.prototype.skipMatchingFields=function(){var a=this.nextField_;for(this.unskipHeader();this.nextField()&&this.getFieldNumber()==a;)this.skipField();this.decoder_.atEnd()||this.unskipHeader()};
jspb.BinaryReader.prototype.skipVarintField=function(){this.nextWireType_!=jspb.BinaryConstants.WireType.VARINT?(goog.asserts.fail("Invalid wire type for skipVarintField"),this.skipField()):this.decoder_.skipVarint()};jspb.BinaryReader.prototype.skipDelimitedField=function(){if(this.nextWireType_!=jspb.BinaryConstants.WireType.DELIMITED)goog.asserts.fail("Invalid wire type for skipDelimitedField"),this.skipField();else{var a=this.decoder_.readUnsignedVarint32();this.decoder_.advance(a)}};
jspb.BinaryReader.prototype.skipFixed32Field=function(){this.nextWireType_!=jspb.BinaryConstants.WireType.FIXED32?(goog.asserts.fail("Invalid wire type for skipFixed32Field"),this.skipField()):this.decoder_.advance(4)};jspb.BinaryReader.prototype.skipFixed64Field=function(){this.nextWireType_!=jspb.BinaryConstants.WireType.FIXED64?(goog.asserts.fail("Invalid wire type for skipFixed64Field"),this.skipField()):this.decoder_.advance(8)};
jspb.BinaryReader.prototype.skipGroup=function(){var a=[this.nextField_];do{if(!this.nextField()){goog.asserts.fail("Unmatched start-group tag: stream EOF");this.error_=!0;break}if(this.nextWireType_==jspb.BinaryConstants.WireType.START_GROUP)a.push(this.nextField_);else if(this.nextWireType_==jspb.BinaryConstants.WireType.END_GROUP&&this.nextField_!=a.pop()){goog.asserts.fail("Unmatched end-group tag");this.error_=!0;break}}while(0<a.length)};
jspb.BinaryReader.prototype.skipField=function(){switch(this.nextWireType_){case jspb.BinaryConstants.WireType.VARINT:this.skipVarintField();break;case jspb.BinaryConstants.WireType.FIXED64:this.skipFixed64Field();break;case jspb.BinaryConstants.WireType.DELIMITED:this.skipDelimitedField();break;case jspb.BinaryConstants.WireType.FIXED32:this.skipFixed32Field();break;case jspb.BinaryConstants.WireType.START_GROUP:this.skipGroup();break;default:goog.asserts.fail("Invalid wire encoding for field.")}};
jspb.BinaryReader.prototype.registerReadCallback=function(a,b){goog.isNull(this.readCallbacks_)&&(this.readCallbacks_={});goog.asserts.assert(!this.readCallbacks_[a]);this.readCallbacks_[a]=b};jspb.BinaryReader.prototype.runReadCallback=function(a){goog.asserts.assert(!goog.isNull(this.readCallbacks_));a=this.readCallbacks_[a];goog.asserts.assert(a);return a(this)};
jspb.BinaryReader.prototype.readAny=function(a){this.nextWireType_=jspb.BinaryConstants.FieldTypeToWireType(a);var b=jspb.BinaryConstants.FieldType;switch(a){case b.DOUBLE:return this.readDouble();case b.FLOAT:return this.readFloat();case b.INT64:return this.readInt64();case b.UINT64:return this.readUint64();case b.INT32:return this.readInt32();case b.FIXED64:return this.readFixed64();case b.FIXED32:return this.readFixed32();case b.BOOL:return this.readBool();case b.STRING:return this.readString();
case b.GROUP:goog.asserts.fail("Group field type not supported in readAny()");case b.MESSAGE:goog.asserts.fail("Message field type not supported in readAny()");case b.BYTES:return this.readBytes();case b.UINT32:return this.readUint32();case b.ENUM:return this.readEnum();case b.SFIXED32:return this.readSfixed32();case b.SFIXED64:return this.readSfixed64();case b.SINT32:return this.readSint32();case b.SINT64:return this.readSint64();case b.FHASH64:return this.readFixedHash64();case b.VHASH64:return this.readVarintHash64();
default:goog.asserts.fail("Invalid field type in readAny()")}return 0};jspb.BinaryReader.prototype.readMessage=function(a,b){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.DELIMITED);var c=this.decoder_.getEnd(),d=this.decoder_.readUnsignedVarint32(),d=this.decoder_.getCursor()+d;this.decoder_.setEnd(d);b(a,this);this.decoder_.setCursor(d);this.decoder_.setEnd(c)};
jspb.BinaryReader.prototype.readGroup=function(a,b,c){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.START_GROUP);goog.asserts.assert(this.nextField_==a);c(b,this);this.error_||this.nextWireType_==jspb.BinaryConstants.WireType.END_GROUP||(goog.asserts.fail("Group submessage did not end with an END_GROUP tag"),this.error_=!0)};
jspb.BinaryReader.prototype.getFieldDecoder=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.DELIMITED);var a=this.decoder_.readUnsignedVarint32(),b=this.decoder_.getCursor(),c=b+a,a=jspb.BinaryDecoder.alloc(this.decoder_.getBuffer(),b,a);this.decoder_.setCursor(c);return a};jspb.BinaryReader.prototype.readInt32=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readSignedVarint32()};
jspb.BinaryReader.prototype.readInt32String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readSignedVarint32String()};jspb.BinaryReader.prototype.readInt64=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readSignedVarint64()};jspb.BinaryReader.prototype.readInt64String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readSignedVarint64String()};
jspb.BinaryReader.prototype.readUint32=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readUnsignedVarint32()};jspb.BinaryReader.prototype.readUint32String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readUnsignedVarint32String()};jspb.BinaryReader.prototype.readUint64=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readUnsignedVarint64()};
jspb.BinaryReader.prototype.readUint64String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readUnsignedVarint64String()};jspb.BinaryReader.prototype.readSint32=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readZigzagVarint32()};jspb.BinaryReader.prototype.readSint64=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readZigzagVarint64()};
jspb.BinaryReader.prototype.readSint64String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readZigzagVarint64String()};jspb.BinaryReader.prototype.readFixed32=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED32);return this.decoder_.readUint32()};jspb.BinaryReader.prototype.readFixed64=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED64);return this.decoder_.readUint64()};
jspb.BinaryReader.prototype.readFixed64String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED64);return this.decoder_.readUint64String()};jspb.BinaryReader.prototype.readSfixed32=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED32);return this.decoder_.readInt32()};jspb.BinaryReader.prototype.readSfixed32String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED32);return this.decoder_.readInt32().toString()};
jspb.BinaryReader.prototype.readSfixed64=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED64);return this.decoder_.readInt64()};jspb.BinaryReader.prototype.readSfixed64String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED64);return this.decoder_.readInt64String()};jspb.BinaryReader.prototype.readFloat=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED32);return this.decoder_.readFloat()};
jspb.BinaryReader.prototype.readDouble=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED64);return this.decoder_.readDouble()};jspb.BinaryReader.prototype.readBool=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return!!this.decoder_.readUnsignedVarint32()};jspb.BinaryReader.prototype.readEnum=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readSignedVarint64()};
jspb.BinaryReader.prototype.readString=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.DELIMITED);var a=this.decoder_.readUnsignedVarint32();return this.decoder_.readString(a)};jspb.BinaryReader.prototype.readBytes=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.DELIMITED);var a=this.decoder_.readUnsignedVarint32();return this.decoder_.readBytes(a)};
jspb.BinaryReader.prototype.readVarintHash64=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readVarintHash64()};jspb.BinaryReader.prototype.readFixedHash64=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED64);return this.decoder_.readFixedHash64()};
jspb.BinaryReader.prototype.readPackedField_=function(a){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.DELIMITED);for(var b=this.decoder_.readUnsignedVarint32(),b=this.decoder_.getCursor()+b,c=[];this.decoder_.getCursor()<b;)c.push(a.call(this.decoder_));return c};jspb.BinaryReader.prototype.readPackedInt32=function(){return this.readPackedField_(this.decoder_.readSignedVarint32)};jspb.BinaryReader.prototype.readPackedInt32String=function(){return this.readPackedField_(this.decoder_.readSignedVarint32String)};
jspb.BinaryReader.prototype.readPackedInt64=function(){return this.readPackedField_(this.decoder_.readSignedVarint64)};jspb.BinaryReader.prototype.readPackedInt64String=function(){return this.readPackedField_(this.decoder_.readSignedVarint64String)};jspb.BinaryReader.prototype.readPackedUint32=function(){return this.readPackedField_(this.decoder_.readUnsignedVarint32)};jspb.BinaryReader.prototype.readPackedUint32String=function(){return this.readPackedField_(this.decoder_.readUnsignedVarint32String)};
jspb.BinaryReader.prototype.readPackedUint64=function(){return this.readPackedField_(this.decoder_.readUnsignedVarint64)};jspb.BinaryReader.prototype.readPackedUint64String=function(){return this.readPackedField_(this.decoder_.readUnsignedVarint64String)};jspb.BinaryReader.prototype.readPackedSint32=function(){return this.readPackedField_(this.decoder_.readZigzagVarint32)};jspb.BinaryReader.prototype.readPackedSint64=function(){return this.readPackedField_(this.decoder_.readZigzagVarint64)};
jspb.BinaryReader.prototype.readPackedSint64String=function(){return this.readPackedField_(this.decoder_.readZigzagVarint64String)};jspb.BinaryReader.prototype.readPackedFixed32=function(){return this.readPackedField_(this.decoder_.readUint32)};jspb.BinaryReader.prototype.readPackedFixed64=function(){return this.readPackedField_(this.decoder_.readUint64)};jspb.BinaryReader.prototype.readPackedFixed64String=function(){return this.readPackedField_(this.decoder_.readUint64String)};
jspb.BinaryReader.prototype.readPackedSfixed32=function(){return this.readPackedField_(this.decoder_.readInt32)};jspb.BinaryReader.prototype.readPackedSfixed64=function(){return this.readPackedField_(this.decoder_.readInt64)};jspb.BinaryReader.prototype.readPackedSfixed64String=function(){return this.readPackedField_(this.decoder_.readInt64String)};jspb.BinaryReader.prototype.readPackedFloat=function(){return this.readPackedField_(this.decoder_.readFloat)};
jspb.BinaryReader.prototype.readPackedDouble=function(){return this.readPackedField_(this.decoder_.readDouble)};jspb.BinaryReader.prototype.readPackedBool=function(){return this.readPackedField_(this.decoder_.readBool)};jspb.BinaryReader.prototype.readPackedEnum=function(){return this.readPackedField_(this.decoder_.readEnum)};jspb.BinaryReader.prototype.readPackedVarintHash64=function(){return this.readPackedField_(this.decoder_.readVarintHash64)};
jspb.BinaryReader.prototype.readPackedFixedHash64=function(){return this.readPackedField_(this.decoder_.readFixedHash64)};jspb.BinaryEncoder=function(){this.buffer_=[]};jspb.BinaryEncoder.prototype.length=function(){return this.buffer_.length};jspb.BinaryEncoder.prototype.end=function(){var a=this.buffer_;this.buffer_=[];return a};
jspb.BinaryEncoder.prototype.writeSplitVarint64=function(a,b){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(b==Math.floor(b));goog.asserts.assert(0<=a&&a<jspb.BinaryConstants.TWO_TO_32);for(goog.asserts.assert(0<=b&&b<jspb.BinaryConstants.TWO_TO_32);0<b||127<a;)this.buffer_.push(a&127|128),a=(a>>>7|b<<25)>>>0,b>>>=7;this.buffer_.push(a)};
jspb.BinaryEncoder.prototype.writeSplitFixed64=function(a,b){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(b==Math.floor(b));goog.asserts.assert(0<=a&&a<jspb.BinaryConstants.TWO_TO_32);goog.asserts.assert(0<=b&&b<jspb.BinaryConstants.TWO_TO_32);this.writeUint32(a);this.writeUint32(b)};
jspb.BinaryEncoder.prototype.writeUnsignedVarint32=function(a){goog.asserts.assert(a==Math.floor(a));for(goog.asserts.assert(0<=a&&a<jspb.BinaryConstants.TWO_TO_32);127<a;)this.buffer_.push(a&127|128),a>>>=7;this.buffer_.push(a)};
jspb.BinaryEncoder.prototype.writeSignedVarint32=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_31&&a<jspb.BinaryConstants.TWO_TO_31);if(0<=a)this.writeUnsignedVarint32(a);else{for(var b=0;9>b;b++)this.buffer_.push(a&127|128),a>>=7;this.buffer_.push(1)}};
jspb.BinaryEncoder.prototype.writeUnsignedVarint64=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(0<=a&&a<jspb.BinaryConstants.TWO_TO_64);jspb.utils.splitInt64(a);this.writeSplitVarint64(jspb.utils.split64Low,jspb.utils.split64High)};
jspb.BinaryEncoder.prototype.writeSignedVarint64=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_63&&a<jspb.BinaryConstants.TWO_TO_63);jspb.utils.splitInt64(a);this.writeSplitVarint64(jspb.utils.split64Low,jspb.utils.split64High)};
jspb.BinaryEncoder.prototype.writeZigzagVarint32=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_31&&a<jspb.BinaryConstants.TWO_TO_31);this.writeUnsignedVarint32((a<<1^a>>31)>>>0)};jspb.BinaryEncoder.prototype.writeZigzagVarint64=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_63&&a<jspb.BinaryConstants.TWO_TO_63);jspb.utils.splitZigzag64(a);this.writeSplitVarint64(jspb.utils.split64Low,jspb.utils.split64High)};
jspb.BinaryEncoder.prototype.writeZigzagVarint64String=function(a){this.writeZigzagVarint64(parseInt(a,10))};jspb.BinaryEncoder.prototype.writeUint8=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(0<=a&&256>a);this.buffer_.push(a>>>0&255)};jspb.BinaryEncoder.prototype.writeUint16=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(0<=a&&65536>a);this.buffer_.push(a>>>0&255);this.buffer_.push(a>>>8&255)};
jspb.BinaryEncoder.prototype.writeUint32=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(0<=a&&a<jspb.BinaryConstants.TWO_TO_32);this.buffer_.push(a>>>0&255);this.buffer_.push(a>>>8&255);this.buffer_.push(a>>>16&255);this.buffer_.push(a>>>24&255)};jspb.BinaryEncoder.prototype.writeUint64=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(0<=a&&a<jspb.BinaryConstants.TWO_TO_64);jspb.utils.splitUint64(a);this.writeUint32(jspb.utils.split64Low);this.writeUint32(jspb.utils.split64High)};
jspb.BinaryEncoder.prototype.writeInt8=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(-128<=a&&128>a);this.buffer_.push(a>>>0&255)};jspb.BinaryEncoder.prototype.writeInt16=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(-32768<=a&&32768>a);this.buffer_.push(a>>>0&255);this.buffer_.push(a>>>8&255)};
jspb.BinaryEncoder.prototype.writeInt32=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_31&&a<jspb.BinaryConstants.TWO_TO_31);this.buffer_.push(a>>>0&255);this.buffer_.push(a>>>8&255);this.buffer_.push(a>>>16&255);this.buffer_.push(a>>>24&255)};
jspb.BinaryEncoder.prototype.writeInt64=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_63&&a<jspb.BinaryConstants.TWO_TO_63);jspb.utils.splitInt64(a);this.writeSplitFixed64(jspb.utils.split64Low,jspb.utils.split64High)};
jspb.BinaryEncoder.prototype.writeInt64String=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_63&&a<jspb.BinaryConstants.TWO_TO_63);jspb.utils.splitHash64(jspb.utils.decimalStringToHash64(a));this.writeSplitFixed64(jspb.utils.split64Low,jspb.utils.split64High)};jspb.BinaryEncoder.prototype.writeFloat=function(a){goog.asserts.assert(a>=-jspb.BinaryConstants.FLOAT32_MAX&&a<=jspb.BinaryConstants.FLOAT32_MAX);jspb.utils.splitFloat32(a);this.writeUint32(jspb.utils.split64Low)};
jspb.BinaryEncoder.prototype.writeDouble=function(a){goog.asserts.assert(a>=-jspb.BinaryConstants.FLOAT64_MAX&&a<=jspb.BinaryConstants.FLOAT64_MAX);jspb.utils.splitFloat64(a);this.writeUint32(jspb.utils.split64Low);this.writeUint32(jspb.utils.split64High)};jspb.BinaryEncoder.prototype.writeBool=function(a){goog.asserts.assert(goog.isBoolean(a));this.buffer_.push(a?1:0)};
jspb.BinaryEncoder.prototype.writeEnum=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_31&&a<jspb.BinaryConstants.TWO_TO_31);this.writeSignedVarint32(a)};jspb.BinaryEncoder.prototype.writeBytes=function(a){this.buffer_.push.apply(this.buffer_,a)};jspb.BinaryEncoder.prototype.writeVarintHash64=function(a){jspb.utils.splitHash64(a);this.writeSplitVarint64(jspb.utils.split64Low,jspb.utils.split64High)};
jspb.BinaryEncoder.prototype.writeFixedHash64=function(a){jspb.utils.splitHash64(a);this.writeUint32(jspb.utils.split64Low);this.writeUint32(jspb.utils.split64High)};
jspb.BinaryEncoder.prototype.writeString=function(a){for(var b=this.buffer_.length,c=0;c<a.length;c++){var d=a.charCodeAt(c);if(128>d)this.buffer_.push(d);else if(2048>d)this.buffer_.push(d>>6|192),this.buffer_.push(d&63|128);else if(65536>d)if(55296<=d&&56319>=d&&c+1<a.length){var e=a.charCodeAt(c+1);56320<=e&&57343>=e&&(d=1024*(d-55296)+e-56320+65536,this.buffer_.push(d>>18|240),this.buffer_.push(d>>12&63|128),this.buffer_.push(d>>6&63|128),this.buffer_.push(d&63|128),c++)}else this.buffer_.push(d>>
12|224),this.buffer_.push(d>>6&63|128),this.buffer_.push(d&63|128)}return this.buffer_.length-b};jspb.arith={};jspb.arith.UInt64=function(a,b){this.lo=a;this.hi=b};jspb.arith.UInt64.prototype.cmp=function(a){return this.hi<a.hi||this.hi==a.hi&&this.lo<a.lo?-1:this.hi==a.hi&&this.lo==a.lo?0:1};jspb.arith.UInt64.prototype.rightShift=function(){return new jspb.arith.UInt64((this.lo>>>1|(this.hi&1)<<31)>>>0,this.hi>>>1>>>0)};jspb.arith.UInt64.prototype.leftShift=function(){return new jspb.arith.UInt64(this.lo<<1>>>0,(this.hi<<1|this.lo>>>31)>>>0)};
jspb.arith.UInt64.prototype.msb=function(){return!!(this.hi&2147483648)};jspb.arith.UInt64.prototype.lsb=function(){return!!(this.lo&1)};jspb.arith.UInt64.prototype.zero=function(){return 0==this.lo&&0==this.hi};jspb.arith.UInt64.prototype.add=function(a){return new jspb.arith.UInt64((this.lo+a.lo&4294967295)>>>0>>>0,((this.hi+a.hi&4294967295)>>>0)+(4294967296<=this.lo+a.lo?1:0)>>>0)};
jspb.arith.UInt64.prototype.sub=function(a){return new jspb.arith.UInt64((this.lo-a.lo&4294967295)>>>0>>>0,((this.hi-a.hi&4294967295)>>>0)-(0>this.lo-a.lo?1:0)>>>0)};jspb.arith.UInt64.mul32x32=function(a,b){for(var c=a&65535,d=a>>>16,e=b&65535,f=b>>>16,g=c*e+65536*(c*f&65535)+65536*(d*e&65535),c=d*f+(c*f>>>16)+(d*e>>>16);4294967296<=g;)g-=4294967296,c+=1;return new jspb.arith.UInt64(g>>>0,c>>>0)};
jspb.arith.UInt64.prototype.mul=function(a){var b=jspb.arith.UInt64.mul32x32(this.lo,a);a=jspb.arith.UInt64.mul32x32(this.hi,a);a.hi=a.lo;a.lo=0;return b.add(a)};
jspb.arith.UInt64.prototype.div=function(a){if(0==a)return[];var b=new jspb.arith.UInt64(0,0),c=new jspb.arith.UInt64(this.lo,this.hi);a=new jspb.arith.UInt64(a,0);for(var d=new jspb.arith.UInt64(1,0);!a.msb();)a=a.leftShift(),d=d.leftShift();for(;!d.zero();)0>=a.cmp(c)&&(b=b.add(d),c=c.sub(a)),a=a.rightShift(),d=d.rightShift();return[b,c]};jspb.arith.UInt64.prototype.toString=function(){for(var a="",b=this;!b.zero();)var b=b.div(10),c=b[0],a=b[1].lo+a,b=c;""==a&&(a="0");return a};
jspb.arith.UInt64.fromString=function(a){for(var b=new jspb.arith.UInt64(0,0),c=new jspb.arith.UInt64(0,0),d=0;d<a.length;d++){if("0">a[d]||"9"<a[d])return null;var e=parseInt(a[d],10);c.lo=e;b=b.mul(10).add(c)}return b};jspb.arith.UInt64.prototype.clone=function(){return new jspb.arith.UInt64(this.lo,this.hi)};jspb.arith.Int64=function(a,b){this.lo=a;this.hi=b};
jspb.arith.Int64.prototype.add=function(a){return new jspb.arith.Int64((this.lo+a.lo&4294967295)>>>0>>>0,((this.hi+a.hi&4294967295)>>>0)+(4294967296<=this.lo+a.lo?1:0)>>>0)};jspb.arith.Int64.prototype.sub=function(a){return new jspb.arith.Int64((this.lo-a.lo&4294967295)>>>0>>>0,((this.hi-a.hi&4294967295)>>>0)-(0>this.lo-a.lo?1:0)>>>0)};jspb.arith.Int64.prototype.clone=function(){return new jspb.arith.Int64(this.lo,this.hi)};
jspb.arith.Int64.prototype.toString=function(){var a=0!=(this.hi&2147483648),b=new jspb.arith.UInt64(this.lo,this.hi);a&&(b=(new jspb.arith.UInt64(0,0)).sub(b));return(a?"-":"")+b.toString()};jspb.arith.Int64.fromString=function(a){var b=0<a.length&&"-"==a[0];b&&(a=a.substring(1));a=jspb.arith.UInt64.fromString(a);if(null===a)return null;b&&(a=(new jspb.arith.UInt64(0,0)).sub(a));return new jspb.arith.Int64(a.lo,a.hi)};jspb.BinaryWriter=function(){this.blocks_=[];this.totalLength_=0;this.encoder_=new jspb.BinaryEncoder;this.bookmarks_=[]};jspb.BinaryWriter.prototype.appendUint8Array_=function(a){var b=this.encoder_.end();this.blocks_.push(b);this.blocks_.push(a);this.totalLength_+=b.length+a.length};
jspb.BinaryWriter.prototype.beginDelimited_=function(a){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);a=this.encoder_.end();this.blocks_.push(a);this.totalLength_+=a.length;a.push(this.totalLength_);return a};jspb.BinaryWriter.prototype.endDelimited_=function(a){var b=a.pop(),b=this.totalLength_+this.encoder_.length()-b;for(goog.asserts.assert(0<=b);127<b;)a.push(b&127|128),b>>>=7,this.totalLength_++;a.push(b);this.totalLength_++};
jspb.BinaryWriter.prototype.writeSerializedMessage=function(a,b,c){this.appendUint8Array_(a.subarray(b,c))};jspb.BinaryWriter.prototype.maybeWriteSerializedMessage=function(a,b,c){null!=a&&null!=b&&null!=c&&this.writeSerializedMessage(a,b,c)};jspb.BinaryWriter.prototype.reset=function(){this.blocks_=[];this.encoder_.end();this.totalLength_=0;this.bookmarks_=[]};
jspb.BinaryWriter.prototype.getResultBuffer=function(){goog.asserts.assert(0==this.bookmarks_.length);for(var a=new Uint8Array(this.totalLength_+this.encoder_.length()),b=this.blocks_,c=b.length,d=0,e=0;e<c;e++){var f=b[e];a.set(f,d);d+=f.length}b=this.encoder_.end();a.set(b,d);d+=b.length;goog.asserts.assert(d==a.length);this.blocks_=[a];return a};jspb.BinaryWriter.prototype.getResultBase64String=function(){return goog.crypt.base64.encodeByteArray(this.getResultBuffer())};
jspb.BinaryWriter.prototype.beginSubMessage=function(a){this.bookmarks_.push(this.beginDelimited_(a))};jspb.BinaryWriter.prototype.endSubMessage=function(){goog.asserts.assert(0<=this.bookmarks_.length);this.endDelimited_(this.bookmarks_.pop())};jspb.BinaryWriter.prototype.writeFieldHeader_=function(a,b){goog.asserts.assert(1<=a&&a==Math.floor(a));this.encoder_.writeUnsignedVarint32(8*a+b)};
jspb.BinaryWriter.prototype.writeAny=function(a,b,c){var d=jspb.BinaryConstants.FieldType;switch(a){case d.DOUBLE:this.writeDouble(b,c);break;case d.FLOAT:this.writeFloat(b,c);break;case d.INT64:this.writeInt64(b,c);break;case d.UINT64:this.writeUint64(b,c);break;case d.INT32:this.writeInt32(b,c);break;case d.FIXED64:this.writeFixed64(b,c);break;case d.FIXED32:this.writeFixed32(b,c);break;case d.BOOL:this.writeBool(b,c);break;case d.STRING:this.writeString(b,c);break;case d.GROUP:goog.asserts.fail("Group field type not supported in writeAny()");
break;case d.MESSAGE:goog.asserts.fail("Message field type not supported in writeAny()");break;case d.BYTES:this.writeBytes(b,c);break;case d.UINT32:this.writeUint32(b,c);break;case d.ENUM:this.writeEnum(b,c);break;case d.SFIXED32:this.writeSfixed32(b,c);break;case d.SFIXED64:this.writeSfixed64(b,c);break;case d.SINT32:this.writeSint32(b,c);break;case d.SINT64:this.writeSint64(b,c);break;case d.FHASH64:this.writeFixedHash64(b,c);break;case d.VHASH64:this.writeVarintHash64(b,c);break;default:goog.asserts.fail("Invalid field type in writeAny()")}};
jspb.BinaryWriter.prototype.writeUnsignedVarint32_=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeUnsignedVarint32(b))};jspb.BinaryWriter.prototype.writeSignedVarint32_=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeSignedVarint32(b))};jspb.BinaryWriter.prototype.writeUnsignedVarint64_=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeUnsignedVarint64(b))};
jspb.BinaryWriter.prototype.writeSignedVarint64_=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeSignedVarint64(b))};jspb.BinaryWriter.prototype.writeZigzagVarint32_=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeZigzagVarint32(b))};jspb.BinaryWriter.prototype.writeZigzagVarint64_=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeZigzagVarint64(b))};
jspb.BinaryWriter.prototype.writeZigzagVarint64String_=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeZigzagVarint64String(b))};jspb.BinaryWriter.prototype.writeInt32=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_31&&b<jspb.BinaryConstants.TWO_TO_31),this.writeSignedVarint32_(a,b))};
jspb.BinaryWriter.prototype.writeInt32String=function(a,b){if(null!=b){var c=parseInt(b,10);goog.asserts.assert(c>=-jspb.BinaryConstants.TWO_TO_31&&c<jspb.BinaryConstants.TWO_TO_31);this.writeSignedVarint32_(a,c)}};jspb.BinaryWriter.prototype.writeInt64=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_63&&b<jspb.BinaryConstants.TWO_TO_63),this.writeSignedVarint64_(a,b))};
jspb.BinaryWriter.prototype.writeInt64String=function(a,b){if(null!=b){var c=jspb.arith.Int64.fromString(b);this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT);this.encoder_.writeSplitVarint64(c.lo,c.hi)}};jspb.BinaryWriter.prototype.writeUint32=function(a,b){null!=b&&(goog.asserts.assert(0<=b&&b<jspb.BinaryConstants.TWO_TO_32),this.writeUnsignedVarint32_(a,b))};
jspb.BinaryWriter.prototype.writeUint32String=function(a,b){if(null!=b){var c=parseInt(b,10);goog.asserts.assert(0<=c&&c<jspb.BinaryConstants.TWO_TO_32);this.writeUnsignedVarint32_(a,c)}};jspb.BinaryWriter.prototype.writeUint64=function(a,b){null!=b&&(goog.asserts.assert(0<=b&&b<jspb.BinaryConstants.TWO_TO_64),this.writeUnsignedVarint64_(a,b))};
jspb.BinaryWriter.prototype.writeUint64String=function(a,b){if(null!=b){var c=jspb.arith.UInt64.fromString(b);this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT);this.encoder_.writeSplitVarint64(c.lo,c.hi)}};jspb.BinaryWriter.prototype.writeSint32=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_31&&b<jspb.BinaryConstants.TWO_TO_31),this.writeZigzagVarint32_(a,b))};
jspb.BinaryWriter.prototype.writeSint64=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_63&&b<jspb.BinaryConstants.TWO_TO_63),this.writeZigzagVarint64_(a,b))};jspb.BinaryWriter.prototype.writeSint64String=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_63&&b<jspb.BinaryConstants.TWO_TO_63),this.writeZigzagVarint64String_(a,b))};
jspb.BinaryWriter.prototype.writeFixed32=function(a,b){null!=b&&(goog.asserts.assert(0<=b&&b<jspb.BinaryConstants.TWO_TO_32),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED32),this.encoder_.writeUint32(b))};jspb.BinaryWriter.prototype.writeFixed64=function(a,b){null!=b&&(goog.asserts.assert(0<=b&&b<jspb.BinaryConstants.TWO_TO_64),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED64),this.encoder_.writeUint64(b))};
jspb.BinaryWriter.prototype.writeFixed64String=function(a,b){if(null!=b){var c=jspb.arith.UInt64.fromString(b);this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED64);this.encoder_.writeSplitFixed64(c.lo,c.hi)}};jspb.BinaryWriter.prototype.writeSfixed32=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_31&&b<jspb.BinaryConstants.TWO_TO_31),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED32),this.encoder_.writeInt32(b))};
jspb.BinaryWriter.prototype.writeSfixed64=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_63&&b<jspb.BinaryConstants.TWO_TO_63),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED64),this.encoder_.writeInt64(b))};jspb.BinaryWriter.prototype.writeSfixed64String=function(a,b){if(null!=b){var c=jspb.arith.Int64.fromString(b);this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED64);this.encoder_.writeSplitFixed64(c.lo,c.hi)}};
jspb.BinaryWriter.prototype.writeFloat=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED32),this.encoder_.writeFloat(b))};jspb.BinaryWriter.prototype.writeDouble=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED64),this.encoder_.writeDouble(b))};jspb.BinaryWriter.prototype.writeBool=function(a,b){null!=b&&(goog.asserts.assert(goog.isBoolean(b)),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeBool(b))};
jspb.BinaryWriter.prototype.writeEnum=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_31&&b<jspb.BinaryConstants.TWO_TO_31),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeSignedVarint32(b))};jspb.BinaryWriter.prototype.writeString=function(a,b){if(null!=b){var c=this.beginDelimited_(a);this.encoder_.writeString(b);this.endDelimited_(c)}};
jspb.BinaryWriter.prototype.writeBytes=function(a,b){if(null!=b){var c=jspb.utils.byteSourceToUint8Array(b);this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(c.length);this.appendUint8Array_(c)}};jspb.BinaryWriter.prototype.writeMessage=function(a,b,c){null!=b&&(a=this.beginDelimited_(a),c(b,this),this.endDelimited_(a))};
jspb.BinaryWriter.prototype.writeGroup=function(a,b,c){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.START_GROUP),c(b,this),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.END_GROUP))};jspb.BinaryWriter.prototype.writeFixedHash64=function(a,b){null!=b&&(goog.asserts.assert(8==b.length),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED64),this.encoder_.writeFixedHash64(b))};
jspb.BinaryWriter.prototype.writeVarintHash64=function(a,b){null!=b&&(goog.asserts.assert(8==b.length),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeVarintHash64(b))};jspb.BinaryWriter.prototype.writeRepeatedInt32=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeSignedVarint32_(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedInt32String=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeInt32String(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedInt64=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeSignedVarint64_(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedInt64String=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeInt64String(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedUint32=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeUnsignedVarint32_(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedUint32String=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeUint32String(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedUint64=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeUnsignedVarint64_(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedUint64String=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeUint64String(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedSint32=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeZigzagVarint32_(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedSint64=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeZigzagVarint64_(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedSint64String=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeZigzagVarint64String_(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedFixed32=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeFixed32(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedFixed64=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeFixed64(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedFixed64String=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeFixed64String(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedSfixed32=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeSfixed32(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedSfixed64=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeSfixed64(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedSfixed64String=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeSfixed64String(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedFloat=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeFloat(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedDouble=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeDouble(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedBool=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeBool(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedEnum=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeEnum(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedString=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeString(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedBytes=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeBytes(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedMessage=function(a,b,c){if(null!=b)for(var d=0;d<b.length;d++){var e=this.beginDelimited_(a);c(b[d],this);this.endDelimited_(e)}};
jspb.BinaryWriter.prototype.writeRepeatedGroup=function(a,b,c){if(null!=b)for(var d=0;d<b.length;d++)this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.START_GROUP),c(b[d],this),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.END_GROUP)};jspb.BinaryWriter.prototype.writeRepeatedFixedHash64=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeFixedHash64(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedVarintHash64=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeVarintHash64(a,b[c])};jspb.BinaryWriter.prototype.writePackedInt32=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeSignedVarint32(b[d]);this.endDelimited_(c)}};
jspb.BinaryWriter.prototype.writePackedInt32String=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeSignedVarint32(parseInt(b[d],10));this.endDelimited_(c)}};jspb.BinaryWriter.prototype.writePackedInt64=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeSignedVarint64(b[d]);this.endDelimited_(c)}};
jspb.BinaryWriter.prototype.writePackedInt64String=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++){var e=jspb.arith.Int64.fromString(b[d]);this.encoder_.writeSplitVarint64(e.lo,e.hi)}this.endDelimited_(c)}};jspb.BinaryWriter.prototype.writePackedUint32=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeUnsignedVarint32(b[d]);this.endDelimited_(c)}};
jspb.BinaryWriter.prototype.writePackedUint32String=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeUnsignedVarint32(parseInt(b[d],10));this.endDelimited_(c)}};jspb.BinaryWriter.prototype.writePackedUint64=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeUnsignedVarint64(b[d]);this.endDelimited_(c)}};
jspb.BinaryWriter.prototype.writePackedUint64String=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++){var e=jspb.arith.UInt64.fromString(b[d]);this.encoder_.writeSplitVarint64(e.lo,e.hi)}this.endDelimited_(c)}};jspb.BinaryWriter.prototype.writePackedSint32=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeZigzagVarint32(b[d]);this.endDelimited_(c)}};
jspb.BinaryWriter.prototype.writePackedSint64=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeZigzagVarint64(b[d]);this.endDelimited_(c)}};jspb.BinaryWriter.prototype.writePackedSint64String=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeZigzagVarint64(parseInt(b[d],10));this.endDelimited_(c)}};
jspb.BinaryWriter.prototype.writePackedFixed32=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(4*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeUint32(b[c])}};jspb.BinaryWriter.prototype.writePackedFixed64=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(8*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeUint64(b[c])}};
jspb.BinaryWriter.prototype.writePackedFixed64String=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(8*b.length);for(var c=0;c<b.length;c++){var d=jspb.arith.UInt64.fromString(b[c]);this.encoder_.writeSplitFixed64(d.lo,d.hi)}}};
jspb.BinaryWriter.prototype.writePackedSfixed32=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(4*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeInt32(b[c])}};jspb.BinaryWriter.prototype.writePackedSfixed64=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(8*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeInt64(b[c])}};
jspb.BinaryWriter.prototype.writePackedSfixed64String=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(8*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeInt64String(b[c])}};jspb.BinaryWriter.prototype.writePackedFloat=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(4*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeFloat(b[c])}};
jspb.BinaryWriter.prototype.writePackedDouble=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(8*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeDouble(b[c])}};jspb.BinaryWriter.prototype.writePackedBool=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(b.length);for(var c=0;c<b.length;c++)this.encoder_.writeBool(b[c])}};
jspb.BinaryWriter.prototype.writePackedEnum=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeEnum(b[d]);this.endDelimited_(c)}};jspb.BinaryWriter.prototype.writePackedFixedHash64=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(8*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeFixedHash64(b[c])}};
jspb.BinaryWriter.prototype.writePackedVarintHash64=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeVarintHash64(b[d]);this.endDelimited_(c)}};exports.Map=jspb.Map;exports.Message=jspb.Message;exports.BinaryReader=jspb.BinaryReader;exports.BinaryWriter=jspb.BinaryWriter;exports.ExtensionFieldInfo=jspb.ExtensionFieldInfo;exports.ExtensionFieldBinaryInfo=jspb.ExtensionFieldBinaryInfo;exports.exportSymbol=goog.exportSymbol;exports.inherits=goog.inherits;exports.object={extend:goog.object.extend};exports.typeOf=goog.typeOf;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],15:[function(require,module,exports){
// Generated by CoffeeScript 1.12.2
(function() {
  var BetweenExpr, ColExpr, DEBUG, Expr, ExternalTable, From, FuncExpr, FunctionQuery, Group, Having, LetUDF, LetUDFArg, Limit, Node, OrderBy, OrderByClause, ParamExpr, ParamVar, Project, ProjectClause, Queries, Query, QueryTable, SelectCore, SpecialExpr, Table, TableExpr, TableUDF, UnaryExpr, ValExpr, Where, _, schema,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    slice = [].slice,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  _ = require("underscore");

  _.append = function(arr, v) {
    arr = _.clone(arr);
    arr.push(v);
    return arr;
  };

  DEBUG = false;

  Node = (function() {
    Node.id = 1;

    function Node(type1) {
      this.type = type1;
      this.id = Node.id++;
    }

    Node.prototype.isType = function() {
      var ref;
      return ref = this.nodeType(), indexOf.call(arguments, ref) >= 0;
    };

    Node.prototype.isExpr = function() {
      var ref;
      return (ref = this.nodeType()) === "Expr" || ref === "SpecialExpr" || ref === "ColExpr" || ref === "ValExpr" || ref === "BetweenExpr" || ref === "UnaryExpr" || ref === "FuncExpr" || ref === "TableExpr";
    };

    Node.prototype.isTable = function() {
      var ref;
      return (ref = this.nodeType()) === "Table" || ref === "QueryTable";
    };

    Node.prototype.clone = function() {
      throw Error("not implemented");
    };

    Node.prototype.nodeType = function() {
      return this.constructor.name;
    };

    Node.prototype.descendents = function() {
      var types;
      types = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return this.allNodes(function(n) {
        return n.isType.apply(n, types);
      });
    };

    Node.prototype.children = function() {
      return [];
    };

    Node.prototype.sources = function() {
      return this.descendents("Table");
    };

    Node.prototype.variables = function() {
      return this.descendents("ColExpr");
    };

    Node.prototype.allNodes = function(f) {
      var func, ret;
      ret = [];
      func = function(node, path) {
        if (f(node)) {
          return ret.push(node);
        }
      };
      this.traverse(func);
      return _.uniq(ret);
    };

    Node.prototype.traverse = function(f, path) {
      var child, i, len, newpath, ref, results;
      if (path == null) {
        path = [];
      }
      f(this, path);
      newpath = _.append(path, this);
      ref = this.children();
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        child = ref[i];
        if (child == null) {
          continue;
        }
        if (!_.isFunction(child.traverse)) {
          console.log("ERR: child node doesn't support traverse().  Printing child, this and path");
          console.log(child);
          console.log(this);
          console.log(path);
        }
        results.push(child.traverse(f, newpath));
      }
      return results;
    };

    Node.prototype.toSQL = function() {
      return "";
    };

    Node.prototype.toPrettySQL = function() {
      return this.toSQL();
    };

    Node.prototype.toString = function() {
      return this.toSQL();
    };

    Node.prototype.toJSString = function() {
      throw new Error("toJSString() not implemented by " + (this.toSQL()));
    };

    Node.prototype.toDot = function() {
      var f, output, s;
      output = [];
      output.push("\ndigraph DepGraph" + this.nprintcalls + " {");
      output.push("  labelloc=\"t\";");
      output.push("  label=\"graph" + this.nprintcalls + "\";");
      f = function(node, path) {
        var name, parent, pname;
        if (path.length > 0) {
          parent = _.last(path);
          pname = parent.nodeType();
          name = node.nodeType();
          return output.push("  " + pname + parent.id + " -> " + name + node.id);
        }
      };
      this.traverse(f);
      output.push("}\n");
      s = output.join("\n");
      return s;
    };

    return Node;

  })();

  Queries = (function(superClass) {
    extend(Queries, superClass);

    function Queries(queries) {
      this.queries = queries;
      Queries.__super__.constructor.apply(this, arguments);
    }

    Queries.prototype.clone = function() {
      return new Queries(_.map(this.queries, function(q) {
        return q.clone();
      }));
    };

    Queries.prototype.children = function() {
      return this.queries;
    };

    Queries.prototype.toSQL = function() {
      var sqls;
      sqls = _.map(this.queries, function(q) {
        return q.toSQL();
      });
      return (sqls.join(";")) + ";";
    };

    Queries.prototype.toPrettySQL = function() {
      var sqls;
      sqls = _.map(this.queries, function(q) {
        return q.toSQL();
      });
      return (sqls.join(";\n")) + ";";
    };

    return Queries;

  })(Node);

  SelectCore = (function(superClass) {
    extend(SelectCore, superClass);

    function SelectCore(project1, from1, where1, groupby1) {
      this.project = project1 != null ? project1 : null;
      this.from = from1 != null ? from1 : null;
      this.where = where1 != null ? where1 : null;
      this.groupby = groupby1 != null ? groupby1 : null;
      if (this.where == null) {
        this.where = new Where;
      }
      SelectCore.__super__.constructor.apply(this, arguments);
    }

    SelectCore.prototype.clone = function() {
      var from, groupby, limit, orderby, project, set, where;
      project = from = where = set = groupby = limit = orderby = null;
      if (this.project != null) {
        project = this.project.clone();
      }
      if (this.from != null) {
        from = this.from.clone();
      }
      if (this.where != null) {
        where = this.where.clone();
      }
      if (this.groupby != null) {
        groupby = this.groupby.clone();
      }
      return new SelectCore(project, from, where, groupby, orderby, limit);
    };

    SelectCore.prototype.children = function() {
      return _.compact([this.project, this.from, this.where, this.groupby, this.orderby, this.limit]);
    };

    SelectCore.prototype.toSQL = function() {
      var ret;
      ret = ["SELECT " + (this.project.toSQL())];
      if ((this.from != null) && (this.from.tables != null) && this.from.tables.length > 0) {
        ret.push("FROM " + (this.from.toSQL()));
      }
      if (this.where != null) {
        ret.push("WHERE " + (this.where.toSQL()));
      }
      if (this.groupby != null) {
        ret.push(" GROUP BY " + (this.groupby.toSQL()));
      }
      return ret.join(" ");
    };

    SelectCore.prototype.schema = function() {
      return this.project.schema();
    };

    return SelectCore;

  })(Node);

  Query = (function(superClass) {
    extend(Query, superClass);

    function Query(selectCores, orderby1, limit1) {
      this.selectCores = selectCores != null ? selectCores : [];
      this.orderby = orderby1 != null ? orderby1 : null;
      this.limit = limit1 != null ? limit1 : null;
      this.selectCores = _.compact(_.flatten([this.selectCores]));
      Query.__super__.constructor.apply(this, arguments);
      this.set = null;
    }

    Query.prototype.clone = function() {
      var cores, limit, orderby;
      cores = this.selectCores.map(function(sc) {
        return sc.clone();
      });
      if (this.orderby != null) {
        orderby = this.orderby.clone();
      }
      if (this.limit != null) {
        limit = this.limit.clone();
      }
      return new Query(cores, orderby, limit);
    };

    Query.prototype.children = function() {
      return _.union(this.selectCores, _.compact([this.orderby, this.limit]));
    };

    Query.prototype.toSQL = function() {
      var cores, ret;
      cores = this.selectCores.map(function(sc) {
        return sc.toSQL();
      });
      ret = [cores.join(" UNION ")];
      if (this.orderby != null) {
        ret.push(" ORDER BY " + (this.orderby.toSQL()));
      }
      if (this.limit != null) {
        ret.push(" LIMIT " + (this.limit.toSQL()));
      }
      return ret.join(" ");
    };

    Query.prototype.schema = function() {
      var core, i, isConsistent, len, ref, schema;
      schema = null;
      ref = this.selectCores;
      for (i = 0, len = ref.length; i < len; i++) {
        core = ref[i];
        if (schema != null) {
          isConsistent = _.chain(schema).zip(core.schema()).all(function(pair) {
            return pair[0].type === pair[1].type;
          }).value();
          if (!isConsistent) {
            throw new Error("Inconsistent schemas: " + (JSON.stringify(schema)) + " ::: " + (JSON.stringify(core.schema())));
          }
        } else {
          schema = core.schema();
        }
      }
      if (schema == null) {
        schema = [];
      }
      return schema;
    };

    return Query;

  })(Node);

  Project = (function(superClass) {
    extend(Project, superClass);

    function Project(clauses1) {
      this.clauses = clauses1;
      this.clauses = _.compact(_.flatten([this.clauses]));
      Project.__super__.constructor.apply(this, arguments);
    }

    Project.prototype.canonicalize = function() {
      return _.each(this.clauses, function(clause, idx) {
        if (clause.alias == null) {
          return clause.alias = "col_" + idx;
        }
      });
    };

    Project.prototype.addClause = function(clause) {
      return this.clauses.push(clause);
    };

    Project.prototype.getByAlias = function(aliasOrIdx) {
      var c, i, len, ref;
      if (_.isNumber(aliasOrIdx)) {
        return this.clauses[aliasOrIdx];
      } else {
        ref = this.clauses;
        for (i = 0, len = ref.length; i < len; i++) {
          c = ref[i];
          if (c.alias === aliasOrIdx) {
            return c;
          }
        }
      }
    };

    Project.prototype.clone = function() {
      var clauses;
      clauses = _.compact(_.map(this.clauses, function(c) {
        if (c != null) {
          return c.clone();
        }
      }));
      return new Project(clauses);
    };

    Project.prototype.children = function() {
      return this.clauses;
    };

    Project.prototype.toSQL = function() {
      var sqls;
      sqls = _.compact(_.map(this.clauses, function(clause) {
        if (clause != null) {
          return clause.toSQL();
        }
      }));
      return sqls.join(", ");
    };

    Project.prototype.schema = function(tableAliases) {
      var aliasIdx, clause, i, len, ref, results;
      ref = this.clauses;
      results = [];
      for (aliasIdx = i = 0, len = ref.length; i < len; aliasIdx = ++i) {
        clause = ref[aliasIdx];
        if (clause.expr.isType("SpecialExpr")) {
          results.push({
            alias: null,
            tableName: clause.expr.table.name,
            type: "star"
          });
        } else {
          if (clause.alias == null) {
            clause.alias = "col" + aliasIdx;
          }
          results.push({
            alias: clause.alias,
            type: clause.exprType()
          });
        }
      }
      return results;
    };

    return Project;

  })(Node);

  ProjectClause = (function(superClass) {
    extend(ProjectClause, superClass);

    function ProjectClause(expr1, alias) {
      this.expr = expr1;
      this.alias = alias != null ? alias : null;
      if (this.expr.isType("ColExpr")) {
        if (this.alias == null) {
          this.alias = this.expr.col;
        }
      }
      ProjectClause.__super__.constructor.apply(this, arguments);
    }

    ProjectClause.prototype.clone = function() {
      var proj;
      proj = new ProjectClause(this.expr.clone(), this.alias);
      return proj;
    };

    ProjectClause.prototype.children = function() {
      return [this.expr];
    };

    ProjectClause.prototype.toSQL = function() {
      if (this.alias != null) {
        return (this.expr.toSQL()) + " AS " + this.alias;
      } else {
        return this.expr.toSQL();
      }
    };

    ProjectClause.prototype.exprType = function() {
      var f, type;
      type = null;
      f = function(node) {
        var ref;
        if (type != null) {
          return;
        }
        if (node.isType("Expr")) {
          if ((ref = node.op) === "+" || ref === "-" || ref === "/" || ref === "*") {
            return type = "numeric";
          }
        } else if (node.isType("ValExpr")) {
          if (_.isString(node.v)) {
            return type = "text";
          } else {
            return type = "numeric";
          }
        } else if (node.isType("FuncExpr")) {
          if (node.isSQLFunc) {
            return type = "numeric";
          }
        }
      };
      this.expr.traverse(f);
      if (this.alias === "id" && type === null) {
        type = "numeric";
      }
      if (type == null) {
        console.error("WARN: col " + this.alias + " couldn't infer type for " + (this.toSQL()) + ".  ");
        console.error("WARN: defaulting to int");
        type = "numeric";
      }
      return type;
    };

    return ProjectClause;

  })(Node);

  From = (function(superClass) {
    extend(From, superClass);

    function From(tables) {
      this.tables = tables;
      this.tables = _.compact(_.flatten([this.tables]));
      From.__super__.constructor.apply(this, arguments);
    }

    From.prototype.addTable = function(table) {
      return this.queries.push(table);
    };

    From.prototype.getByAlias = function(aliasOrIdx) {
      var i, len, ref, t;
      if (_.isNumber(aliasOrIdx)) {
        return this.tables[aliasOrIdx];
      } else {
        ref = this.tables;
        for (i = 0, len = ref.length; i < len; i++) {
          t = ref[i];
          if (t.alias === aliasOrIdx) {
            return t;
          }
        }
      }
    };

    From.prototype.clone = function() {
      return new From(_.map(this.tables, function(t) {
        return t.clone();
      }));
    };

    From.prototype.children = function() {
      return this.tables;
    };

    From.prototype.toSQL = function() {
      var sqls;
      sqls = _.map(this.tables, function(t) {
        if (t.alias != null) {
          return "(" + (t.toSQL()) + ") AS " + t.alias;
        } else {
          return "" + (t.toSQL());
        }
      });
      sqls = _.without(sqls, _.isEmpty);
      return sqls.join(", ");
    };

    return From;

  })(Node);

  Table = (function(superClass) {
    extend(Table, superClass);

    function Table(name1, alias) {
      this.name = name1;
      this.alias = alias != null ? alias : null;
      this.isDefaultAlias = false;
      if (this.alias == null) {
        if (this.alias == null) {
          this.alias = this.name;
        }
        this.isDefaultAlias = true;
      }
      Table.__super__.constructor.apply(this, arguments);
    }

    Table.prototype.clone = function() {
      return new Table(this.name, this.alias);
    };

    Table.prototype.isExternalTable = function() {
      return false;
    };

    Table.prototype.toString = function(printAlias) {
      if (printAlias == null) {
        printAlias = true;
      }
      return this.name;
    };

    Table.prototype.toSQL = function(printAlias) {
      if (printAlias == null) {
        printAlias = true;
      }
      return this.name;
    };

    return Table;

  })(Node);

  ExternalTable = (function(superClass) {
    extend(ExternalTable, superClass);

    function ExternalTable(interactionName, name1) {
      this.interactionName = interactionName;
      this.name = name1;
      ExternalTable.__super__.constructor.apply(this, arguments);
    }

    ExternalTable.prototype.clone = function() {
      return new ExternalTable(this.interactionName, this.name);
    };

    ExternalTable.prototype.isExternalTable = function() {
      return true;
    };

    ExternalTable.prototype.toString = function() {
      return this.toSQL();
    };

    ExternalTable.prototype.toSQL = function() {
      return this.interactionName + "." + this.name;
    };

    return ExternalTable;

  })(Node);

  QueryTable = (function(superClass) {
    extend(QueryTable, superClass);

    function QueryTable(query1, alias) {
      this.query = query1;
      this.alias = alias != null ? alias : null;
      if (this.alias == null) {
        throw new Error("subquery needs to have an alias!  " + this.query);
      }
      QueryTable.__super__.constructor.apply(this, arguments);
    }

    QueryTable.prototype.clone = function() {
      return new QueryTable(this.query.clone(), this.alias);
    };

    QueryTable.prototype.children = function() {
      return [this.query];
    };

    QueryTable.prototype.toSQL = function() {
      return this.query.toSQL();
    };

    return QueryTable;

  })(Node);

  TableUDF = (function(superClass) {
    extend(TableUDF, superClass);

    function TableUDF(fname, exprs1, alias) {
      var ref;
      this.fname = fname;
      this.exprs = exprs1;
      this.alias = alias != null ? alias : null;
      if (this.alias == null) {
        throw new Error("UDF in FROM clause needs to have an alias! " + this.fname);
      }
      if ((ref = this.fname) === "abs" || ref === "min" || ref === "max") {
        throw new Error("SQL func should not be in FROM clause");
      }
      this.type = "TableUDF";
      this.exprs = _.compact(_.flatten([this.exprs]));
      TableUDF.__super__.constructor.apply(this, arguments);
    }

    TableUDF.prototype.clone = function() {
      return new TableUDF(this.fname, _.map(this.exprs, function(e) {
        return e.clone();
      }), this.alias);
    };

    TableUDF.prototype.traverse = function(f, path) {
      var newpath;
      if (path == null) {
        path = [];
      }
      f(this, path);
      newpath = _.append(path, this);
      return _.each(this.exprs, function(e) {
        return e.traverse(f, newpath);
      });
    };

    TableUDF.prototype.toSQL = function() {
      var args;
      args = this.exprs.map(function(e) {
        return e.toSQL();
      }).join(",");
      return this.fname + "(" + args + ")";
    };

    TableUDF.prototype.toJSString = function() {
      var args, f;
      f = this.fname;
      args = this.exprs.map(function(e) {
        return e.toJSString();
      }).join(",");
      return f + "(" + args + ")";
    };

    return TableUDF;

  })(Node);

  LetUDF = (function(superClass) {
    extend(LetUDF, superClass);

    function LetUDF(fname, args1, input, render_or_compute, source) {
      this.fname = fname;
      this.args = args1;
      this.input = input;
      this.render_or_compute = render_or_compute;
      this.source = source;
      this.type = "LetUDF";
      this.args = _.compact(_.flatten([this.args]));
      LetUDF.__super__.constructor.apply(this, arguments);
    }

    LetUDF.prototype.clone = function() {
      return new LetUDF(this.fname, _.map(this.exprs, function(e) {
        return e.clone();
      }), this.alias);
    };

    LetUDF.prototype.traverse = function(f, path) {
      var arg, i, len, newpath, ref, results;
      if (path == null) {
        path = [];
      }
      f(this, path);
      newpath = _.append(path, this);
      ref = this.args;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        arg = ref[i];
        results.push(arg.traverse(f, newpath));
      }
      return results;
    };

    LetUDF.prototype.clone = function() {
      var args;
      args = this.args.map(function(arg) {
        return arg.clone();
      });
      return new LetUDF(this.fname, args, this.exists);
    };

    LetUDF.prototype.toSQL = function() {
      return "";
    };

    LetUDF.prototype.schema = function() {
      return this.args.map(function(arg) {
        return arg.schema();
      });
    };

    return LetUDF;

  })(Node);

  LetUDFArg = (function(superClass) {
    extend(LetUDFArg, superClass);

    function LetUDFArg(name1, type1) {
      this.name = name1;
      this.type = type1;
      LetUDFArg.__super__.constructor.apply(this, arguments);
    }

    LetUDFArg.prototype.clone = function() {
      return new LetUDFArg(this.name, this.type);
    };

    LetUDFArg.prototype.toSQL = function() {
      return this.name + " " + this.type;
    };

    LetUDFArg.prototype.schema = function() {
      return {
        alias: this.name,
        type: this.type
      };
    };

    return LetUDFArg;

  })(Node);

  Where = (function(superClass) {
    extend(Where, superClass);

    function Where(exprs1, conj) {
      this.exprs = exprs1;
      this.conj = conj != null ? conj : " AND ";
      this.exprs = _.compact(_.flatten([this.exprs]));
      Where.__super__.constructor.apply(this, arguments);
    }

    Where.prototype.addExpr = function(expr) {
      return this.exprs.push(expr);
    };

    Where.prototype.getByAlias = function(aliasOrIdx) {
      if (_.isNumber(aliasOrIdx)) {
        return this.tables[aliasOrIdx];
      }
      return null;
    };

    Where.prototype.clone = function() {
      var exprs;
      exprs = _.map(this.exprs, function(e) {
        return e.clone();
      });
      return new Where(exprs, this.con);
    };

    Where.prototype.children = function() {
      return this.exprs;
    };

    Where.prototype.toSQL = function() {
      var strs;
      strs = _.compact(_.map(this.exprs, function(expr) {
        return expr.toSQL();
      }));
      if (strs.length === 0) {
        return "1 = 1";
      } else {
        return strs.join(" AND ");
      }
    };

    Where.prototype.toJSString = function() {
      var join, strs;
      if (this.exprs.length === 0) {
        return "true";
      } else {
        join = " && ";
        if (/OR/.test(this.conj)) {
          join = " || ";
        }
        strs = _.chain(this.exprs).map(function(expr) {
          return "(" + (expr.toJSString()) + ")";
        }).compact().value();
        return strs.join(" && ");
      }
    };

    return Where;

  })(Node);

  Expr = (function(superClass) {
    extend(Expr, superClass);

    function Expr(l1, op1, r1) {
      this.l = l1;
      this.op = op1 != null ? op1 : null;
      this.r = r1 != null ? r1 : null;
      Expr.__super__.constructor.apply(this, arguments);
    }

    Expr.prototype.clone = function() {
      var l, op, r;
      l = this.l.clone();
      op = this.op;
      r = null;
      if (this.r != null) {
        r = this.r.clone();
      }
      return new Expr(l, op, r);
    };

    Expr.prototype.children = function() {
      return _.compact([this.l, this.r]);
    };

    Expr.prototype.toSQL = function() {
      if (this.op != null) {
        if ((this.r != null) && this.r.isType("ColExpr", "ValExpr", "FuncExpr")) {
          return "(" + (this.l.toSQL()) + " " + this.op + " " + (this.r.toSQL()) + ")";
        } else {
          return "(" + (this.l.toSQL()) + " " + this.op + " (" + (this.r.toSQL()) + "))";
        }
      } else {
        return this.l.toSQL();
      }
    };

    Expr.prototype.toJSString = function() {
      var op;
      if (this.op != null) {
        op = this.op;
        if (op === "=") {
          op = "==";
        }
        if (op === "AND") {
          op = "&&";
        }
        return "(" + (this.l.toJSString()) + " " + op + " (" + (this.r.toJSString()) + "))";
      } else {
        return this.l.toJSString();
      }
    };

    return Expr;

  })(Node);

  SpecialExpr = (function(superClass) {
    extend(SpecialExpr, superClass);

    function SpecialExpr(v1, table1) {
      this.v = v1;
      this.table = table1 != null ? table1 : null;
      this.tableName = null;
      if (this.table != null) {
        this.tableName = this.table.name;
      }
      SpecialExpr.__super__.constructor.apply(this, arguments);
    }

    SpecialExpr.prototype.clone = function() {
      return new SpecialExpr(this.v, this.table);
    };

    SpecialExpr.prototype.toSQL = function() {
      var prefix;
      prefix = "";
      if (this.tableName != null) {
        prefix = this.tableName + ".";
      }
      return "" + prefix + this.v;
    };

    SpecialExpr.prototype.toJSString = function() {
      if (this.tableName != null) {
        return "" + this.tableName;
      } else {
        throw new Error("SpecialExpr doesn't support toJSString: " + this.v);
      }
    };

    return SpecialExpr;

  })(Expr);

  BetweenExpr = (function(superClass) {
    extend(BetweenExpr, superClass);

    function BetweenExpr(v1, op1, minv1, maxv1) {
      this.v = v1;
      this.op = op1;
      this.minv = minv1;
      this.maxv = maxv1;
      BetweenExpr.__super__.constructor.apply(this, arguments);
    }

    BetweenExpr.prototype.clone = function() {
      var maxv, minv, v;
      v = this.v;
      if (this.v.clone != null) {
        v = this.v.clone();
      }
      minv = this.minv;
      if (this.minv.clone != null) {
        minv = this.minv.clone();
      }
      maxv = this.maxv;
      if (this.maxv.clone != null) {
        maxv = this.maxv.clone();
      }
      return new BetweenExpr(v, this.op, minv, maxv);
    };

    BetweenExpr.prototype.children = function() {
      return _.compact([this.v, this.minv, this.maxv]);
    };

    BetweenExpr.prototype.toSQL = function() {
      return (this.v.toSQL()) + " " + this.op + " " + (this.minv.toSQL()) + " AND " + (this.maxv.toSQL());
    };

    BetweenExpr.prototype.toJSString = function() {
      var ret;
      ret = ["(" + (this.v.toJSString()) + " >= " + (this.minv.toJSString()) + ")", "(" + (this.v.toJSString()) + " < " + (this.maxv.toJSString()) + ")"];
      ret = ret.join(" && ");
      if (this.op === "NOT BETWEEN") {
        ret = "!(" + ret + ")";
      }
      return ret;
    };

    return BetweenExpr;

  })(Expr);

  UnaryExpr = (function(superClass) {
    extend(UnaryExpr, superClass);

    function UnaryExpr(op1, expr1) {
      this.op = op1;
      this.expr = expr1;
      UnaryExpr.__super__.constructor.apply(this, arguments);
    }

    UnaryExpr.prototype.clone = function() {
      return new UnaryExpr(this.op, this.expr.clone());
    };

    UnaryExpr.prototype.children = function() {
      return [this.expr];
    };

    UnaryExpr.prototype.toSQL = function() {
      return this.op + " " + (this.expr.toSQL());
    };

    UnaryExpr.prototype.toJSString = function() {
      if (this.op === "NOT") {
        return "!(" + (this.expr.toJSString()) + ")";
      } else if (this.op === "NOT EXISTS") {
        return "!_.isEmpty(" + (this.expr.toJSString()) + ")";
      } else {
        return "" + this.op + (this.expr.toJSString());
      }
    };

    return UnaryExpr;

  })(Expr);

  FuncExpr = (function(superClass) {
    extend(FuncExpr, superClass);

    function FuncExpr(fname, exprs1) {
      this.fname = fname;
      this.exprs = exprs1;
      this.exprs = _.compact(_.flatten([this.exprs]));
      FuncExpr.__super__.constructor.apply(this, arguments);
    }

    FuncExpr.prototype.children = function() {
      return this.exprs;
    };

    FuncExpr.prototype.clone = function() {
      return new FuncExpr(this.fname, _.map(this.exprs, function(e) {
        return e.clone();
      }));
    };

    FuncExpr.prototype.isSQLFunc = function() {
      var ref;
      return (ref = this.fname) === "abs" || ref === "max" || ref === "min";
    };

    FuncExpr.prototype.toSQL = function() {
      var args;
      args = this.exprs.map(function(e) {
        return e.toSQL();
      }).join(",");
      return this.fname + "(" + args + ")";
    };

    FuncExpr.prototype.toJSString = function() {
      var args, f;
      f = (function() {
        switch (this.fname) {
          case "abs":
            return "Math.abs";
          case "max":
            return "Math.max";
          case "min":
            return "Math.min";
          default:
            return this.fname;
        }
      }).call(this);
      args = this.exprs.map(function(e) {
        return e.toJSString();
      }).join(",");
      return f + "(" + args + ")";
    };

    return FuncExpr;

  })(Expr);

  ColExpr = (function(superClass) {
    extend(ColExpr, superClass);

    function ColExpr(col, table1) {
      this.col = col;
      this.table = table1 != null ? table1 : null;
      this.tableName = null;
      if (this.table != null) {
        this.tableName = this.table.name;
      }
      ColExpr.__super__.constructor.apply(this, arguments);
    }

    ColExpr.prototype.children = function() {
      return _.compact([this.table]);
    };

    ColExpr.prototype.clone = function() {
      return new ColExpr(this.col, this.table);
    };

    ColExpr.prototype.toSQL = function() {
      var prefix;
      prefix = "";
      if (this.tableName != null) {
        prefix = this.tableName + ".";
      }
      return "" + prefix + this.col;
    };

    ColExpr.prototype.toJSString = function() {
      return this.toSQL();
    };

    return ColExpr;

  })(Expr);

  TableExpr = (function(superClass) {
    extend(TableExpr, superClass);

    function TableExpr(table1) {
      this.table = table1;
      if (this.table == null) {
        throw new Error("TableExpr got null table");
      }
      this.tableName = null;
      if (this.table != null) {
        this.tableName = this.table.name;
      }
      TableExpr.__super__.constructor.apply(this, arguments);
    }

    TableExpr.prototype.clone = function() {
      return new TableExpr(this.table.clone());
    };

    TableExpr.prototype.toSQL = function() {
      return this.table.toSQL();
    };

    TableExpr.prototype.toJSString = function() {
      return this.tableName;
    };

    return TableExpr;

  })(Expr);

  ParamVar = (function(superClass) {
    extend(ParamVar, superClass);

    function ParamVar(name1, val) {
      this.name = name1;
      this.val = val != null ? val : null;
    }

    ParamVar.prototype.children = function() {
      return _.compact([this.val]);
    };

    ParamVar.prototype.clone = function() {
      return new ParamVar(this.name);
    };

    ParamVar.prototype.toSQL = function() {
      if (this.val != null) {
        return this.val.toSQL();
      }
      return "$" + this.name;
    };

    return ParamVar;

  })(Node);

  ParamExpr = (function(superClass) {
    extend(ParamExpr, superClass);

    function ParamExpr(expr1, _default, params) {
      this.expr = expr1;
      this["default"] = _default != null ? _default : null;
      this.params = params != null ? params : {};
      ParamExpr.__super__.constructor.apply(this, arguments);
    }

    ParamExpr.prototype.getVars = function() {
      return this.expr.descendents("ParamVar");
    };

    ParamExpr.prototype.areParamsFixed = function() {
      return _.all(this.getVars(), function(v) {
        return v.val != null;
      });
    };

    ParamExpr.prototype.getParams = function() {
      return this.getVars();
    };

    ParamExpr.prototype.getParamNames = function() {
      return _.pluck(this.getVars(), "name");
    };

    ParamExpr.prototype.setParams = function(params) {
      var i, len, pv, ref, results;
      this.params = params;
      ref = this.getVars();
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        pv = ref[i];
        if (pv.name in this.params) {
          results.push(pv.val = this.params[pv.name]);
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    ParamExpr.prototype.children = function() {
      return _.compact([this["default"], this.expr]);
    };

    ParamExpr.prototype.clone = function() {
      var args;
      args = _.map([this.expr, this["default"]], function(v) {
        return (v != null) && v.clone() || null;
      });
      args.push(_.clone(this.params));
      return (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(ParamExpr, args, function(){});
    };

    ParamExpr.prototype.toSQL = function() {
      if (this.areParamsFixed()) {
        return this.expr.toSQL();
      }
      if (this["default"] != null) {
        if (this["default"].isType("SpecialExpr") && this["default"].v === null) {
          return null;
        }
        return this["default"].toSQL();
      }
      return null;
    };

    return ParamExpr;

  })(Expr);

  ValExpr = (function(superClass) {
    extend(ValExpr, superClass);

    function ValExpr(v1) {
      this.v = v1;
      ValExpr.__super__.constructor.apply(this, arguments);
    }

    ValExpr.prototype.children = function() {
      return [];
    };

    ValExpr.prototype.clone = function() {
      return new ValExpr(this.v);
    };

    ValExpr.prototype.toSQL = function() {
      if (_.isString(this.v)) {
        return "'" + this.v + "'";
      }
      if ((this.v != null) && _.isNumber(this.v)) {
        return this.v.toFixed(2);
      }
      return "" + this.v;
    };

    ValExpr.prototype.toJSString = function() {
      return this.toSQL();
    };

    return ValExpr;

  })(Expr);

  Group = (function(superClass) {
    extend(Group, superClass);

    function Group(groupinglist, having1) {
      this.groupinglist = groupinglist;
      this.having = having1;
      Group.__super__.constructor.apply(this, arguments);
    }

    Group.prototype.clone = function() {
      var having;
      having = null;
      if (this.having != null) {
        having = this.having.clone();
      }
      return new Group(this.groupinglist.map(function(g) {
        return g.clone();
      }, having));
    };

    Group.prototype.children = function() {
      return _.union(this.groupinglist, _.compact([this.having]));
    };

    Group.prototype.toSQL = function() {
      var grouping;
      grouping = _.compact(this.groupinglist.map(function(g) {
        return g.toSQL();
      }));
      if ((this.having != null) && this.having.children().length > 0) {
        return (grouping.join(", ")) + " HAVING " + (this.having.toSQL());
      } else {
        return grouping.join(", ");
      }
    };

    return Group;

  })(Node);

  Having = (function(superClass) {
    extend(Having, superClass);

    function Having(exprs1) {
      this.exprs = exprs1 != null ? exprs1 : [];
      this.exprs = _.compact(_.flatten([this.exprs]));
      Having.__super__.constructor.apply(this, arguments);
    }

    Having.prototype.children = function() {
      return this.exprs;
    };

    Having.prototype.clone = function() {
      var exprs;
      exprs = _.map(this.exprs, function(e) {
        return e.clone();
      });
      return new Having(exprs);
    };

    Having.prototype.toSQL = function() {
      return _.map(this.exprs, function(e) {
        return e.toSQL();
      }).join(", ");
    };

    return Having;

  })(Node);

  OrderBy = (function(superClass) {
    extend(OrderBy, superClass);

    function OrderBy(exprs1) {
      this.exprs = exprs1 != null ? exprs1 : [];
      this.exprs = _.compact(_.flatten([this.exprs]));
      OrderBy.__super__.constructor.apply(this, arguments);
    }

    OrderBy.prototype.children = function() {
      return this.exprs;
    };

    OrderBy.prototype.clone = function() {
      return new OrderBy(this.exprs.map(function(e) {
        return e.clone();
      }));
    };

    OrderBy.prototype.toSQL = function() {
      return this.exprs.map(function(e) {
        return e.toSQL();
      }).join(", ");
    };

    return OrderBy;

  })(Node);

  OrderByClause = (function(superClass) {
    extend(OrderByClause, superClass);

    function OrderByClause(expr1, asc1) {
      this.expr = expr1;
      this.asc = asc1 != null ? asc1 : true;
      OrderByClause.__super__.constructor.apply(this, arguments);
    }

    OrderByClause.prototype.clone = function() {
      return new OrderByClause(this.expr.clone(), this.asc);
    };

    OrderByClause.prototype.children = function() {
      return [this.expr];
    };

    OrderByClause.prototype.toSQL = function() {
      var asc;
      asc = this.asc ? "ASC" : "DESC";
      return (this.expr.toSQL()) + " " + asc;
    };

    return OrderByClause;

  })(Node);

  Limit = (function(superClass) {
    extend(Limit, superClass);

    function Limit(expr1, offset1) {
      this.expr = expr1;
      this.offset = offset1;
      Limit.__super__.constructor.apply(this, arguments);
    }

    Limit.prototype.clone = function() {
      var offset;
      offset = null;
      if (this.offset != null) {
        offset = this.offset.clone();
      }
      return new Limit(this.limit.clone(), offset);
    };

    Limit.prototype.children = function() {
      return _.compact([this.expr, this.offset]);
    };

    Limit.prototype.toSQL = function() {
      if (this.offset != null) {
        return (this.expr.toSQL()) + " OFFSET " + (this.offset.toSQL());
      } else {
        return this.expr.toSQL();
      }
    };

    return Limit;

  })(Expr);

  FunctionQuery = (function(superClass) {
    extend(FunctionQuery, superClass);

    function FunctionQuery(fname, tableOrQuery) {
      this.fname = fname;
      this.tableOrQuery = tableOrQuery;
      FunctionQuery.__super__.constructor.apply(this, arguments);
      if (this.tableOrQuery == null) {
        throw new Error("FunctionQuery cannot have empty argument");
      }
    }

    FunctionQuery.prototype.clone = function() {
      return new FunctionQuery(this.fname, this.tableOrQuery.clone());
    };

    FunctionQuery.prototype.children = function() {
      return [this.tableOrQuery];
    };

    FunctionQuery.prototype.toSQL = function() {
      return this.fname + "(" + (this.tableOrQuery.toSQL()) + ")";
    };

    return FunctionQuery;

  })(Node);

  schema = (function() {
    var get_schema;
    return get_schema = function(queryName, nameToQueries, seen) {
      var i, isConsistent, len, query, rest, sources, star, starSchema, starSchemas, stars, tmp;
      if (seen == null) {
        seen = {};
      }
      if (queryName in seen) {
        return [];
      }
      seen[queryName] = true;
      query = nameToQueries[queryName];
      schema = query.schema();
      stars = _.filter(schema, function(s) {
        return s.type === "star";
      });
      rest = _.reject(schema, function(s) {
        return s.type === "star";
      });
      if (!stars.length) {
        return rest;
      }
      starSchemas = (function() {
        var i, len, results;
        results = [];
        for (i = 0, len = stars.length; i < len; i++) {
          star = stars[i];
          if (star.table != null) {
            results.push(get_schema(star.table.name, nameToQueries, seen));
          } else {
            sources = query.sources();
            if (sources.length !== 1) {
              throw new Error("* project clause must be qualified with table name if >1 table source");
            }
            results.push(get_schema(sources[0].name, nameToQueries, seen));
          }
        }
        return results;
      })();
      tmp = null;
      for (i = 0, len = starSchemas.length; i < len; i++) {
        starSchema = starSchemas[i];
        if (tmp == null) {
          tmp = starSchema;
        }
        isConsistent = _.chain(tmp).zip(starSchema).all(function(p) {
          return p[0].type === p[1].type;
        }).value();
        if (!isConsistent) {
          throw new Error("Inconsistent schemas: " + (JSON.stringify(tmp)) + " ::: " + (JSON.stringify(starSchema)));
        }
      }
      return rest.concat(tmp);
    };
  })();

  module.exports = {
    Queries: Queries,
    SelectCore: SelectCore,
    Query: Query,
    Project: Project,
    ProjectClause: ProjectClause,
    From: From,
    Table: Table,
    ExternalTable: ExternalTable,
    QueryTable: QueryTable,
    Where: Where,
    Expr: Expr,
    SpecialExpr: SpecialExpr,
    BetweenExpr: BetweenExpr,
    UnaryExpr: UnaryExpr,
    FuncExpr: FuncExpr,
    ColExpr: ColExpr,
    TableExpr: TableExpr,
    ParamVar: ParamVar,
    ParamExpr: ParamExpr,
    ValExpr: ValExpr,
    Group: Group,
    Having: Having,
    OrderBy: OrderBy,
    OrderByClause: OrderByClause,
    Limit: Limit,
    FunctionQuery: FunctionQuery,
    schema: schema
  };

}).call(this);

},{"underscore":18}],16:[function(require,module,exports){
// Generated by CoffeeScript 1.12.2
(function() {
  var _, ast, parse, parser,
    slice = [].slice;

  ast = require("./ast.js");

  parser = require("./sqlfull.js");

  _ = require("underscore");

  _.extend(this, ast);

  parse = function(str, DEBUG) {
    var prepareString;
    if (DEBUG == null) {
      DEBUG = false;
    }
    prepareString = function(str) {
      var q;
      q = str;
      q = q.trim();
      q = q.replace(/[\t\n\r]/g, " ");
      q = q.replace(/(\s)+/g, " ");
      q = q.replace(/\(\s+/g, "(");
      q = q.replace(/\s+\)/g, ")");
      return q;
    };
    if (DEBUG) {
      console.log(str);
    }
    return parser.parse(prepareString(str));
  };

  _.extend(parse, ast);

  parse.one = function() {
    var args, res;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    res = parse.apply(null, args);
    return res.queries[0];
  };

  module.exports = parse;

}).call(this);

},{"./ast.js":15,"./sqlfull.js":17,"underscore":18}],17:[function(require,module,exports){
var ast, _;

_ = _ = require('underscore');

ast = ast = require('./ast.js');

put_if_not_null = function(o, key, val) {
  if (!_.isEmpty(val)) {
    o[key] = val;
  }
  return o;
};

flatstr = function(x, rejectSpace, joinChar) {
  if (rejectSpace == null) {
    rejectSpace = false;
  }
  if (joinChar == null) {
    joinChar = '';
  }
  return _.reject(_.flatten(x), _.isEmpty).join(joinChar);
};

module.exports = (function() {
  "use strict";

  /*
   * Generated by PEG.js 0.9.0.
   *
   * http://pegjs.org/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function peg$SyntaxError(message, expected, found, location) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.location = location;
    this.name     = "SyntaxError";

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, peg$SyntaxError);
    }
  }

  peg$subclass(peg$SyntaxError, Error);

  function peg$parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},
        parser  = this,

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = function(c) { 
            var qs = _.compact(_.without(_.flatten(c), ";", " ", "\t"));
            return new ast.Queries(qs);
          },
        peg$c1 = function(g) { return g; },
        peg$c2 = function(cf) { 
            return new ast.FunctionQuery(cf[0], cf[4]); 
          },
        peg$c3 = function(ss) { 
                 return _.chain(ss)
                   .flatten()
                   .filter(function(s, idx) { if (idx % 2 == 0) return s; })
                   .value();
               },
        peg$c4 = function(s, oo) {
                  if (_.isNull(oo)) return null;
                  var exprs = _.chain(oo)
                    .flatten()
                    .without(",", " ", "\n", "\t")
                    .reject(function(o) { return _.isString(o); })
                    .value();
                  return new ast.OrderBy(exprs);
                },
        peg$c5 = function(s, o, ll) {
                  if (_.isNull(ll)) return null;
                  var offset = null;
                  if (!_.isNull(ll[2])) offset = ll[2][1]
                  return new ast.Limit(ll[1], offset);
                },
        peg$c6 = function(s, o, l) { 
            return new ast.Query(s,o,l);
          },
        peg$c7 = function(d, cc) { 
                   var clauses = _.without(_.flatten(cc), ",", " ", "\n", "\t");
                   return new ast.Project(clauses);
                 },
        peg$c8 = function(d, c, ff) { return ff ? new ast.From(ff[1]) : null; },
        peg$c9 = function(d, c, f, e) { return e ? e[1] : null; },
        peg$c10 = function(d, c, f, w, ot) { 
                              return _.chain(ot)
                                .flatten()
                                .without(",", " ", ",", null)
                                .reject(_.isEmpty)
                                .value()
                            },
        peg$c11 = function(d, c, f, w, gb) { 
                        // only support a single having expression for now
                        if (_.isEmpty(gb) || _.isNull(gb)) return null;
                        var groups = gb[2];
                        var having = null;
                        if (!_.isNull(gb[3])) having = gb[3][1];
                        return new ast.Group(groups, new ast.Having(having));
                      },
        peg$c12 = function(d, c, f, w, g) { return new ast.SelectCore(c, f, w, g); },
        peg$c13 = function(c) { 
                        return new ast.ProjectClause(
                          new ast.SpecialExpr("*", c[0])); },
        peg$c14 = function(c) { 
                        var alias = null;
                        if (!_.isNull(c[1])) alias = c[1][2];
                        return new ast.ProjectClause(c[0], alias )
                      },
        peg$c15 = function(c) {
                        var alias = null;
                        if (!_.isNull(c[1])) alias = c[1][2];
                        return new ast.ProjectClause(c[1], alias);
                      },
        peg$c16 = function() { 
                    return new ast.ProjectClause(
                      new ast.SpecialExpr("*"));
                   },
        peg$c17 = function(r) { return r[1]; },
        peg$c18 = function(s) { 
            return _.without(_.flatten(s), " ", "\t", "\n", ",");
          },
        peg$c19 = function(x) {
              return new ast.Table(x[0].name, x[3]); },
        peg$c20 = function(a) { return a[2] },
        peg$c21 = function(p) {
                return new ast.QueryTable(p[1], p[3]); 
              },
        peg$c22 = function(u) {
              return new ast.TableUDF(u[0], u[4], u[7]);
            },
        peg$c23 = function(x) {
              return x; 
              },
        peg$c24 = "LET",
        peg$c25 = { type: "literal", value: "LET", description: "\"LET\"" },
        peg$c26 = "TABLEUDF",
        peg$c27 = { type: "literal", value: "TABLEUDF", description: "\"TABLEUDF\"" },
        peg$c28 = "ROWUDF",
        peg$c29 = { type: "literal", value: "ROWUDF", description: "\"ROWUDF\"" },
        peg$c30 = "RENDER",
        peg$c31 = { type: "literal", value: "RENDER", description: "\"RENDER\"" },
        peg$c32 = "COMPUTE",
        peg$c33 = { type: "literal", value: "COMPUTE", description: "\"COMPUTE\"" },
        peg$c34 = "RETURN",
        peg$c35 = { type: "literal", value: "RETURN", description: "\"RETURN\"" },
        peg$c36 = "SOURCE",
        peg$c37 = { type: "literal", value: "SOURCE", description: "\"SOURCE\"" },
        peg$c38 = function(input, name, render_or_compute, args, source) {
            input = _.isNull(input) ? "TABLEUDF" : input;
            render_or_compute = _.isNull(render_or_compute) ? "RENDER" : render_or_compute;
            return new ast.LetUDF(name, args, input, render_or_compute, source.value);
          },
        peg$c39 = function(args) {
            args = _.without(_.flatten(args), ',', ' ', '\t', '\n');
            return args;
          },
        peg$c40 = function(arg) { 
            arg = _.without(_.flatten(arg), ' ', '\t', '\n');
            return new ast.LetUDFArg(arg[0], arg[1]);
          },
        peg$c41 = "AND",
        peg$c42 = { type: "literal", value: "AND", description: "\"AND\"" },
        peg$c43 = function(c) {
            c = _.flatten(c);
            c = _.without(c, ' ', '\t', 'AND');
            return new ast.Where(c);
          },
        peg$c44 = function(x) { 
                      if (x == "NULL" || x == "null") {
                        return new ast.SpecialExpr(null);
                      }
                      return new ast.ValExpr(x); 
                    },
        peg$c45 = function(t) { return new ast.ColExpr(t[2], t[0]); },
        peg$c46 = function(c) { return new ast.ColExpr(c); },
        peg$c47 = function(r) { return r; },
        peg$c48 = function(pv) { return pv },
        peg$c49 = function(u) { return new ast.UnaryExpr(u[0], u[1]); },
        peg$c50 = function(p) { return p[1]; },
        peg$c51 = function(e) { 
                     if (_.isNull(e[0])) return e[2];
                     if (_.isNull(e[0][0]))
                       return new ast.UnaryExpr("NOT EXISTS", e[2]);
                     return new ast.UnaryExpr("EXISTS", e[2]);
                   },
        peg$c52 = function(v) { return v[1] },
        peg$c53 = function(e) {
            var expr = e[0];
            var expr_rest = e[1];
            var memo_f = function(memo, e) { return new ast.Expr(memo, 'AND', e); }

            expr_rest = _.compact(_.without(_.flatten(expr_rest), "AND", " ", "\t"));
            expr = _.reduce(expr_rest, memo_f, expr);
            return expr;
          },
        peg$c54 = function(s) { return s[1]; },
        peg$c55 = function(t) { return new ast.TableExpr(t); },
        peg$c56 = function(j) { return _.chain(j)
                                  .flatten()
                                  .without(",", " ", "\t", null, "(", ")")
                                  .value()
                        },
        peg$c57 = function(i) { 
                        var op = "IN";
                        if (!_.isNull(i[1])) op = "NOT IN";
                        return new ast.Expr(i[0], op, i[3]);
                      },
        peg$c58 = function(a) { return new ast.Expr(a[0], a[1], a[2]); },
        peg$c59 = function(b) { return new ast.Expr(b[0], b[1]); },
        peg$c60 = function(c) { return new ast.Expr(c[0], "IS NOT", c[c.length-1]) },
        peg$c61 = function(f) { 
                        if (f.length == 5) {
                          return new ast.BetweenExpr(f[0], "NOT BETWEEN", f[3], f[5]);
                        } return new ast.BetweenExpr(f[0], "BETWEEN", f[3], f[5]);
                      },
        peg$c62 = function(e) { return e[1]; },
        peg$c63 = "$",
        peg$c64 = { type: "literal", value: "$", description: "\"$\"" },
        peg$c65 = function(r) { return new ast.ParamVar(r[1]); },
        peg$c66 = ":",
        peg$c67 = { type: "literal", value: ":", description: "\":\"" },
        peg$c68 = "|",
        peg$c69 = { type: "literal", value: "|", description: "\"|\"" },
        peg$c70 = function(r) {
            var expr = r[1];

            var defaultMatch = r[2];
            var defaultExpr = null;
            if (!_.isNull(defaultMatch)) {
              defaultExpr = defaultMatch[3];
              if (defaultExpr.descendents("ParamVar").length > 0) {
                throw Error("Param: default expression cannot include variables");
              }
            }
            return new ast.ParamExpr(expr, defaultExpr);
          },
        peg$c71 = function(x) { return new ast.ValExpr(x); },
        peg$c72 = function(v) { return new ast.ColExpr(v, null); },
        peg$c73 = function(pv) { return pv; },
        peg$c74 = function(y) { return y[1]; },
        peg$c75 = "EXISTS",
        peg$c76 = { type: "literal", value: "EXISTS", description: "\"EXISTS\"" },
        peg$c77 = function(d) { return new ast.QuantExpr("exists", d[2], d[5], d[7]); },
        peg$c78 = "FORALL",
        peg$c79 = { type: "literal", value: "FORALL", description: "\"FORALL\"" },
        peg$c80 = function(e) { return new ast.QuantExpr("all", e[2], e[5], e[7]); },
        peg$c81 = function(a) { 
                          var distinct = !_.isNull(a[0]);
                          var args = _.chain(a[1])
                            .flatten()
                            .without(",", " ", "\t", "\n")
                            .compact()
                            .value();
                          return {
                            distinct: distinct,
                            args: args
                          }
                         },
        peg$c82 = function() { 
                           return { 
                            distinct: false,
                            args: [new ast.SpecialExpr("*")]
                           }; 
                          },
        peg$c83 = function(cf) { 
            var args = cf[3];
            return new ast.FuncExpr(cf[0], args.args);
          },
        peg$c84 = function(r) { return new ast.ColExpr(r[2], r[0]); },
        peg$c85 = function(r) { return new ast.TableExpr(r); },
        peg$c86 = function(digits) { 
            var x = flatstr(digits);
            if (x.indexOf('.') >= 0) {
              return parseFloat(x);
            }
            return parseInt(x);
          },
        peg$c87 = function(t) { if (!_.isNull(t) && !_.isNull(t[0])) t = t[0];
                      return new ast.SpecialExpr("*", t); },
        peg$c88 = function(a) { 
                        var distinct = !_.isNull(a[0]);
                        var args = _.chain(a[1])
                          .flatten()
                          .without(",", " ", "\t", null)
                          .value();
                        // ignores distinct
                        return args;
                      },
        peg$c89 = function(cf) { 
            return new ast.FuncExpr(cf[0], cf[3]);
          },
        peg$c90 = function(r) {
            var t = null;
            if (!_.isNull(r[0]) && !_.isNull(r[0][0])) t = r[0][0];
            return new ast.ColExpr(r[1], t);
          },
        peg$c91 = function(gt) { return gt[1]; },
        peg$c92 = function(ot) { 
            var asc = true; 
            if (ot[1][1] == "DESC") asc = false;
            return new ast.OrderByClause(ot[1][0], asc);
          },
        peg$c93 = function(o) { return { op: flatstr(o) } },
        peg$c94 = "-",
        peg$c95 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c96 = "+",
        peg$c97 = { type: "literal", value: "+", description: "\"+\"" },
        peg$c98 = "~",
        peg$c99 = { type: "literal", value: "~", description: "\"~\"" },
        peg$c100 = "NOT",
        peg$c101 = { type: "literal", value: "NOT", description: "\"NOT\"" },
        peg$c102 = function(x) { return x[1] },
        peg$c103 = "||",
        peg$c104 = { type: "literal", value: "||", description: "\"||\"" },
        peg$c105 = "*",
        peg$c106 = { type: "literal", value: "*", description: "\"*\"" },
        peg$c107 = "/",
        peg$c108 = { type: "literal", value: "/", description: "\"/\"" },
        peg$c109 = "%",
        peg$c110 = { type: "literal", value: "%", description: "\"%\"" },
        peg$c111 = "<<",
        peg$c112 = { type: "literal", value: "<<", description: "\"<<\"" },
        peg$c113 = ">>",
        peg$c114 = { type: "literal", value: ">>", description: "\">>\"" },
        peg$c115 = "&",
        peg$c116 = { type: "literal", value: "&", description: "\"&\"" },
        peg$c117 = "<=",
        peg$c118 = { type: "literal", value: "<=", description: "\"<=\"" },
        peg$c119 = ">=",
        peg$c120 = { type: "literal", value: ">=", description: "\">=\"" },
        peg$c121 = "<",
        peg$c122 = { type: "literal", value: "<", description: "\"<\"" },
        peg$c123 = ">",
        peg$c124 = { type: "literal", value: ">", description: "\">\"" },
        peg$c125 = "=",
        peg$c126 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c127 = "==",
        peg$c128 = { type: "literal", value: "==", description: "\"==\"" },
        peg$c129 = "!=",
        peg$c130 = { type: "literal", value: "!=", description: "\"!=\"" },
        peg$c131 = "<>",
        peg$c132 = { type: "literal", value: "<>", description: "\"<>\"" },
        peg$c133 = "IS",
        peg$c134 = { type: "literal", value: "IS", description: "\"IS\"" },
        peg$c135 = "IS NOT",
        peg$c136 = { type: "literal", value: "IS NOT", description: "\"IS NOT\"" },
        peg$c137 = "IN",
        peg$c138 = { type: "literal", value: "IN", description: "\"IN\"" },
        peg$c139 = "NOT IN",
        peg$c140 = { type: "literal", value: "NOT IN", description: "\"NOT IN\"" },
        peg$c141 = "LIKE",
        peg$c142 = { type: "literal", value: "LIKE", description: "\"LIKE\"" },
        peg$c143 = "GLOB",
        peg$c144 = { type: "literal", value: "GLOB", description: "\"GLOB\"" },
        peg$c145 = "MATCH",
        peg$c146 = { type: "literal", value: "MATCH", description: "\"MATCH\"" },
        peg$c147 = "REGEXP",
        peg$c148 = { type: "literal", value: "REGEXP", description: "\"REGEXP\"" },
        peg$c149 = "OR",
        peg$c150 = { type: "literal", value: "OR", description: "\"OR\"" },
        peg$c151 = /^[A-Za-z0-9_]/,
        peg$c152 = { type: "class", value: "[A-Za-z0-9_]", description: "[A-Za-z0-9_]" },
        peg$c153 = function(str) { return str.join('') },
        peg$c154 = "int",
        peg$c155 = { type: "literal", value: "int", description: "\"int\"" },
        peg$c156 = "numeric",
        peg$c157 = { type: "literal", value: "numeric", description: "\"numeric\"" },
        peg$c158 = "float",
        peg$c159 = { type: "literal", value: "float", description: "\"float\"" },
        peg$c160 = "text",
        peg$c161 = { type: "literal", value: "text", description: "\"text\"" },
        peg$c162 = "varchar",
        peg$c163 = { type: "literal", value: "varchar", description: "\"varchar\"" },
        peg$c164 = "char",
        peg$c165 = { type: "literal", value: "char", description: "\"char\"" },
        peg$c166 = function(n) { return new ast.Table(n, null); },
        peg$c167 = /^[0-9]/,
        peg$c168 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c169 = ".",
        peg$c170 = { type: "literal", value: ".", description: "\".\"" },
        peg$c171 = ",",
        peg$c172 = { type: "literal", value: ",", description: "\",\"" },
        peg$c173 = ";",
        peg$c174 = { type: "literal", value: ";", description: "\";\"" },
        peg$c175 = "--",
        peg$c176 = { type: "literal", value: "--", description: "\"--\"" },
        peg$c177 = "(",
        peg$c178 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c179 = ")",
        peg$c180 = { type: "literal", value: ")", description: "\")\"" },
        peg$c181 = "\n",
        peg$c182 = { type: "literal", value: "\n", description: "\"\\n\"" },
        peg$c183 = /^[^\n]/,
        peg$c184 = { type: "class", value: "[^\\n]", description: "[^\\n]" },
        peg$c185 = "/*",
        peg$c186 = { type: "literal", value: "/*", description: "\"/*\"" },
        peg$c187 = "*/",
        peg$c188 = { type: "literal", value: "*/", description: "\"*/\"" },
        peg$c189 = { type: "any", description: "any character" },
        peg$c190 = "'",
        peg$c191 = { type: "literal", value: "'", description: "\"'\"" },
        peg$c192 = /^[^"']/,
        peg$c193 = { type: "class", value: "[^\"']", description: "[^\"']" },
        peg$c194 = function(s) { return s[1].join(''); },
        peg$c195 = "\\",
        peg$c196 = { type: "literal", value: "\\", description: "\"\\\\\"" },
        peg$c197 = "",
        peg$c198 = "now",
        peg$c199 = { type: "literal", value: "now", description: "\"now\"" },
        peg$c200 = /^[ \t\n\r]/,
        peg$c201 = { type: "class", value: "[ \\t\\n\\r]", description: "[ \\t\\n\\r]" },
        peg$c202 = "ADD",
        peg$c203 = { type: "literal", value: "ADD", description: "\"ADD\"" },
        peg$c204 = "ALL",
        peg$c205 = { type: "literal", value: "ALL", description: "\"ALL\"" },
        peg$c206 = "ALTER",
        peg$c207 = { type: "literal", value: "ALTER", description: "\"ALTER\"" },
        peg$c208 = "AS",
        peg$c209 = { type: "literal", value: "AS", description: "\"AS\"" },
        peg$c210 = "ASC",
        peg$c211 = { type: "literal", value: "ASC", description: "\"ASC\"" },
        peg$c212 = "BETWEEN",
        peg$c213 = { type: "literal", value: "BETWEEN", description: "\"BETWEEN\"" },
        peg$c214 = "BY",
        peg$c215 = { type: "literal", value: "BY", description: "\"BY\"" },
        peg$c216 = "CAST",
        peg$c217 = { type: "literal", value: "CAST", description: "\"CAST\"" },
        peg$c218 = "COLUMN",
        peg$c219 = { type: "literal", value: "COLUMN", description: "\"COLUMN\"" },
        peg$c220 = "DESC",
        peg$c221 = { type: "literal", value: "DESC", description: "\"DESC\"" },
        peg$c222 = "DISTINCT",
        peg$c223 = { type: "literal", value: "DISTINCT", description: "\"DISTINCT\"" },
        peg$c224 = "E",
        peg$c225 = { type: "literal", value: "E", description: "\"E\"" },
        peg$c226 = "ESCAPE",
        peg$c227 = { type: "literal", value: "ESCAPE", description: "\"ESCAPE\"" },
        peg$c228 = "EXCEPT",
        peg$c229 = { type: "literal", value: "EXCEPT", description: "\"EXCEPT\"" },
        peg$c230 = "EXPLAIN",
        peg$c231 = { type: "literal", value: "EXPLAIN", description: "\"EXPLAIN\"" },
        peg$c232 = "EVENT",
        peg$c233 = { type: "literal", value: "EVENT", description: "\"EVENT\"" },
        peg$c234 = "FROM",
        peg$c235 = { type: "literal", value: "FROM", description: "\"FROM\"" },
        peg$c236 = "GROUP",
        peg$c237 = { type: "literal", value: "GROUP", description: "\"GROUP\"" },
        peg$c238 = "HAVING",
        peg$c239 = { type: "literal", value: "HAVING", description: "\"HAVING\"" },
        peg$c240 = "INNER",
        peg$c241 = { type: "literal", value: "INNER", description: "\"INNER\"" },
        peg$c242 = "INSERT",
        peg$c243 = { type: "literal", value: "INSERT", description: "\"INSERT\"" },
        peg$c244 = "INTERSECT",
        peg$c245 = { type: "literal", value: "INTERSECT", description: "\"INTERSECT\"" },
        peg$c246 = "INTO",
        peg$c247 = { type: "literal", value: "INTO", description: "\"INTO\"" },
        peg$c248 = "ISNULL",
        peg$c249 = { type: "literal", value: "ISNULL", description: "\"ISNULL\"" },
        peg$c250 = "JOIN",
        peg$c251 = { type: "literal", value: "JOIN", description: "\"JOIN\"" },
        peg$c252 = "KEY",
        peg$c253 = { type: "literal", value: "KEY", description: "\"KEY\"" },
        peg$c254 = "LEFT",
        peg$c255 = { type: "literal", value: "LEFT", description: "\"LEFT\"" },
        peg$c256 = "LIMIT",
        peg$c257 = { type: "literal", value: "LIMIT", description: "\"LIMIT\"" },
        peg$c258 = "NO",
        peg$c259 = { type: "literal", value: "NO", description: "\"NO\"" },
        peg$c260 = "NOTNULL",
        peg$c261 = { type: "literal", value: "NOTNULL", description: "\"NOTNULL\"" },
        peg$c262 = "NULL",
        peg$c263 = { type: "literal", value: "NULL", description: "\"NULL\"" },
        peg$c264 = "null",
        peg$c265 = { type: "literal", value: "null", description: "\"null\"" },
        peg$c266 = "OF",
        peg$c267 = { type: "literal", value: "OF", description: "\"OF\"" },
        peg$c268 = "OFFSET",
        peg$c269 = { type: "literal", value: "OFFSET", description: "\"OFFSET\"" },
        peg$c270 = "ON",
        peg$c271 = { type: "literal", value: "ON", description: "\"ON\"" },
        peg$c272 = "ORDER",
        peg$c273 = { type: "literal", value: "ORDER", description: "\"ORDER\"" },
        peg$c274 = "OUTER",
        peg$c275 = { type: "literal", value: "OUTER", description: "\"OUTER\"" },
        peg$c276 = "PRIMARY",
        peg$c277 = { type: "literal", value: "PRIMARY", description: "\"PRIMARY\"" },
        peg$c278 = "QUERY",
        peg$c279 = { type: "literal", value: "QUERY", description: "\"QUERY\"" },
        peg$c280 = "RAISE",
        peg$c281 = { type: "literal", value: "RAISE", description: "\"RAISE\"" },
        peg$c282 = "REFERENCES",
        peg$c283 = { type: "literal", value: "REFERENCES", description: "\"REFERENCES\"" },
        peg$c284 = "RENAME",
        peg$c285 = { type: "literal", value: "RENAME", description: "\"RENAME\"" },
        peg$c286 = "REPLACE",
        peg$c287 = { type: "literal", value: "REPLACE", description: "\"REPLACE\"" },
        peg$c288 = "ROW",
        peg$c289 = { type: "literal", value: "ROW", description: "\"ROW\"" },
        peg$c290 = "SAVEPOINT",
        peg$c291 = { type: "literal", value: "SAVEPOINT", description: "\"SAVEPOINT\"" },
        peg$c292 = "SELECT",
        peg$c293 = { type: "literal", value: "SELECT", description: "\"SELECT\"" },
        peg$c294 = "SET",
        peg$c295 = { type: "literal", value: "SET", description: "\"SET\"" },
        peg$c296 = "TABLE",
        peg$c297 = { type: "literal", value: "TABLE", description: "\"TABLE\"" },
        peg$c298 = "TEMP",
        peg$c299 = { type: "literal", value: "TEMP", description: "\"TEMP\"" },
        peg$c300 = "TEMPORARY",
        peg$c301 = { type: "literal", value: "TEMPORARY", description: "\"TEMPORARY\"" },
        peg$c302 = "THEN",
        peg$c303 = { type: "literal", value: "THEN", description: "\"THEN\"" },
        peg$c304 = "TO",
        peg$c305 = { type: "literal", value: "TO", description: "\"TO\"" },
        peg$c306 = "UNION",
        peg$c307 = { type: "literal", value: "UNION", description: "\"UNION\"" },
        peg$c308 = "USING",
        peg$c309 = { type: "literal", value: "USING", description: "\"USING\"" },
        peg$c310 = "VALUES",
        peg$c311 = { type: "literal", value: "VALUES", description: "\"VALUES\"" },
        peg$c312 = "VIRTUAL",
        peg$c313 = { type: "literal", value: "VIRTUAL", description: "\"VIRTUAL\"" },
        peg$c314 = "WITH",
        peg$c315 = { type: "literal", value: "WITH", description: "\"WITH\"" },
        peg$c316 = "WHERE",
        peg$c317 = { type: "literal", value: "WHERE", description: "\"WHERE\"" },
        peg$c318 = { type: "other", description: "string" },
        peg$c319 = "\"",
        peg$c320 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c321 = function(chars) {
              return { type: "Literal", value: chars.join("") };
            },
        peg$c322 = function() { return text(); },
        peg$c323 = function(sequence) { return sequence; },
        peg$c324 = function() { return ""; },
        peg$c325 = "0",
        peg$c326 = { type: "literal", value: "0", description: "\"0\"" },
        peg$c327 = function() { return "\0"; },
        peg$c328 = /^[\n\r\u2028\u2029]/,
        peg$c329 = { type: "class", value: "[\\n\\r\\u2028\\u2029]", description: "[\\n\\r\\u2028\\u2029]" },
        peg$c330 = "b",
        peg$c331 = { type: "literal", value: "b", description: "\"b\"" },
        peg$c332 = function() { return "\b";   },
        peg$c333 = "f",
        peg$c334 = { type: "literal", value: "f", description: "\"f\"" },
        peg$c335 = function() { return "\f";   },
        peg$c336 = "n",
        peg$c337 = { type: "literal", value: "n", description: "\"n\"" },
        peg$c338 = function() { return "\n";   },
        peg$c339 = "r",
        peg$c340 = { type: "literal", value: "r", description: "\"r\"" },
        peg$c341 = function() { return "\r";   },
        peg$c342 = "t",
        peg$c343 = { type: "literal", value: "t", description: "\"t\"" },
        peg$c344 = function() { return "\t";   },
        peg$c345 = "v",
        peg$c346 = { type: "literal", value: "v", description: "\"v\"" },
        peg$c347 = function() { return "\x0B"; },
        peg$c348 = { type: "other", description: "end of line" },
        peg$c349 = "\r\n",
        peg$c350 = { type: "literal", value: "\r\n", description: "\"\\r\\n\"" },
        peg$c351 = "\r",
        peg$c352 = { type: "literal", value: "\r", description: "\"\\r\"" },
        peg$c353 = "\u2028",
        peg$c354 = { type: "literal", value: "\u2028", description: "\"\\u2028\"" },
        peg$c355 = "\u2029",
        peg$c356 = { type: "literal", value: "\u2029", description: "\"\\u2029\"" },
        peg$c357 = "x",
        peg$c358 = { type: "literal", value: "x", description: "\"x\"" },
        peg$c359 = "u",
        peg$c360 = { type: "literal", value: "u", description: "\"u\"" },
        peg$c361 = function(digits) {
              return String.fromCharCode(parseInt(digits, 16));
            },
        peg$c362 = /^[0-9a-f]/i,
        peg$c363 = { type: "class", value: "[0-9a-f]i", description: "[0-9a-f]i" },

        peg$currPos          = 0,
        peg$savedPos         = 0,
        peg$posDetailsCache  = [{ line: 1, column: 1, seenCR: false }],
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$savedPos, peg$currPos);
    }

    function location() {
      return peg$computeLocation(peg$savedPos, peg$currPos);
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        input.substring(peg$savedPos, peg$currPos),
        peg$computeLocation(peg$savedPos, peg$currPos)
      );
    }

    function error(message) {
      throw peg$buildException(
        message,
        null,
        input.substring(peg$savedPos, peg$currPos),
        peg$computeLocation(peg$savedPos, peg$currPos)
      );
    }

    function peg$computePosDetails(pos) {
      var details = peg$posDetailsCache[pos],
          p, ch;

      if (details) {
        return details;
      } else {
        p = pos - 1;
        while (!peg$posDetailsCache[p]) {
          p--;
        }

        details = peg$posDetailsCache[p];
        details = {
          line:   details.line,
          column: details.column,
          seenCR: details.seenCR
        };

        while (p < pos) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }

          p++;
        }

        peg$posDetailsCache[pos] = details;
        return details;
      }
    }

    function peg$computeLocation(startPos, endPos) {
      var startPosDetails = peg$computePosDetails(startPos),
          endPosDetails   = peg$computePosDetails(endPos);

      return {
        start: {
          offset: startPos,
          line:   startPosDetails.line,
          column: startPosDetails.column
        },
        end: {
          offset: endPos,
          line:   endPosDetails.line,
          column: endPosDetails.column
        }
      };
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, found, location) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0100-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1000-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new peg$SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        location
      );
    }

    function peg$parsestart() {
      var s0;

      s0 = peg$parsestmt_list();

      return s0;
    }

    function peg$parsestmt_list() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsegeneral_stmt();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parsewhitespace();
          if (s4 !== peg$FAILED) {
            s5 = [];
            s6 = peg$currPos;
            s7 = peg$parsesemicolon();
            if (s7 !== peg$FAILED) {
              s8 = peg$parsewhitespace();
              if (s8 !== peg$FAILED) {
                s9 = peg$parsegeneral_stmt();
                if (s9 === peg$FAILED) {
                  s9 = null;
                }
                if (s9 !== peg$FAILED) {
                  s10 = peg$parsewhitespace();
                  if (s10 !== peg$FAILED) {
                    s7 = [s7, s8, s9, s10];
                    s6 = s7;
                  } else {
                    peg$currPos = s6;
                    s6 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
            while (s6 !== peg$FAILED) {
              s5.push(s6);
              s6 = peg$currPos;
              s7 = peg$parsesemicolon();
              if (s7 !== peg$FAILED) {
                s8 = peg$parsewhitespace();
                if (s8 !== peg$FAILED) {
                  s9 = peg$parsegeneral_stmt();
                  if (s9 === peg$FAILED) {
                    s9 = null;
                  }
                  if (s9 !== peg$FAILED) {
                    s10 = peg$parsewhitespace();
                    if (s10 !== peg$FAILED) {
                      s7 = [s7, s8, s9, s10];
                      s6 = s7;
                    } else {
                      peg$currPos = s6;
                      s6 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s6;
                    s6 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parsesemicolon();
              if (s6 === peg$FAILED) {
                s6 = null;
              }
              if (s6 !== peg$FAILED) {
                s2 = [s2, s3, s4, s5, s6];
                s1 = s2;
              } else {
                peg$currPos = s1;
                s1 = peg$FAILED;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c0(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsegeneral_stmt() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parseselect_stmt();
      if (s1 === peg$FAILED) {
        s1 = peg$parsefunc_stmt();
        if (s1 === peg$FAILED) {
          s1 = peg$parseparam_expr();
          if (s1 === peg$FAILED) {
            s1 = peg$parseexpr_and();
          }
        }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c1(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsefunc_stmt() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsename();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsewhitespace();
        if (s3 !== peg$FAILED) {
          s4 = peg$parselparen();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsewhitespace();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseselect_stmt();
              if (s6 === peg$FAILED) {
                s6 = peg$parsetable_name();
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parsewhitespace();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parserparen();
                  if (s8 !== peg$FAILED) {
                    s2 = [s2, s3, s4, s5, s6, s7, s8];
                    s1 = s2;
                  } else {
                    peg$currPos = s1;
                    s1 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s1;
                  s1 = peg$FAILED;
                }
              } else {
                peg$currPos = s1;
                s1 = peg$FAILED;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c2(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseselect_stmt() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$currPos;
      s3 = peg$parseselect_core();
      if (s3 !== peg$FAILED) {
        s4 = [];
        s5 = peg$currPos;
        s6 = peg$parsecompound_operator();
        if (s6 !== peg$FAILED) {
          s7 = peg$parseselect_core();
          if (s7 !== peg$FAILED) {
            s6 = [s6, s7];
            s5 = s6;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
        } else {
          peg$currPos = s5;
          s5 = peg$FAILED;
        }
        while (s5 !== peg$FAILED) {
          s4.push(s5);
          s5 = peg$currPos;
          s6 = peg$parsecompound_operator();
          if (s6 !== peg$FAILED) {
            s7 = peg$parseselect_core();
            if (s7 !== peg$FAILED) {
              s6 = [s6, s7];
              s5 = s6;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
        }
        if (s4 !== peg$FAILED) {
          s3 = [s3, s4];
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s1;
        s2 = peg$c3(s2);
      }
      s1 = s2;
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$currPos;
        s4 = peg$parseORDER();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseBY();
          if (s5 !== peg$FAILED) {
            s6 = peg$parseordering_term();
            if (s6 !== peg$FAILED) {
              s7 = [];
              s8 = peg$currPos;
              s9 = peg$parsewhitespace();
              if (s9 !== peg$FAILED) {
                s10 = peg$parsecomma();
                if (s10 !== peg$FAILED) {
                  s11 = peg$parseordering_term();
                  if (s11 !== peg$FAILED) {
                    s9 = [s9, s10, s11];
                    s8 = s9;
                  } else {
                    peg$currPos = s8;
                    s8 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s8;
                  s8 = peg$FAILED;
                }
              } else {
                peg$currPos = s8;
                s8 = peg$FAILED;
              }
              while (s8 !== peg$FAILED) {
                s7.push(s8);
                s8 = peg$currPos;
                s9 = peg$parsewhitespace();
                if (s9 !== peg$FAILED) {
                  s10 = peg$parsecomma();
                  if (s10 !== peg$FAILED) {
                    s11 = peg$parseordering_term();
                    if (s11 !== peg$FAILED) {
                      s9 = [s9, s10, s11];
                      s8 = s9;
                    } else {
                      peg$currPos = s8;
                      s8 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s8;
                    s8 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s8;
                  s8 = peg$FAILED;
                }
              }
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s2;
          s3 = peg$c4(s1, s3);
        }
        s2 = s3;
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$currPos;
          s5 = peg$parseLIMIT();
          if (s5 !== peg$FAILED) {
            s6 = peg$parseexpr();
            if (s6 !== peg$FAILED) {
              s7 = peg$currPos;
              s8 = peg$parseOFFSET();
              if (s8 !== peg$FAILED) {
                s9 = peg$parseexpr();
                if (s9 !== peg$FAILED) {
                  s8 = [s8, s9];
                  s7 = s8;
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
              if (s7 === peg$FAILED) {
                s7 = null;
              }
              if (s7 !== peg$FAILED) {
                s5 = [s5, s6, s7];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c5(s1, s2, s4);
          }
          s3 = s4;
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c6(s1, s2, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseselect_core() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16;

      s0 = peg$currPos;
      s1 = peg$parseSELECT();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseDISTINCT();
        if (s2 === peg$FAILED) {
          s2 = peg$parseALL();
        }
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$currPos;
          s5 = peg$parseselect_result();
          if (s5 !== peg$FAILED) {
            s6 = [];
            s7 = peg$currPos;
            s8 = peg$parsewhitespace();
            if (s8 !== peg$FAILED) {
              s9 = peg$parsecomma();
              if (s9 !== peg$FAILED) {
                s10 = peg$parseselect_result();
                if (s10 !== peg$FAILED) {
                  s8 = [s8, s9, s10];
                  s7 = s8;
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
            } else {
              peg$currPos = s7;
              s7 = peg$FAILED;
            }
            while (s7 !== peg$FAILED) {
              s6.push(s7);
              s7 = peg$currPos;
              s8 = peg$parsewhitespace();
              if (s8 !== peg$FAILED) {
                s9 = peg$parsecomma();
                if (s9 !== peg$FAILED) {
                  s10 = peg$parseselect_result();
                  if (s10 !== peg$FAILED) {
                    s8 = [s8, s9, s10];
                    s7 = s8;
                  } else {
                    peg$currPos = s7;
                    s7 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
            }
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c7(s2, s4);
          }
          s3 = s4;
          if (s3 !== peg$FAILED) {
            s4 = peg$currPos;
            s5 = peg$currPos;
            s6 = peg$parseFROM();
            if (s6 !== peg$FAILED) {
              s7 = peg$parsejoin_source();
              if (s7 !== peg$FAILED) {
                s6 = [s6, s7];
                s5 = s6;
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 === peg$FAILED) {
              s5 = null;
            }
            if (s5 !== peg$FAILED) {
              peg$savedPos = s4;
              s5 = peg$c8(s2, s3, s5);
            }
            s4 = s5;
            if (s4 !== peg$FAILED) {
              s5 = peg$currPos;
              s6 = peg$currPos;
              s7 = peg$parseWHERE();
              if (s7 !== peg$FAILED) {
                s8 = peg$parsewhere();
                if (s8 !== peg$FAILED) {
                  s7 = [s7, s8];
                  s6 = s7;
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
              if (s6 === peg$FAILED) {
                s6 = null;
              }
              if (s6 !== peg$FAILED) {
                peg$savedPos = s5;
                s6 = peg$c9(s2, s3, s4, s6);
              }
              s5 = s6;
              if (s5 !== peg$FAILED) {
                s6 = peg$currPos;
                s7 = peg$currPos;
                s8 = peg$parseGROUP();
                if (s8 !== peg$FAILED) {
                  s9 = peg$parseBY();
                  if (s9 !== peg$FAILED) {
                    s10 = peg$currPos;
                    s11 = peg$currPos;
                    s12 = peg$parsegrouping_term();
                    if (s12 !== peg$FAILED) {
                      s13 = [];
                      s14 = peg$currPos;
                      s15 = peg$parsecomma();
                      if (s15 !== peg$FAILED) {
                        s16 = peg$parsegrouping_term();
                        if (s16 !== peg$FAILED) {
                          s15 = [s15, s16];
                          s14 = s15;
                        } else {
                          peg$currPos = s14;
                          s14 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s14;
                        s14 = peg$FAILED;
                      }
                      while (s14 !== peg$FAILED) {
                        s13.push(s14);
                        s14 = peg$currPos;
                        s15 = peg$parsecomma();
                        if (s15 !== peg$FAILED) {
                          s16 = peg$parsegrouping_term();
                          if (s16 !== peg$FAILED) {
                            s15 = [s15, s16];
                            s14 = s15;
                          } else {
                            peg$currPos = s14;
                            s14 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s14;
                          s14 = peg$FAILED;
                        }
                      }
                      if (s13 !== peg$FAILED) {
                        s12 = [s12, s13];
                        s11 = s12;
                      } else {
                        peg$currPos = s11;
                        s11 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s11;
                      s11 = peg$FAILED;
                    }
                    if (s11 !== peg$FAILED) {
                      peg$savedPos = s10;
                      s11 = peg$c10(s2, s3, s4, s5, s11);
                    }
                    s10 = s11;
                    if (s10 !== peg$FAILED) {
                      s11 = peg$currPos;
                      s12 = peg$parseHAVING();
                      if (s12 !== peg$FAILED) {
                        s13 = peg$parseexpr();
                        if (s13 !== peg$FAILED) {
                          s12 = [s12, s13];
                          s11 = s12;
                        } else {
                          peg$currPos = s11;
                          s11 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s11;
                        s11 = peg$FAILED;
                      }
                      if (s11 === peg$FAILED) {
                        s11 = null;
                      }
                      if (s11 !== peg$FAILED) {
                        s8 = [s8, s9, s10, s11];
                        s7 = s8;
                      } else {
                        peg$currPos = s7;
                        s7 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s7;
                      s7 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s7;
                    s7 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
                if (s7 === peg$FAILED) {
                  s7 = null;
                }
                if (s7 !== peg$FAILED) {
                  peg$savedPos = s6;
                  s7 = peg$c11(s2, s3, s4, s5, s7);
                }
                s6 = s7;
                if (s6 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c12(s2, s3, s4, s5, s6);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseselect_result() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace();
      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;
        s4 = peg$currPos;
        s5 = peg$parsename();
        if (s5 !== peg$FAILED) {
          s6 = peg$parsedot();
          if (s6 !== peg$FAILED) {
            s7 = peg$parsestar();
            if (s7 !== peg$FAILED) {
              s5 = [s5, s6, s7];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          peg$savedPos = s3;
          s4 = peg$c13(s4);
        }
        s3 = s4;
        if (s3 === peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$currPos;
          s5 = peg$parsevalue();
          if (s5 !== peg$FAILED) {
            s6 = peg$currPos;
            s7 = peg$parseAS();
            if (s7 !== peg$FAILED) {
              s8 = peg$parsewhitespace();
              if (s8 !== peg$FAILED) {
                s9 = peg$parsename();
                if (s9 !== peg$FAILED) {
                  s7 = [s7, s8, s9];
                  s6 = s7;
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
            if (s6 === peg$FAILED) {
              s6 = null;
            }
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c14(s4);
          }
          s3 = s4;
          if (s3 === peg$FAILED) {
            s3 = peg$currPos;
            s4 = peg$currPos;
            s5 = peg$parsecolumn_ref();
            if (s5 !== peg$FAILED) {
              s6 = peg$currPos;
              s7 = peg$parseAS();
              if (s7 !== peg$FAILED) {
                s8 = peg$parsewhitespace();
                if (s8 !== peg$FAILED) {
                  s9 = peg$parsename();
                  if (s9 !== peg$FAILED) {
                    s7 = [s7, s8, s9];
                    s6 = s7;
                  } else {
                    peg$currPos = s6;
                    s6 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
              if (s6 === peg$FAILED) {
                s6 = null;
              }
              if (s6 !== peg$FAILED) {
                s5 = [s5, s6];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s3;
              s4 = peg$c15(s4);
            }
            s3 = s4;
            if (s3 === peg$FAILED) {
              s3 = peg$currPos;
              s4 = peg$parsestar();
              if (s4 !== peg$FAILED) {
                peg$savedPos = s3;
                s4 = peg$c16();
              }
              s3 = s4;
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c17(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsejoin_source() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsesingle_source();
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$currPos;
          s6 = peg$parsewhitespace();
          if (s6 !== peg$FAILED) {
            s7 = peg$parsecomma();
            if (s7 !== peg$FAILED) {
              s8 = peg$parsewhitespace();
              if (s8 !== peg$FAILED) {
                s9 = peg$parsesingle_source();
                if (s9 !== peg$FAILED) {
                  s6 = [s6, s7, s8, s9];
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$currPos;
            s6 = peg$parsewhitespace();
            if (s6 !== peg$FAILED) {
              s7 = peg$parsecomma();
              if (s7 !== peg$FAILED) {
                s8 = peg$parsewhitespace();
                if (s8 !== peg$FAILED) {
                  s9 = peg$parsesingle_source();
                  if (s9 !== peg$FAILED) {
                    s6 = [s6, s7, s8, s9];
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          }
          if (s4 !== peg$FAILED) {
            s2 = [s2, s3, s4];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c18(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsesingle_source() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsetable_name();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseAS();
        if (s3 !== peg$FAILED) {
          s4 = peg$parsewhitespace1();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsename();
            if (s5 !== peg$FAILED) {
              s2 = [s2, s3, s4, s5];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c19(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$parselparen();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseselect_stmt();
          if (s3 !== peg$FAILED) {
            s4 = peg$parserparen();
            if (s4 !== peg$FAILED) {
              s5 = peg$currPos;
              s6 = peg$currPos;
              s7 = peg$parseAS();
              if (s7 !== peg$FAILED) {
                s8 = peg$parsewhitespace();
                if (s8 !== peg$FAILED) {
                  s9 = peg$parsename();
                  if (s9 !== peg$FAILED) {
                    s7 = [s7, s8, s9];
                    s6 = s7;
                  } else {
                    peg$currPos = s6;
                    s6 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
              if (s6 !== peg$FAILED) {
                peg$savedPos = s5;
                s6 = peg$c20(s6);
              }
              s5 = s6;
              if (s5 === peg$FAILED) {
                s5 = null;
              }
              if (s5 !== peg$FAILED) {
                s2 = [s2, s3, s4, s5];
                s1 = s2;
              } else {
                peg$currPos = s1;
                s1 = peg$FAILED;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c21(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$currPos;
          s2 = peg$parsename();
          if (s2 !== peg$FAILED) {
            s3 = peg$parsewhitespace();
            if (s3 !== peg$FAILED) {
              s4 = peg$parselparen();
              if (s4 !== peg$FAILED) {
                s5 = peg$parsewhitespace();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parseselect_stmt();
                  if (s6 === peg$FAILED) {
                    s6 = peg$parsetable_name();
                    if (s6 === peg$FAILED) {
                      s6 = peg$parseselect_result();
                    }
                  }
                  if (s6 === peg$FAILED) {
                    s6 = null;
                  }
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parsewhitespace();
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parserparen();
                      if (s8 !== peg$FAILED) {
                        s9 = peg$currPos;
                        s10 = peg$currPos;
                        s11 = peg$parseAS();
                        if (s11 !== peg$FAILED) {
                          s12 = peg$parsewhitespace();
                          if (s12 !== peg$FAILED) {
                            s13 = peg$parsename();
                            if (s13 !== peg$FAILED) {
                              s11 = [s11, s12, s13];
                              s10 = s11;
                            } else {
                              peg$currPos = s10;
                              s10 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s10;
                            s10 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s10;
                          s10 = peg$FAILED;
                        }
                        if (s10 !== peg$FAILED) {
                          peg$savedPos = s9;
                          s10 = peg$c20(s10);
                        }
                        s9 = s10;
                        if (s9 === peg$FAILED) {
                          s9 = null;
                        }
                        if (s9 !== peg$FAILED) {
                          s2 = [s2, s3, s4, s5, s6, s7, s8, s9];
                          s1 = s2;
                        } else {
                          peg$currPos = s1;
                          s1 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s1;
                        s1 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s1;
                      s1 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s1;
                    s1 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s1;
                  s1 = peg$FAILED;
                }
              } else {
                peg$currPos = s1;
                s1 = peg$FAILED;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c22(s1);
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parsetable_name();
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c23(s1);
            }
            s0 = s1;
          }
        }
      }

      return s0;
    }

    function peg$parseletudf_stmt() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c24) {
        s1 = peg$c24;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c25); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsewhitespace1();
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 8) === peg$c26) {
            s3 = peg$c26;
            peg$currPos += 8;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c27); }
          }
          if (s3 === peg$FAILED) {
            if (input.substr(peg$currPos, 6) === peg$c28) {
              s3 = peg$c28;
              peg$currPos += 6;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c29); }
            }
          }
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parsewhitespace1();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsename();
              if (s5 !== peg$FAILED) {
                if (input.substr(peg$currPos, 6) === peg$c30) {
                  s6 = peg$c30;
                  peg$currPos += 6;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c31); }
                }
                if (s6 === peg$FAILED) {
                  if (input.substr(peg$currPos, 7) === peg$c32) {
                    s6 = peg$c32;
                    peg$currPos += 7;
                  } else {
                    s6 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c33); }
                  }
                }
                if (s6 === peg$FAILED) {
                  s6 = null;
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parsewhitespace1();
                  if (s7 !== peg$FAILED) {
                    if (input.substr(peg$currPos, 6) === peg$c34) {
                      s8 = peg$c34;
                      peg$currPos += 6;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c35); }
                    }
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parsewhitespace();
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parselparen();
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parseletudf_arg_list();
                          if (s11 === peg$FAILED) {
                            s11 = null;
                          }
                          if (s11 !== peg$FAILED) {
                            s12 = peg$parserparen();
                            if (s12 !== peg$FAILED) {
                              s13 = peg$parsewhitespace1();
                              if (s13 !== peg$FAILED) {
                                if (input.substr(peg$currPos, 6) === peg$c36) {
                                  s14 = peg$c36;
                                  peg$currPos += 6;
                                } else {
                                  s14 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c37); }
                                }
                                if (s14 !== peg$FAILED) {
                                  s15 = peg$parsewhitespace();
                                  if (s15 !== peg$FAILED) {
                                    s16 = peg$parsejs_string_literal();
                                    if (s16 !== peg$FAILED) {
                                      peg$savedPos = s0;
                                      s1 = peg$c38(s3, s5, s6, s11, s16);
                                      s0 = s1;
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$FAILED;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseletudf_arg_list() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parseletudf_arg();
      if (s2 !== peg$FAILED) {
        s3 = [];
        s4 = peg$currPos;
        s5 = peg$parsewhitespace();
        if (s5 !== peg$FAILED) {
          s6 = peg$parsecomma();
          if (s6 !== peg$FAILED) {
            s7 = peg$parseletudf_arg();
            if (s7 !== peg$FAILED) {
              s5 = [s5, s6, s7];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$currPos;
          s5 = peg$parsewhitespace();
          if (s5 !== peg$FAILED) {
            s6 = peg$parsecomma();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseletudf_arg();
              if (s7 !== peg$FAILED) {
                s5 = [s5, s6, s7];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c39(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseletudf_arg() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsename();
        if (s3 !== peg$FAILED) {
          s4 = peg$parsewhitespace1();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsetype();
            if (s5 !== peg$FAILED) {
              s2 = [s2, s3, s4, s5];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c40(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsewhere() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace1();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseexpr();
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$currPos;
          s6 = peg$parsewhitespace();
          if (s6 !== peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c41) {
              s7 = peg$c41;
              peg$currPos += 3;
            } else {
              s7 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c42); }
            }
            if (s7 !== peg$FAILED) {
              s8 = peg$parseexpr();
              if (s8 !== peg$FAILED) {
                s6 = [s6, s7, s8];
                s5 = s6;
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$currPos;
            s6 = peg$parsewhitespace();
            if (s6 !== peg$FAILED) {
              if (input.substr(peg$currPos, 3) === peg$c41) {
                s7 = peg$c41;
                peg$currPos += 3;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c42); }
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$parseexpr();
                if (s8 !== peg$FAILED) {
                  s6 = [s6, s7, s8];
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          }
          if (s4 !== peg$FAILED) {
            s2 = [s2, s3, s4];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c43(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsevalue() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsecall_function();
        if (s3 === peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$parseliteral_value();
          if (s4 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c44(s4);
          }
          s3 = s4;
          if (s3 === peg$FAILED) {
            s3 = peg$currPos;
            s4 = peg$currPos;
            s5 = peg$parsetable_name();
            if (s5 !== peg$FAILED) {
              s6 = peg$parsedot();
              if (s6 !== peg$FAILED) {
                s7 = peg$parsename();
                if (s7 !== peg$FAILED) {
                  s5 = [s5, s6, s7];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s3;
              s4 = peg$c45(s4);
            }
            s3 = s4;
            if (s3 === peg$FAILED) {
              s3 = peg$currPos;
              s4 = peg$parsename();
              if (s4 !== peg$FAILED) {
                peg$savedPos = s3;
                s4 = peg$c46(s4);
              }
              s3 = s4;
              if (s3 === peg$FAILED) {
                s3 = peg$currPos;
                s4 = peg$parseparam_expr();
                if (s4 !== peg$FAILED) {
                  peg$savedPos = s3;
                  s4 = peg$c47(s4);
                }
                s3 = s4;
                if (s3 === peg$FAILED) {
                  s3 = peg$currPos;
                  s4 = peg$parseparam_var();
                  if (s4 !== peg$FAILED) {
                    peg$savedPos = s3;
                    s4 = peg$c48(s4);
                  }
                  s3 = s4;
                  if (s3 === peg$FAILED) {
                    s3 = peg$currPos;
                    s4 = peg$currPos;
                    s5 = peg$parseunary_operator();
                    if (s5 !== peg$FAILED) {
                      s6 = peg$parseexpr();
                      if (s6 !== peg$FAILED) {
                        s5 = [s5, s6];
                        s4 = s5;
                      } else {
                        peg$currPos = s4;
                        s4 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s4;
                      s4 = peg$FAILED;
                    }
                    if (s4 !== peg$FAILED) {
                      peg$savedPos = s3;
                      s4 = peg$c49(s4);
                    }
                    s3 = s4;
                    if (s3 === peg$FAILED) {
                      s3 = peg$currPos;
                      s4 = peg$currPos;
                      s5 = peg$parselparen();
                      if (s5 !== peg$FAILED) {
                        s6 = peg$parseexpr();
                        if (s6 !== peg$FAILED) {
                          s7 = peg$parsewhitespace();
                          if (s7 !== peg$FAILED) {
                            s8 = peg$parserparen();
                            if (s8 !== peg$FAILED) {
                              s5 = [s5, s6, s7, s8];
                              s4 = s5;
                            } else {
                              peg$currPos = s4;
                              s4 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s4;
                            s4 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s4;
                          s4 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s4;
                        s4 = peg$FAILED;
                      }
                      if (s4 !== peg$FAILED) {
                        peg$savedPos = s3;
                        s4 = peg$c50(s4);
                      }
                      s3 = s4;
                      if (s3 === peg$FAILED) {
                        s3 = peg$currPos;
                        s4 = peg$currPos;
                        s5 = peg$currPos;
                        s6 = peg$parseNOT();
                        if (s6 === peg$FAILED) {
                          s6 = null;
                        }
                        if (s6 !== peg$FAILED) {
                          s7 = peg$parseEXISTS();
                          if (s7 !== peg$FAILED) {
                            s6 = [s6, s7];
                            s5 = s6;
                          } else {
                            peg$currPos = s5;
                            s5 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s5;
                          s5 = peg$FAILED;
                        }
                        if (s5 === peg$FAILED) {
                          s5 = null;
                        }
                        if (s5 !== peg$FAILED) {
                          s6 = peg$parselparen();
                          if (s6 !== peg$FAILED) {
                            s7 = peg$parseselect_stmt();
                            if (s7 !== peg$FAILED) {
                              s8 = peg$parserparen();
                              if (s8 !== peg$FAILED) {
                                s5 = [s5, s6, s7, s8];
                                s4 = s5;
                              } else {
                                peg$currPos = s4;
                                s4 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s4;
                              s4 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s4;
                            s4 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s4;
                          s4 = peg$FAILED;
                        }
                        if (s4 !== peg$FAILED) {
                          peg$savedPos = s3;
                          s4 = peg$c51(s4);
                        }
                        s3 = s4;
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c52(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseexpr_and() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parseexpr();
      if (s2 !== peg$FAILED) {
        s3 = [];
        s4 = peg$currPos;
        s5 = peg$parsewhitespace1();
        if (s5 !== peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c41) {
            s6 = peg$c41;
            peg$currPos += 3;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c42); }
          }
          if (s6 !== peg$FAILED) {
            s7 = peg$parseexpr();
            if (s7 !== peg$FAILED) {
              s5 = [s5, s6, s7];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$currPos;
          s5 = peg$parsewhitespace1();
          if (s5 !== peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c41) {
              s6 = peg$c41;
              peg$currPos += 3;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c42); }
            }
            if (s6 !== peg$FAILED) {
              s7 = peg$parseexpr();
              if (s7 !== peg$FAILED) {
                s5 = [s5, s6, s7];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c53(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseexpr() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace();
      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;
        s4 = peg$currPos;
        s5 = peg$parsevalue();
        if (s5 !== peg$FAILED) {
          s6 = peg$parseNOT();
          if (s6 === peg$FAILED) {
            s6 = null;
          }
          if (s6 !== peg$FAILED) {
            s7 = peg$parseIN();
            if (s7 !== peg$FAILED) {
              s8 = peg$currPos;
              s9 = peg$currPos;
              s10 = peg$currPos;
              s11 = peg$parselparen();
              if (s11 !== peg$FAILED) {
                s12 = peg$parseselect_stmt();
                if (s12 !== peg$FAILED) {
                  s13 = peg$parserparen();
                  if (s13 !== peg$FAILED) {
                    s11 = [s11, s12, s13];
                    s10 = s11;
                  } else {
                    peg$currPos = s10;
                    s10 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s10;
                  s10 = peg$FAILED;
                }
              } else {
                peg$currPos = s10;
                s10 = peg$FAILED;
              }
              if (s10 !== peg$FAILED) {
                peg$savedPos = s9;
                s10 = peg$c54(s10);
              }
              s9 = s10;
              if (s9 === peg$FAILED) {
                s9 = peg$currPos;
                s10 = peg$parsetable_name();
                if (s10 !== peg$FAILED) {
                  peg$savedPos = s9;
                  s10 = peg$c55(s10);
                }
                s9 = s10;
              }
              if (s9 !== peg$FAILED) {
                peg$savedPos = s8;
                s9 = peg$c56(s9);
              }
              s8 = s9;
              if (s8 !== peg$FAILED) {
                s5 = [s5, s6, s7, s8];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          peg$savedPos = s3;
          s4 = peg$c57(s4);
        }
        s3 = s4;
        if (s3 === peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$currPos;
          s5 = peg$parsevalue();
          if (s5 !== peg$FAILED) {
            s6 = peg$parsebinary_op_wout_and();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseexpr();
              if (s7 !== peg$FAILED) {
                s5 = [s5, s6, s7];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c58(s4);
          }
          s3 = s4;
          if (s3 === peg$FAILED) {
            s3 = peg$currPos;
            s4 = peg$currPos;
            s5 = peg$parsee_value();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseISNULL();
              if (s6 === peg$FAILED) {
                s6 = peg$parseNOTNULL();
                if (s6 === peg$FAILED) {
                  s6 = peg$currPos;
                  s7 = peg$parseNOT();
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parsewhitespace1();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parseNULL();
                      if (s9 !== peg$FAILED) {
                        s7 = [s7, s8, s9];
                        s6 = s7;
                      } else {
                        peg$currPos = s6;
                        s6 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s6;
                      s6 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s6;
                    s6 = peg$FAILED;
                  }
                }
              }
              if (s6 !== peg$FAILED) {
                s5 = [s5, s6];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s3;
              s4 = peg$c59(s4);
            }
            s3 = s4;
            if (s3 === peg$FAILED) {
              s3 = peg$currPos;
              s4 = peg$currPos;
              s5 = peg$parsee_value();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseIS();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseNOT();
                  if (s7 === peg$FAILED) {
                    s7 = null;
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parsee_expr();
                    if (s8 !== peg$FAILED) {
                      s5 = [s5, s6, s7, s8];
                      s4 = s5;
                    } else {
                      peg$currPos = s4;
                      s4 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
              if (s4 !== peg$FAILED) {
                peg$savedPos = s3;
                s4 = peg$c60(s4);
              }
              s3 = s4;
              if (s3 === peg$FAILED) {
                s3 = peg$currPos;
                s4 = peg$currPos;
                s5 = peg$parsee_value();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parseNOT();
                  if (s6 === peg$FAILED) {
                    s6 = null;
                  }
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parseBETWEEN();
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parsee_expr();
                      if (s8 !== peg$FAILED) {
                        s9 = peg$parseAND();
                        if (s9 !== peg$FAILED) {
                          s10 = peg$parsee_expr();
                          if (s10 !== peg$FAILED) {
                            s5 = [s5, s6, s7, s8, s9, s10];
                            s4 = s5;
                          } else {
                            peg$currPos = s4;
                            s4 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s4;
                          s4 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s4;
                        s4 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s4;
                      s4 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
                if (s4 !== peg$FAILED) {
                  peg$savedPos = s3;
                  s4 = peg$c61(s4);
                }
                s3 = s4;
                if (s3 === peg$FAILED) {
                  s3 = peg$parsevalue();
                }
              }
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c62(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseparam_var() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 36) {
        s2 = peg$c63;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c64); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parsename();
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c65(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseparam_expr() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 58) {
        s2 = peg$c66;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c67); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseexpr_and();
        if (s3 !== peg$FAILED) {
          s4 = peg$currPos;
          s5 = peg$parsewhitespace();
          if (s5 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 124) {
              s6 = peg$c68;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c69); }
            }
            if (s6 !== peg$FAILED) {
              s7 = peg$parsewhitespace();
              if (s7 !== peg$FAILED) {
                s8 = peg$parseexpr_and();
                if (s8 !== peg$FAILED) {
                  s5 = [s5, s6, s7, s8];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (s4 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 58) {
              s5 = peg$c66;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c67); }
            }
            if (s5 !== peg$FAILED) {
              s2 = [s2, s3, s4, s5];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c70(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsee_where() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsee_expr();
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$currPos;
          s6 = peg$parsewhitespace();
          if (s6 !== peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c41) {
              s7 = peg$c41;
              peg$currPos += 3;
            } else {
              s7 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c42); }
            }
            if (s7 !== peg$FAILED) {
              s8 = peg$parsee_expr();
              if (s8 !== peg$FAILED) {
                s6 = [s6, s7, s8];
                s5 = s6;
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$currPos;
            s6 = peg$parsewhitespace();
            if (s6 !== peg$FAILED) {
              if (input.substr(peg$currPos, 3) === peg$c41) {
                s7 = peg$c41;
                peg$currPos += 3;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c42); }
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$parsee_expr();
                if (s8 !== peg$FAILED) {
                  s6 = [s6, s7, s8];
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          }
          if (s4 !== peg$FAILED) {
            s2 = [s2, s3, s4];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c43(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsee_value() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsee_call_function();
        if (s3 === peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$parseliteral_value();
          if (s4 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c71(s4);
          }
          s3 = s4;
          if (s3 === peg$FAILED) {
            s3 = peg$currPos;
            s4 = peg$currPos;
            s5 = peg$parsetable_name();
            if (s5 !== peg$FAILED) {
              s6 = peg$parsedot();
              if (s6 !== peg$FAILED) {
                s7 = peg$parsename();
                if (s7 !== peg$FAILED) {
                  s5 = [s5, s6, s7];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s3;
              s4 = peg$c45(s4);
            }
            s3 = s4;
            if (s3 === peg$FAILED) {
              s3 = peg$currPos;
              s4 = peg$parsename();
              if (s4 !== peg$FAILED) {
                peg$savedPos = s3;
                s4 = peg$c72(s4);
              }
              s3 = s4;
              if (s3 === peg$FAILED) {
                s3 = peg$currPos;
                s4 = peg$parseparam_expr();
                if (s4 !== peg$FAILED) {
                  peg$savedPos = s3;
                  s4 = peg$c47(s4);
                }
                s3 = s4;
                if (s3 === peg$FAILED) {
                  s3 = peg$currPos;
                  s4 = peg$parseparam_var();
                  if (s4 !== peg$FAILED) {
                    peg$savedPos = s3;
                    s4 = peg$c73(s4);
                  }
                  s3 = s4;
                  if (s3 === peg$FAILED) {
                    s3 = peg$currPos;
                    s4 = peg$currPos;
                    s5 = peg$parselparen();
                    if (s5 !== peg$FAILED) {
                      s6 = peg$parsee_where();
                      if (s6 !== peg$FAILED) {
                        s7 = peg$parsewhitespace();
                        if (s7 !== peg$FAILED) {
                          s8 = peg$parserparen();
                          if (s8 !== peg$FAILED) {
                            s5 = [s5, s6, s7, s8];
                            s4 = s5;
                          } else {
                            peg$currPos = s4;
                            s4 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s4;
                          s4 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s4;
                        s4 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s4;
                      s4 = peg$FAILED;
                    }
                    if (s4 !== peg$FAILED) {
                      peg$savedPos = s3;
                      s4 = peg$c74(s4);
                    }
                    s3 = s4;
                  }
                }
              }
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c52(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsee_expr() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace();
      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;
        s4 = peg$currPos;
        s5 = peg$parsee_value();
        if (s5 !== peg$FAILED) {
          s6 = peg$parsebinary_op_wout_and();
          if (s6 !== peg$FAILED) {
            s7 = peg$parsee_expr();
            if (s7 !== peg$FAILED) {
              s5 = [s5, s6, s7];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          peg$savedPos = s3;
          s4 = peg$c58(s4);
        }
        s3 = s4;
        if (s3 === peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$currPos;
          s5 = peg$parsee_value();
          if (s5 !== peg$FAILED) {
            s6 = peg$parseISNULL();
            if (s6 === peg$FAILED) {
              s6 = peg$parseNOTNULL();
              if (s6 === peg$FAILED) {
                s6 = peg$currPos;
                s7 = peg$parseNOT();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parsewhitespace1();
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parseNULL();
                    if (s9 !== peg$FAILED) {
                      s7 = [s7, s8, s9];
                      s6 = s7;
                    } else {
                      peg$currPos = s6;
                      s6 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s6;
                    s6 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              }
            }
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c59(s4);
          }
          s3 = s4;
          if (s3 === peg$FAILED) {
            s3 = peg$currPos;
            s4 = peg$currPos;
            s5 = peg$parsee_value();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseIS();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseNOT();
                if (s7 === peg$FAILED) {
                  s7 = null;
                }
                if (s7 !== peg$FAILED) {
                  s8 = peg$parsee_expr();
                  if (s8 !== peg$FAILED) {
                    s5 = [s5, s6, s7, s8];
                    s4 = s5;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s3;
              s4 = peg$c60(s4);
            }
            s3 = s4;
            if (s3 === peg$FAILED) {
              s3 = peg$currPos;
              s4 = peg$currPos;
              if (input.substr(peg$currPos, 6) === peg$c75) {
                s5 = peg$c75;
                peg$currPos += 6;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c76); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parsewhitespace1();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parsename();
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parseIN();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parsewhitespace1();
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parsee_table_ref();
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parsewhitespace1();
                          if (s11 !== peg$FAILED) {
                            s12 = peg$parsee_where();
                            if (s12 !== peg$FAILED) {
                              s5 = [s5, s6, s7, s8, s9, s10, s11, s12];
                              s4 = s5;
                            } else {
                              peg$currPos = s4;
                              s4 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s4;
                            s4 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s4;
                          s4 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s4;
                        s4 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s4;
                      s4 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
              if (s4 !== peg$FAILED) {
                peg$savedPos = s3;
                s4 = peg$c77(s4);
              }
              s3 = s4;
              if (s3 === peg$FAILED) {
                s3 = peg$currPos;
                s4 = peg$currPos;
                if (input.substr(peg$currPos, 6) === peg$c78) {
                  s5 = peg$c78;
                  peg$currPos += 6;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c79); }
                }
                if (s5 !== peg$FAILED) {
                  s6 = peg$parsewhitespace1();
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parsename();
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parseIN();
                      if (s8 !== peg$FAILED) {
                        s9 = peg$parsewhitespace1();
                        if (s9 !== peg$FAILED) {
                          s10 = peg$parsee_table_ref();
                          if (s10 !== peg$FAILED) {
                            s11 = peg$parsewhitespace1();
                            if (s11 !== peg$FAILED) {
                              s12 = peg$parsee_where();
                              if (s12 !== peg$FAILED) {
                                s5 = [s5, s6, s7, s8, s9, s10, s11, s12];
                                s4 = s5;
                              } else {
                                peg$currPos = s4;
                                s4 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s4;
                              s4 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s4;
                            s4 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s4;
                          s4 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s4;
                        s4 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s4;
                      s4 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
                if (s4 !== peg$FAILED) {
                  peg$savedPos = s3;
                  s4 = peg$c80(s4);
                }
                s3 = s4;
                if (s3 === peg$FAILED) {
                  s3 = peg$currPos;
                  s4 = peg$currPos;
                  s5 = peg$parsee_value();
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parseNOT();
                    if (s6 === peg$FAILED) {
                      s6 = null;
                    }
                    if (s6 !== peg$FAILED) {
                      s7 = peg$parseBETWEEN();
                      if (s7 !== peg$FAILED) {
                        s8 = peg$parsee_expr();
                        if (s8 !== peg$FAILED) {
                          s9 = peg$parseAND();
                          if (s9 !== peg$FAILED) {
                            s10 = peg$parsee_expr();
                            if (s10 !== peg$FAILED) {
                              s5 = [s5, s6, s7, s8, s9, s10];
                              s4 = s5;
                            } else {
                              peg$currPos = s4;
                              s4 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s4;
                            s4 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s4;
                          s4 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s4;
                        s4 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s4;
                      s4 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                  if (s4 !== peg$FAILED) {
                    peg$savedPos = s3;
                    s4 = peg$c61(s4);
                  }
                  s3 = s4;
                  if (s3 === peg$FAILED) {
                    s3 = peg$currPos;
                    s4 = peg$parsee_value();
                    if (s4 !== peg$FAILED) {
                      peg$savedPos = s3;
                      s4 = peg$c1(s4);
                    }
                    s3 = s4;
                  }
                }
              }
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c62(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsee_call_function() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsename();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsewhitespace();
        if (s3 !== peg$FAILED) {
          s4 = peg$parselparen();
          if (s4 !== peg$FAILED) {
            s5 = peg$currPos;
            s6 = peg$currPos;
            s7 = peg$parseDISTINCT();
            if (s7 === peg$FAILED) {
              s7 = null;
            }
            if (s7 !== peg$FAILED) {
              s8 = peg$currPos;
              s9 = peg$parsee_expr();
              if (s9 !== peg$FAILED) {
                s10 = [];
                s11 = peg$currPos;
                s12 = peg$parsewhitespace();
                if (s12 !== peg$FAILED) {
                  s13 = peg$parsecomma();
                  if (s13 !== peg$FAILED) {
                    s14 = peg$parsee_expr();
                    if (s14 !== peg$FAILED) {
                      s12 = [s12, s13, s14];
                      s11 = s12;
                    } else {
                      peg$currPos = s11;
                      s11 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s11;
                    s11 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s11;
                  s11 = peg$FAILED;
                }
                while (s11 !== peg$FAILED) {
                  s10.push(s11);
                  s11 = peg$currPos;
                  s12 = peg$parsewhitespace();
                  if (s12 !== peg$FAILED) {
                    s13 = peg$parsecomma();
                    if (s13 !== peg$FAILED) {
                      s14 = peg$parsee_expr();
                      if (s14 !== peg$FAILED) {
                        s12 = [s12, s13, s14];
                        s11 = s12;
                      } else {
                        peg$currPos = s11;
                        s11 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s11;
                      s11 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s11;
                    s11 = peg$FAILED;
                  }
                }
                if (s10 !== peg$FAILED) {
                  s9 = [s9, s10];
                  s8 = s9;
                } else {
                  peg$currPos = s8;
                  s8 = peg$FAILED;
                }
              } else {
                peg$currPos = s8;
                s8 = peg$FAILED;
              }
              if (s8 !== peg$FAILED) {
                s7 = [s7, s8];
                s6 = s7;
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
            if (s6 !== peg$FAILED) {
              peg$savedPos = s5;
              s6 = peg$c81(s6);
            }
            s5 = s6;
            if (s5 === peg$FAILED) {
              s5 = peg$currPos;
              s6 = peg$parsewhitespace();
              if (s6 !== peg$FAILED) {
                s7 = peg$parsestar();
                if (s7 !== peg$FAILED) {
                  peg$savedPos = s5;
                  s6 = peg$c82();
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            }
            if (s5 === peg$FAILED) {
              s5 = null;
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parsewhitespace();
              if (s6 !== peg$FAILED) {
                s7 = peg$parserparen();
                if (s7 !== peg$FAILED) {
                  s2 = [s2, s3, s4, s5, s6, s7];
                  s1 = s2;
                } else {
                  peg$currPos = s1;
                  s1 = peg$FAILED;
                }
              } else {
                peg$currPos = s1;
                s1 = peg$FAILED;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c83(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsee_column_ref() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsetable_name();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsedot();
        if (s3 !== peg$FAILED) {
          s4 = peg$parsename();
          if (s4 !== peg$FAILED) {
            s2 = [s2, s3, s4];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c84(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsee_table_ref() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parsetable_name();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c85(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsetype_name() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsename();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsename();
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parselparen();
        if (s3 !== peg$FAILED) {
          s4 = peg$parsesigned_number();
          if (s4 !== peg$FAILED) {
            s5 = peg$parserparen();
            if (s5 !== peg$FAILED) {
              s3 = [s3, s4, s5];
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 === peg$FAILED) {
          s2 = peg$currPos;
          s3 = peg$parselparen();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsesigned_number();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsecomma();
              if (s5 !== peg$FAILED) {
                s6 = peg$parsesigned_number();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parserparen();
                  if (s7 !== peg$FAILED) {
                    s3 = [s3, s4, s5, s6, s7];
                    s2 = s3;
                  } else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s2;
                  s2 = peg$FAILED;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        }
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsesigned_number() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parseplus();
      if (s1 === peg$FAILED) {
        s1 = peg$parseminus();
      }
      if (s1 === peg$FAILED) {
        s1 = null;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsenumeric_literal();
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseliteral_value() {
      var s0;

      s0 = peg$parsenumeric_literal();
      if (s0 === peg$FAILED) {
        s0 = peg$parsestring_literal();
        if (s0 === peg$FAILED) {
          s0 = peg$parsestring_literal();
          if (s0 === peg$FAILED) {
            s0 = peg$parseNULL();
            if (s0 === peg$FAILED) {
              s0 = peg$parseCURRENT_TIME();
              if (s0 === peg$FAILED) {
                s0 = peg$parseCURRENT_DATE();
                if (s0 === peg$FAILED) {
                  s0 = peg$parseCURRENT_TIMESTAMP();
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsenumeric_literal() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parseplus();
      if (s2 === peg$FAILED) {
        s2 = peg$parseminus();
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;
        s4 = [];
        s5 = peg$parsedigit();
        if (s5 !== peg$FAILED) {
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$parsedigit();
          }
        } else {
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$currPos;
          s6 = peg$parsedot();
          if (s6 !== peg$FAILED) {
            s7 = [];
            s8 = peg$parsedigit();
            if (s8 !== peg$FAILED) {
              while (s8 !== peg$FAILED) {
                s7.push(s8);
                s8 = peg$parsedigit();
              }
            } else {
              s7 = peg$FAILED;
            }
            if (s7 !== peg$FAILED) {
              s6 = [s6, s7];
              s5 = s6;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          if (s5 === peg$FAILED) {
            s5 = null;
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$parsedot();
          if (s4 !== peg$FAILED) {
            s5 = [];
            s6 = peg$parsedigit();
            if (s6 !== peg$FAILED) {
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$parsedigit();
              }
            } else {
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$currPos;
          s5 = peg$parseE();
          if (s5 !== peg$FAILED) {
            s6 = peg$parseplus();
            if (s6 === peg$FAILED) {
              s6 = peg$parseminus();
            }
            if (s6 === peg$FAILED) {
              s6 = null;
            }
            if (s6 !== peg$FAILED) {
              s7 = [];
              s8 = peg$parsedigit();
              if (s8 !== peg$FAILED) {
                while (s8 !== peg$FAILED) {
                  s7.push(s8);
                  s8 = peg$parsedigit();
                }
              } else {
                s7 = peg$FAILED;
              }
              if (s7 !== peg$FAILED) {
                s5 = [s5, s6, s7];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (s4 !== peg$FAILED) {
            s2 = [s2, s3, s4];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c86(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsecall_function() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsename();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsewhitespace();
        if (s3 !== peg$FAILED) {
          s4 = peg$parselparen();
          if (s4 !== peg$FAILED) {
            s5 = peg$currPos;
            s6 = peg$parsewhitespace();
            if (s6 !== peg$FAILED) {
              s7 = peg$currPos;
              s8 = peg$parsetable_name();
              if (s8 !== peg$FAILED) {
                s9 = peg$parsedot();
                if (s9 !== peg$FAILED) {
                  s8 = [s8, s9];
                  s7 = s8;
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
              if (s7 === peg$FAILED) {
                s7 = null;
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$parsestar();
                if (s8 !== peg$FAILED) {
                  peg$savedPos = s5;
                  s6 = peg$c87(s7);
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 === peg$FAILED) {
              s5 = peg$currPos;
              s6 = peg$currPos;
              s7 = peg$parseDISTINCT();
              if (s7 === peg$FAILED) {
                s7 = null;
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$currPos;
                s9 = peg$parseexpr();
                if (s9 !== peg$FAILED) {
                  s10 = [];
                  s11 = peg$currPos;
                  s12 = peg$parsewhitespace();
                  if (s12 !== peg$FAILED) {
                    s13 = peg$parsecomma();
                    if (s13 !== peg$FAILED) {
                      s14 = peg$parseexpr();
                      if (s14 !== peg$FAILED) {
                        s12 = [s12, s13, s14];
                        s11 = s12;
                      } else {
                        peg$currPos = s11;
                        s11 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s11;
                      s11 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s11;
                    s11 = peg$FAILED;
                  }
                  while (s11 !== peg$FAILED) {
                    s10.push(s11);
                    s11 = peg$currPos;
                    s12 = peg$parsewhitespace();
                    if (s12 !== peg$FAILED) {
                      s13 = peg$parsecomma();
                      if (s13 !== peg$FAILED) {
                        s14 = peg$parseexpr();
                        if (s14 !== peg$FAILED) {
                          s12 = [s12, s13, s14];
                          s11 = s12;
                        } else {
                          peg$currPos = s11;
                          s11 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s11;
                        s11 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s11;
                      s11 = peg$FAILED;
                    }
                  }
                  if (s10 !== peg$FAILED) {
                    s9 = [s9, s10];
                    s8 = s9;
                  } else {
                    peg$currPos = s8;
                    s8 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s8;
                  s8 = peg$FAILED;
                }
                if (s8 !== peg$FAILED) {
                  s7 = [s7, s8];
                  s6 = s7;
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
              if (s6 !== peg$FAILED) {
                peg$savedPos = s5;
                s6 = peg$c88(s6);
              }
              s5 = s6;
            }
            if (s5 === peg$FAILED) {
              s5 = null;
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parsewhitespace();
              if (s6 !== peg$FAILED) {
                s7 = peg$parserparen();
                if (s7 !== peg$FAILED) {
                  s2 = [s2, s3, s4, s5, s6, s7];
                  s1 = s2;
                } else {
                  peg$currPos = s1;
                  s1 = peg$FAILED;
                }
              } else {
                peg$currPos = s1;
                s1 = peg$FAILED;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c89(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsecolumn_ref() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$currPos;
      s3 = peg$parsetable_name();
      if (s3 !== peg$FAILED) {
        s4 = peg$parsedot();
        if (s4 !== peg$FAILED) {
          s3 = [s3, s4];
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parsename();
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c90(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsegrouping_term() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseexpr();
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c91(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseordering_term() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace();
      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;
        s4 = peg$parseexpr();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseASC();
          if (s5 === peg$FAILED) {
            s5 = peg$parseDESC();
          }
          if (s5 === peg$FAILED) {
            s5 = null;
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c92(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsecompound_operator() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parseUNION();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseALL();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 === peg$FAILED) {
        s1 = peg$parseINTERSECT();
        if (s1 === peg$FAILED) {
          s1 = peg$parseEXCEPT();
        }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c93(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseunary_operator() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace();
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 45) {
          s3 = peg$c94;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c95); }
        }
        if (s3 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 43) {
            s3 = peg$c96;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c97); }
          }
          if (s3 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 126) {
              s3 = peg$c98;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c99); }
            }
            if (s3 === peg$FAILED) {
              if (input.substr(peg$currPos, 3) === peg$c100) {
                s3 = peg$c100;
                peg$currPos += 3;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c101); }
              }
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c102(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsebinary_op_wout_and() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace();
      if (s2 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c103) {
          s3 = peg$c103;
          peg$currPos += 2;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c104); }
        }
        if (s3 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 42) {
            s3 = peg$c105;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c106); }
          }
          if (s3 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 47) {
              s3 = peg$c107;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c108); }
            }
            if (s3 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 37) {
                s3 = peg$c109;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c110); }
              }
              if (s3 === peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 43) {
                  s3 = peg$c96;
                  peg$currPos++;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c97); }
                }
                if (s3 === peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 45) {
                    s3 = peg$c94;
                    peg$currPos++;
                  } else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c95); }
                  }
                  if (s3 === peg$FAILED) {
                    if (input.substr(peg$currPos, 2) === peg$c111) {
                      s3 = peg$c111;
                      peg$currPos += 2;
                    } else {
                      s3 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c112); }
                    }
                    if (s3 === peg$FAILED) {
                      if (input.substr(peg$currPos, 2) === peg$c113) {
                        s3 = peg$c113;
                        peg$currPos += 2;
                      } else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c114); }
                      }
                      if (s3 === peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 38) {
                          s3 = peg$c115;
                          peg$currPos++;
                        } else {
                          s3 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c116); }
                        }
                        if (s3 === peg$FAILED) {
                          if (input.substr(peg$currPos, 2) === peg$c117) {
                            s3 = peg$c117;
                            peg$currPos += 2;
                          } else {
                            s3 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c118); }
                          }
                          if (s3 === peg$FAILED) {
                            if (input.substr(peg$currPos, 2) === peg$c119) {
                              s3 = peg$c119;
                              peg$currPos += 2;
                            } else {
                              s3 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c120); }
                            }
                            if (s3 === peg$FAILED) {
                              if (input.charCodeAt(peg$currPos) === 60) {
                                s3 = peg$c121;
                                peg$currPos++;
                              } else {
                                s3 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c122); }
                              }
                              if (s3 === peg$FAILED) {
                                if (input.charCodeAt(peg$currPos) === 62) {
                                  s3 = peg$c123;
                                  peg$currPos++;
                                } else {
                                  s3 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c124); }
                                }
                                if (s3 === peg$FAILED) {
                                  if (input.charCodeAt(peg$currPos) === 61) {
                                    s3 = peg$c125;
                                    peg$currPos++;
                                  } else {
                                    s3 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c126); }
                                  }
                                  if (s3 === peg$FAILED) {
                                    if (input.substr(peg$currPos, 2) === peg$c127) {
                                      s3 = peg$c127;
                                      peg$currPos += 2;
                                    } else {
                                      s3 = peg$FAILED;
                                      if (peg$silentFails === 0) { peg$fail(peg$c128); }
                                    }
                                    if (s3 === peg$FAILED) {
                                      if (input.substr(peg$currPos, 2) === peg$c129) {
                                        s3 = peg$c129;
                                        peg$currPos += 2;
                                      } else {
                                        s3 = peg$FAILED;
                                        if (peg$silentFails === 0) { peg$fail(peg$c130); }
                                      }
                                      if (s3 === peg$FAILED) {
                                        if (input.substr(peg$currPos, 2) === peg$c131) {
                                          s3 = peg$c131;
                                          peg$currPos += 2;
                                        } else {
                                          s3 = peg$FAILED;
                                          if (peg$silentFails === 0) { peg$fail(peg$c132); }
                                        }
                                        if (s3 === peg$FAILED) {
                                          if (input.substr(peg$currPos, 2) === peg$c133) {
                                            s3 = peg$c133;
                                            peg$currPos += 2;
                                          } else {
                                            s3 = peg$FAILED;
                                            if (peg$silentFails === 0) { peg$fail(peg$c134); }
                                          }
                                          if (s3 === peg$FAILED) {
                                            if (input.substr(peg$currPos, 6) === peg$c135) {
                                              s3 = peg$c135;
                                              peg$currPos += 6;
                                            } else {
                                              s3 = peg$FAILED;
                                              if (peg$silentFails === 0) { peg$fail(peg$c136); }
                                            }
                                            if (s3 === peg$FAILED) {
                                              if (input.substr(peg$currPos, 2) === peg$c137) {
                                                s3 = peg$c137;
                                                peg$currPos += 2;
                                              } else {
                                                s3 = peg$FAILED;
                                                if (peg$silentFails === 0) { peg$fail(peg$c138); }
                                              }
                                              if (s3 === peg$FAILED) {
                                                if (input.substr(peg$currPos, 6) === peg$c139) {
                                                  s3 = peg$c139;
                                                  peg$currPos += 6;
                                                } else {
                                                  s3 = peg$FAILED;
                                                  if (peg$silentFails === 0) { peg$fail(peg$c140); }
                                                }
                                                if (s3 === peg$FAILED) {
                                                  if (input.substr(peg$currPos, 4) === peg$c141) {
                                                    s3 = peg$c141;
                                                    peg$currPos += 4;
                                                  } else {
                                                    s3 = peg$FAILED;
                                                    if (peg$silentFails === 0) { peg$fail(peg$c142); }
                                                  }
                                                  if (s3 === peg$FAILED) {
                                                    if (input.substr(peg$currPos, 4) === peg$c143) {
                                                      s3 = peg$c143;
                                                      peg$currPos += 4;
                                                    } else {
                                                      s3 = peg$FAILED;
                                                      if (peg$silentFails === 0) { peg$fail(peg$c144); }
                                                    }
                                                    if (s3 === peg$FAILED) {
                                                      if (input.substr(peg$currPos, 5) === peg$c145) {
                                                        s3 = peg$c145;
                                                        peg$currPos += 5;
                                                      } else {
                                                        s3 = peg$FAILED;
                                                        if (peg$silentFails === 0) { peg$fail(peg$c146); }
                                                      }
                                                      if (s3 === peg$FAILED) {
                                                        if (input.substr(peg$currPos, 6) === peg$c147) {
                                                          s3 = peg$c147;
                                                          peg$currPos += 6;
                                                        } else {
                                                          s3 = peg$FAILED;
                                                          if (peg$silentFails === 0) { peg$fail(peg$c148); }
                                                        }
                                                        if (s3 === peg$FAILED) {
                                                          if (input.substr(peg$currPos, 2) === peg$c149) {
                                                            s3 = peg$c149;
                                                            peg$currPos += 2;
                                                          } else {
                                                            s3 = peg$FAILED;
                                                            if (peg$silentFails === 0) { peg$fail(peg$c150); }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c102(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsebinary_operator() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsewhitespace();
      if (s2 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c103) {
          s3 = peg$c103;
          peg$currPos += 2;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c104); }
        }
        if (s3 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 42) {
            s3 = peg$c105;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c106); }
          }
          if (s3 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 47) {
              s3 = peg$c107;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c108); }
            }
            if (s3 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 37) {
                s3 = peg$c109;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c110); }
              }
              if (s3 === peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 43) {
                  s3 = peg$c96;
                  peg$currPos++;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c97); }
                }
                if (s3 === peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 45) {
                    s3 = peg$c94;
                    peg$currPos++;
                  } else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c95); }
                  }
                  if (s3 === peg$FAILED) {
                    if (input.substr(peg$currPos, 2) === peg$c111) {
                      s3 = peg$c111;
                      peg$currPos += 2;
                    } else {
                      s3 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c112); }
                    }
                    if (s3 === peg$FAILED) {
                      if (input.substr(peg$currPos, 2) === peg$c113) {
                        s3 = peg$c113;
                        peg$currPos += 2;
                      } else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c114); }
                      }
                      if (s3 === peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 38) {
                          s3 = peg$c115;
                          peg$currPos++;
                        } else {
                          s3 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c116); }
                        }
                        if (s3 === peg$FAILED) {
                          if (input.charCodeAt(peg$currPos) === 124) {
                            s3 = peg$c68;
                            peg$currPos++;
                          } else {
                            s3 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c69); }
                          }
                          if (s3 === peg$FAILED) {
                            if (input.substr(peg$currPos, 2) === peg$c117) {
                              s3 = peg$c117;
                              peg$currPos += 2;
                            } else {
                              s3 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c118); }
                            }
                            if (s3 === peg$FAILED) {
                              if (input.substr(peg$currPos, 2) === peg$c119) {
                                s3 = peg$c119;
                                peg$currPos += 2;
                              } else {
                                s3 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c120); }
                              }
                              if (s3 === peg$FAILED) {
                                if (input.charCodeAt(peg$currPos) === 60) {
                                  s3 = peg$c121;
                                  peg$currPos++;
                                } else {
                                  s3 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c122); }
                                }
                                if (s3 === peg$FAILED) {
                                  if (input.charCodeAt(peg$currPos) === 62) {
                                    s3 = peg$c123;
                                    peg$currPos++;
                                  } else {
                                    s3 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c124); }
                                  }
                                  if (s3 === peg$FAILED) {
                                    if (input.charCodeAt(peg$currPos) === 61) {
                                      s3 = peg$c125;
                                      peg$currPos++;
                                    } else {
                                      s3 = peg$FAILED;
                                      if (peg$silentFails === 0) { peg$fail(peg$c126); }
                                    }
                                    if (s3 === peg$FAILED) {
                                      if (input.substr(peg$currPos, 2) === peg$c127) {
                                        s3 = peg$c127;
                                        peg$currPos += 2;
                                      } else {
                                        s3 = peg$FAILED;
                                        if (peg$silentFails === 0) { peg$fail(peg$c128); }
                                      }
                                      if (s3 === peg$FAILED) {
                                        if (input.substr(peg$currPos, 2) === peg$c129) {
                                          s3 = peg$c129;
                                          peg$currPos += 2;
                                        } else {
                                          s3 = peg$FAILED;
                                          if (peg$silentFails === 0) { peg$fail(peg$c130); }
                                        }
                                        if (s3 === peg$FAILED) {
                                          if (input.substr(peg$currPos, 2) === peg$c131) {
                                            s3 = peg$c131;
                                            peg$currPos += 2;
                                          } else {
                                            s3 = peg$FAILED;
                                            if (peg$silentFails === 0) { peg$fail(peg$c132); }
                                          }
                                          if (s3 === peg$FAILED) {
                                            if (input.substr(peg$currPos, 2) === peg$c133) {
                                              s3 = peg$c133;
                                              peg$currPos += 2;
                                            } else {
                                              s3 = peg$FAILED;
                                              if (peg$silentFails === 0) { peg$fail(peg$c134); }
                                            }
                                            if (s3 === peg$FAILED) {
                                              if (input.substr(peg$currPos, 6) === peg$c135) {
                                                s3 = peg$c135;
                                                peg$currPos += 6;
                                              } else {
                                                s3 = peg$FAILED;
                                                if (peg$silentFails === 0) { peg$fail(peg$c136); }
                                              }
                                              if (s3 === peg$FAILED) {
                                                if (input.substr(peg$currPos, 2) === peg$c137) {
                                                  s3 = peg$c137;
                                                  peg$currPos += 2;
                                                } else {
                                                  s3 = peg$FAILED;
                                                  if (peg$silentFails === 0) { peg$fail(peg$c138); }
                                                }
                                                if (s3 === peg$FAILED) {
                                                  if (input.substr(peg$currPos, 6) === peg$c139) {
                                                    s3 = peg$c139;
                                                    peg$currPos += 6;
                                                  } else {
                                                    s3 = peg$FAILED;
                                                    if (peg$silentFails === 0) { peg$fail(peg$c140); }
                                                  }
                                                  if (s3 === peg$FAILED) {
                                                    if (input.substr(peg$currPos, 4) === peg$c141) {
                                                      s3 = peg$c141;
                                                      peg$currPos += 4;
                                                    } else {
                                                      s3 = peg$FAILED;
                                                      if (peg$silentFails === 0) { peg$fail(peg$c142); }
                                                    }
                                                    if (s3 === peg$FAILED) {
                                                      if (input.substr(peg$currPos, 4) === peg$c143) {
                                                        s3 = peg$c143;
                                                        peg$currPos += 4;
                                                      } else {
                                                        s3 = peg$FAILED;
                                                        if (peg$silentFails === 0) { peg$fail(peg$c144); }
                                                      }
                                                      if (s3 === peg$FAILED) {
                                                        if (input.substr(peg$currPos, 5) === peg$c145) {
                                                          s3 = peg$c145;
                                                          peg$currPos += 5;
                                                        } else {
                                                          s3 = peg$FAILED;
                                                          if (peg$silentFails === 0) { peg$fail(peg$c146); }
                                                        }
                                                        if (s3 === peg$FAILED) {
                                                          if (input.substr(peg$currPos, 6) === peg$c147) {
                                                            s3 = peg$c147;
                                                            peg$currPos += 6;
                                                          } else {
                                                            s3 = peg$FAILED;
                                                            if (peg$silentFails === 0) { peg$fail(peg$c148); }
                                                          }
                                                          if (s3 === peg$FAILED) {
                                                            if (input.substr(peg$currPos, 3) === peg$c41) {
                                                              s3 = peg$c41;
                                                              peg$currPos += 3;
                                                            } else {
                                                              s3 = peg$FAILED;
                                                              if (peg$silentFails === 0) { peg$fail(peg$c42); }
                                                            }
                                                            if (s3 === peg$FAILED) {
                                                              if (input.substr(peg$currPos, 2) === peg$c149) {
                                                                s3 = peg$c149;
                                                                peg$currPos += 2;
                                                              } else {
                                                                s3 = peg$FAILED;
                                                                if (peg$silentFails === 0) { peg$fail(peg$c150); }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c102(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsename() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c151.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c152); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c151.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c152); }
          }
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c153(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsetype() {
      var s0;

      if (input.substr(peg$currPos, 3) === peg$c154) {
        s0 = peg$c154;
        peg$currPos += 3;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c155); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 7) === peg$c156) {
          s0 = peg$c156;
          peg$currPos += 7;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c157); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c158) {
            s0 = peg$c158;
            peg$currPos += 5;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c159); }
          }
          if (s0 === peg$FAILED) {
            if (input.substr(peg$currPos, 4) === peg$c160) {
              s0 = peg$c160;
              peg$currPos += 4;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c161); }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 7) === peg$c162) {
                s0 = peg$c162;
                peg$currPos += 7;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c163); }
              }
              if (s0 === peg$FAILED) {
                if (input.substr(peg$currPos, 4) === peg$c164) {
                  s0 = peg$c164;
                  peg$currPos += 4;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c165); }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsetable_name() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parsename();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c166(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsedigit() {
      var s0;

      if (peg$c167.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c168); }
      }

      return s0;
    }

    function peg$parseequal() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 61) {
        s0 = peg$c125;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c126); }
      }

      return s0;
    }

    function peg$parsedot() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 46) {
        s0 = peg$c169;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c170); }
      }

      return s0;
    }

    function peg$parsecomma() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 44) {
        s0 = peg$c171;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c172); }
      }

      return s0;
    }

    function peg$parsesemicolon() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 59) {
        s0 = peg$c173;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c174); }
      }

      return s0;
    }

    function peg$parseminusminus() {
      var s0;

      if (input.substr(peg$currPos, 2) === peg$c175) {
        s0 = peg$c175;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c176); }
      }

      return s0;
    }

    function peg$parseminus() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 45) {
        s0 = peg$c94;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c95); }
      }

      return s0;
    }

    function peg$parseplus() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 43) {
        s0 = peg$c96;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c97); }
      }

      return s0;
    }

    function peg$parselparen() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 40) {
        s0 = peg$c177;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c178); }
      }

      return s0;
    }

    function peg$parserparen() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 41) {
        s0 = peg$c179;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c180); }
      }

      return s0;
    }

    function peg$parsestar() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 42) {
        s0 = peg$c105;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c106); }
      }

      return s0;
    }

    function peg$parsenewline() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 10) {
        s0 = peg$c181;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c182); }
      }

      return s0;
    }

    function peg$parseanything_except_newline() {
      var s0, s1;

      s0 = [];
      if (peg$c183.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c184); }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (peg$c183.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c184); }
        }
      }

      return s0;
    }

    function peg$parsecomment_beg() {
      var s0;

      if (input.substr(peg$currPos, 2) === peg$c185) {
        s0 = peg$c185;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c186); }
      }

      return s0;
    }

    function peg$parsecomment_end() {
      var s0;

      if (input.substr(peg$currPos, 2) === peg$c187) {
        s0 = peg$c187;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c188); }
      }

      return s0;
    }

    function peg$parseanything_except_comment_end() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = [];
      if (input.length > peg$currPos) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c189); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c189); }
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        if (input.substr(peg$currPos, 2) === peg$c187) {
          s3 = peg$c187;
          peg$currPos += 2;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c188); }
        }
        peg$silentFails--;
        if (s3 !== peg$FAILED) {
          peg$currPos = s2;
          s2 = void 0;
        } else {
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsestring_literal() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s2 = peg$c190;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c191); }
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        s4 = peg$parseescape_char();
        if (s4 === peg$FAILED) {
          if (peg$c192.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c193); }
          }
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$parseescape_char();
          if (s4 === peg$FAILED) {
            if (peg$c192.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c193); }
            }
          }
        }
        if (s3 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s4 = peg$c190;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c191); }
          }
          if (s4 !== peg$FAILED) {
            s2 = [s2, s3, s4];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c194(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseescape_char() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s1 = peg$c195;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c196); }
      }
      if (s1 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c189); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsenil() {
      var s0;

      s0 = peg$c197;

      return s0;
    }

    function peg$parseCURRENT_TIME() {
      var s0;

      if (input.substr(peg$currPos, 3) === peg$c198) {
        s0 = peg$c198;
        peg$currPos += 3;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c199); }
      }

      return s0;
    }

    function peg$parseCURRENT_DATE() {
      var s0;

      if (input.substr(peg$currPos, 3) === peg$c198) {
        s0 = peg$c198;
        peg$currPos += 3;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c199); }
      }

      return s0;
    }

    function peg$parseCURRENT_TIMESTAMP() {
      var s0;

      if (input.substr(peg$currPos, 3) === peg$c198) {
        s0 = peg$c198;
        peg$currPos += 3;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c199); }
      }

      return s0;
    }

    function peg$parsewhitespace() {
      var s0, s1;

      s0 = [];
      if (peg$c200.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c201); }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (peg$c200.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c201); }
        }
      }

      return s0;
    }

    function peg$parsewhitespace1() {
      var s0, s1;

      s0 = [];
      if (peg$c200.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c201); }
      }
      if (s1 !== peg$FAILED) {
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          if (peg$c200.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c201); }
          }
        }
      } else {
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseADD() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c202) {
          s2 = peg$c202;
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c203); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseALL() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c204) {
          s2 = peg$c204;
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c205); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseALTER() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c206) {
          s2 = peg$c206;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c207); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseAND() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c41) {
          s2 = peg$c41;
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c42); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseAS() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c208) {
          s2 = peg$c208;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c209); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseASC() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c210) {
          s2 = peg$c210;
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c211); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseBETWEEN() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 7) === peg$c212) {
          s2 = peg$c212;
          peg$currPos += 7;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c213); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseBY() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c214) {
          s2 = peg$c214;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c215); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseCAST() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c216) {
          s2 = peg$c216;
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c217); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseCOLUMN() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c218) {
          s2 = peg$c218;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c219); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseDESC() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c220) {
          s2 = peg$c220;
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c221); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseDISTINCT() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 8) === peg$c222) {
          s2 = peg$c222;
          peg$currPos += 8;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c223); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseE() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 69) {
        s0 = peg$c224;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c225); }
      }

      return s0;
    }

    function peg$parseESCAPE() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c226) {
          s2 = peg$c226;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c227); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseEXCEPT() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c228) {
          s2 = peg$c228;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c229); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseEXISTS() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c75) {
          s2 = peg$c75;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c76); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseEXPLAIN() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 7) === peg$c230) {
          s2 = peg$c230;
          peg$currPos += 7;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c231); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseEVENT() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c232) {
          s2 = peg$c232;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c233); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseFORALL() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c78) {
          s2 = peg$c78;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c79); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseFROM() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c234) {
          s2 = peg$c234;
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c235); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseGLOB() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c143) {
          s2 = peg$c143;
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c144); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseGROUP() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c236) {
          s2 = peg$c236;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c237); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseHAVING() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c238) {
          s2 = peg$c238;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c239); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseIN() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c137) {
          s2 = peg$c137;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c138); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseINNER() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c240) {
          s2 = peg$c240;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c241); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseINSERT() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c242) {
          s2 = peg$c242;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c243); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseINTERSECT() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 9) === peg$c244) {
          s2 = peg$c244;
          peg$currPos += 9;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c245); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseINTO() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c246) {
          s2 = peg$c246;
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c247); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseIS() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c133) {
          s2 = peg$c133;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c134); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseISNULL() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c248) {
          s2 = peg$c248;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c249); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseJOIN() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c250) {
          s2 = peg$c250;
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c251); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseKEY() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c252) {
          s2 = peg$c252;
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c253); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseLEFT() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c254) {
          s2 = peg$c254;
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c255); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseLIKE() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c141) {
          s2 = peg$c141;
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c142); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseLIMIT() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c256) {
          s2 = peg$c256;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c257); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseMATCH() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c145) {
          s2 = peg$c145;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c146); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseNO() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c258) {
          s2 = peg$c258;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c259); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseNOT() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c100) {
          s2 = peg$c100;
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c101); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseNOTNULL() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 7) === peg$c260) {
          s2 = peg$c260;
          peg$currPos += 7;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c261); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseNULL() {
      var s0;

      if (input.substr(peg$currPos, 4) === peg$c262) {
        s0 = peg$c262;
        peg$currPos += 4;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c263); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c264) {
          s0 = peg$c264;
          peg$currPos += 4;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c265); }
        }
      }

      return s0;
    }

    function peg$parseOF() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c266) {
          s2 = peg$c266;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c267); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseOFFSET() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c268) {
          s2 = peg$c268;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c269); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseON() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c270) {
          s2 = peg$c270;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c271); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseOR() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c149) {
          s2 = peg$c149;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c150); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseORDER() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c272) {
          s2 = peg$c272;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c273); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseOUTER() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c274) {
          s2 = peg$c274;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c275); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsePRIMARY() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 7) === peg$c276) {
          s2 = peg$c276;
          peg$currPos += 7;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c277); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseQUERY() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c278) {
          s2 = peg$c278;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c279); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseRAISE() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c280) {
          s2 = peg$c280;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c281); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseREFERENCES() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 10) === peg$c282) {
          s2 = peg$c282;
          peg$currPos += 10;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c283); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseREGEXP() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c147) {
          s2 = peg$c147;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c148); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseRENAME() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c284) {
          s2 = peg$c284;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c285); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseREPLACE() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 7) === peg$c286) {
          s2 = peg$c286;
          peg$currPos += 7;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c287); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseRETURN() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c34) {
          s2 = peg$c34;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c35); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseROW() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c288) {
          s2 = peg$c288;
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c289); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseSAVEPOINT() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 9) === peg$c290) {
          s2 = peg$c290;
          peg$currPos += 9;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c291); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseSELECT() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c292) {
          s2 = peg$c292;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c293); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseSET() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c294) {
          s2 = peg$c294;
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c295); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseTABLE() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c296) {
          s2 = peg$c296;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c297); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseTEMP() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c298) {
          s2 = peg$c298;
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c299); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseTEMPORARY() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 9) === peg$c300) {
          s2 = peg$c300;
          peg$currPos += 9;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c301); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseTHEN() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c302) {
          s2 = peg$c302;
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c303); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseTO() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c304) {
          s2 = peg$c304;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c305); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseUNION() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c306) {
          s2 = peg$c306;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c307); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseUSING() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c308) {
          s2 = peg$c308;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c309); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsevALUES() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c310) {
          s2 = peg$c310;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c311); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseVIRTUAL() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 7) === peg$c312) {
          s2 = peg$c312;
          peg$currPos += 7;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c313); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseWITH() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c314) {
          s2 = peg$c314;
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c315); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseWHERE() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsewhitespace1();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c316) {
          s2 = peg$c316;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c317); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsejs_string_literal() {
      var s0, s1, s2, s3;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s1 = peg$c319;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c320); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsejs_double_string_character();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsejs_double_string_character();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 34) {
            s3 = peg$c319;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c320); }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c321(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 39) {
          s1 = peg$c190;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c191); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parsejs_single_string_character();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsejs_single_string_character();
          }
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 39) {
              s3 = peg$c190;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c191); }
            }
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c321(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c318); }
      }

      return s0;
    }

    function peg$parsejs_double_string_character() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (input.charCodeAt(peg$currPos) === 34) {
        s2 = peg$c319;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c320); }
      }
      if (s2 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 92) {
          s2 = peg$c195;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c196); }
        }
        if (s2 === peg$FAILED) {
          s2 = peg$parsejs_line_terminator();
        }
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = void 0;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsejs_source_character();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c322();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 92) {
          s1 = peg$c195;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c196); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsejs_escape_sequence();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c323(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parsejs_line_continuation();
        }
      }

      return s0;
    }

    function peg$parsejs_single_string_character() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (input.charCodeAt(peg$currPos) === 39) {
        s2 = peg$c190;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c191); }
      }
      if (s2 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 92) {
          s2 = peg$c195;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c196); }
        }
        if (s2 === peg$FAILED) {
          s2 = peg$parsejs_line_terminator();
        }
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = void 0;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsejs_source_character();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c322();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 92) {
          s1 = peg$c195;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c196); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsejs_escape_sequence();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c323(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parsejs_line_continuation();
        }
      }

      return s0;
    }

    function peg$parsejs_line_continuation() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s1 = peg$c195;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c196); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsejs_line_terminator_sequence();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c324();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsejs_escape_sequence() {
      var s0, s1, s2, s3;

      s0 = peg$parsejs_character_escape_sequence();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 48) {
          s1 = peg$c325;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c326); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          peg$silentFails++;
          s3 = peg$parsejs_decimal_digit();
          peg$silentFails--;
          if (s3 === peg$FAILED) {
            s2 = void 0;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c327();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parsejs_hex_escape_sequence();
          if (s0 === peg$FAILED) {
            s0 = peg$parsejs_unicode_escape_sequence();
          }
        }
      }

      return s0;
    }

    function peg$parsejs_line_terminator() {
      var s0;

      if (peg$c328.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c329); }
      }

      return s0;
    }

    function peg$parsejs_source_character() {
      var s0;

      if (input.length > peg$currPos) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c189); }
      }

      return s0;
    }

    function peg$parsejs_character_escape_sequence() {
      var s0;

      s0 = peg$parsejs_single_escape_character();
      if (s0 === peg$FAILED) {
        s0 = peg$parsejs_non_escape_character();
      }

      return s0;
    }

    function peg$parsejs_single_escape_character() {
      var s0, s1;

      if (input.charCodeAt(peg$currPos) === 39) {
        s0 = peg$c190;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c191); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 34) {
          s0 = peg$c319;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c320); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 92) {
            s0 = peg$c195;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c196); }
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 98) {
              s1 = peg$c330;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c331); }
            }
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c332();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 102) {
                s1 = peg$c333;
                peg$currPos++;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c334); }
              }
              if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c335();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 110) {
                  s1 = peg$c336;
                  peg$currPos++;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c337); }
                }
                if (s1 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c338();
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.charCodeAt(peg$currPos) === 114) {
                    s1 = peg$c339;
                    peg$currPos++;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c340); }
                  }
                  if (s1 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c341();
                  }
                  s0 = s1;
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.charCodeAt(peg$currPos) === 116) {
                      s1 = peg$c342;
                      peg$currPos++;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c343); }
                    }
                    if (s1 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c344();
                    }
                    s0 = s1;
                    if (s0 === peg$FAILED) {
                      s0 = peg$currPos;
                      if (input.charCodeAt(peg$currPos) === 118) {
                        s1 = peg$c345;
                        peg$currPos++;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c346); }
                      }
                      if (s1 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c347();
                      }
                      s0 = s1;
                    }
                  }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsejs_line_terminator_sequence() {
      var s0, s1;

      peg$silentFails++;
      if (input.charCodeAt(peg$currPos) === 10) {
        s0 = peg$c181;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c182); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c349) {
          s0 = peg$c349;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c350); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 13) {
            s0 = peg$c351;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c352); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 8232) {
              s0 = peg$c353;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c354); }
            }
            if (s0 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 8233) {
                s0 = peg$c355;
                peg$currPos++;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c356); }
              }
            }
          }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c348); }
      }

      return s0;
    }

    function peg$parsejs_non_escape_character() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      s2 = peg$parsejs_escape_character();
      if (s2 === peg$FAILED) {
        s2 = peg$parsejs_line_terminator();
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = void 0;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsejs_source_character();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c322();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsejs_escape_character() {
      var s0;

      s0 = peg$parsejs_single_escape_character();
      if (s0 === peg$FAILED) {
        s0 = peg$parsejs_decimal_digit();
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 120) {
            s0 = peg$c357;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c358); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 117) {
              s0 = peg$c359;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c360); }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsejs_decimal_digit() {
      var s0;

      if (peg$c167.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c168); }
      }

      return s0;
    }

    function peg$parsejs_hex_escape_sequence() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 120) {
        s1 = peg$c357;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c358); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$currPos;
        s4 = peg$parsejs_hex_digit();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsejs_hex_digit();
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
          s2 = input.substring(s2, peg$currPos);
        } else {
          s2 = s3;
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c361(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsejs_hex_digit() {
      var s0;

      if (peg$c362.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c363); }
      }

      return s0;
    }

    function peg$parsejs_unicode_escape_sequence() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 117) {
        s1 = peg$c359;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c360); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$currPos;
        s4 = peg$parsejs_hex_digit();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsejs_hex_digit();
          if (s5 !== peg$FAILED) {
            s6 = peg$parsejs_hex_digit();
            if (s6 !== peg$FAILED) {
              s7 = peg$parsejs_hex_digit();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
          s2 = input.substring(s2, peg$currPos);
        } else {
          s2 = s3;
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c361(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(
        null,
        peg$maxFailExpected,
        peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
        peg$maxFailPos < input.length
          ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
          : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
      );
    }
  }

  return {
    SyntaxError: peg$SyntaxError,
    parse:       peg$parse
  };
})();

},{"./ast.js":15,"underscore":18}],18:[function(require,module,exports){
//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}],19:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},[1,2,3,4,5,6,7,8,9,10,11,12,13]);
