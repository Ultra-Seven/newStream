var Pred = require("./predict");
var Logger = require("./logger").Logger;

// render the predictions as the user moves their mouse

function renderProbs(probs, color) {
  var marks = d3.select("#container").selectAll("circle."+color).data(probs);

  marks.enter()
    .append("circle");
  marks
    .classed(color, true)
    .attr("fill", color)
    .attr("cx", function(d) { return Math.ceil(d[0][0]); })
    .attr("cy", function(d) { return Math.ceil(d[0][1]); })
    .attr("opacity", 0.6)
    .attr("r", 10)
  marks.exit()
    .remove();
}

function renderPrediction(trace, predictor, color) {
  if (trace.length < 3) return;
  var deltaTime = $("#slider1").val();
  $("#sliderval").text(deltaTime);
  var dist = predictor.predict(trace, deltaTime);
  var probs = dist.getTopK(10);
  renderProbs(probs, color);
}



$(function() {
  // Setup the logger that collects mouse traces
  // logger.trace is an array of mouse positions: [ [x,y,t,action], ... ]
  var logger = window.logger = new Logger({minResolution: 5, traceLength: 150});
  logger.bind(document);

  var boxes = [];
  var yourPred = new Pred.YourPredictor(boxes);
  var baselinePred = new Pred.BaselinePredictor(boxes);

  function printTrace() {
    var trace = logger.trace;
    renderPrediction(trace, baselinePred, "blue");
    renderPrediction(trace, yourPred, "red");
    setTimeout(printTrace, 30);
  }
  printTrace();
});


