var Scheduler = (function() {
  function Scheduler() {
    this.history = [];
    this.threshold = 0.1;
  };
  Scheduler.prototype.addHistory = function(key, prob) {
    this.history.push([key, prob]);
  }

  Scheduler.prototype.setHistory = function(index, prob) {
    this.history[index][prob];
  }
  Scheduler.prototype.deleteHistory = function(index, prob) {
    this.history[index][prob];
  }
  Scheduler.prototype.send = function(key, prob) {
    let index = this.getIndex(key);
    if (index >= 0) {
      let last = this.history[index][1];
      this.history[index][1] = prob;
      if(prob > last) {
        return prob - last;
      }
      if (prob < this.threshold) {
        this.history.splice(index, 1);
      }
      return 0;
    }
    else {
      this.addHistory(key, prob);
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