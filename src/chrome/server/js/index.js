var Pred = require("./predict");

var boxes = getAllInteractableElements();
var yourPred = new Pred.YourPredictor(boxes);
var baselinePred = new Pred.BaselinePredictor(boxes);
console.log(yourPred);



// instrument the document to collect the most recent mouse positions/actions
document.onmousemove = null;
document.onmouseup = null;
document.onmousedown = null;

// render the predictions as the user moves their mouse

function renderDistribution(distribution) {
}









// helper functions
function domToBox(el) {
  el = $(el);
  var off = el.offset();
  var name = el.get()[0].tagName;
  var box = [name, off.left, off.top, el.width(), el.height()];
  return box;
}

// This ignores many possible elements that are interactable, such as dom elements with event listeners
function getAllInteractableElements() {
  var els = $("select, input, option, span, circle, rect, submit, a, button").get();
  //var boxes = els.filter(isVisible).map(domToBox);
  var boxes = els.map(domToBox);
  return boxes;
}


