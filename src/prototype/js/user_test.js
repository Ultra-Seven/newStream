var triggerMouse = function (mouseX, mouseY, targets) {
	let e = $.Event('mousemove');
    e.pageX = mouseX;
    e.pageY = mouseY;
    _.each(targets, (target)=>{
    	target.trigger(e);
    });
}
var traces = [[100, 100, 10000], [105, 105, 10005]];
var targets = [document];
var runMouse = function(index) {
	if (index < traces.length - 1) {
		trigger(traces[index][0], traces[index][1], targets);
		const hiatus = traces[index + 1][2] - traces[index][2];
		setTimeout(runMouse.bind(null, index + 1), hiatus);
	}
}
// $(document).ready(function() {
// 	var promise = new Promise(function(resolve) {
// 		console.log("do something");
// 		resolve();
// 	}).then(sleep(200)).then(function() {
// 		console.log("after sleeping 2s");
// 		runMouse(0);
// 	});
// });
