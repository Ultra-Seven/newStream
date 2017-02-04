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





