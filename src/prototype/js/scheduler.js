var Scheduler = (function() {
  function Scheduler(timeRange) {
    this.history = {};
    
    _.each(timeRange, time => {
      this.history[time.toString()] = [];
    })
    this.threshold = 0.1;
  };
  Scheduler.prototype.addHistory = function(key, prob, time) {
    this.history[time].push([key, prob]);
  }

  Scheduler.prototype.setHistory = function(index, prob, time) {
    this.history[time][index][1] = prob;
  }
  Scheduler.prototype.deleteHistory = function(index, time) {
    this.history[time].splice(index, 1);
  }
  Scheduler.prototype.send = function(key, prob, time) {
    let index = this.getIndex(key);
    time = time.toString();
    if (index >= 0) {
      let last = this.history[time][index][1];
      this.setHistory(index, prob, time);
      if(prob > last) {
        return prob - last;
      }
      if (prob < this.threshold) {
        this.deleteHistory(index, time);
      }
      return 0;
    }
    else {
      this.addHistory(key, prob, time);
      return prob;
    }
  }
  Scheduler.prototype.getIndex = function(key) {
    for(let i = 0; i < this.history.length; i++){
      if (this.history[i][0] === key) {
        return i;
      }
    }
    return -1;
  }
  return Scheduler;
})();

module.exports = {
  Scheduler: Scheduler
}