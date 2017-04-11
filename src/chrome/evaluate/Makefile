
all: js/* 
	python collectscripts.py
	node js/test-evaluator.js 2> err.log
	echo "\n======================\nSee err.log for error messages\n======================\n"


clean: js/*
	rm js/dist.js js/ktm.js js/evaluator_*.js js/predict_*.js
	rm js/kf.js
	rm js/poly_predict.js
	rm js/predict.js
