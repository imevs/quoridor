var isNode = typeof module !== 'undefined';

if (isNode) {
    var Backbone = require('backbone');
    var _ = require('lodash-node/underscore');
}

var TimerModel = Backbone.Model.extend({

    defaults: {
        playerNames: [],
        timePrev: 0,
        allTime: 0,
        times: [0, 0, 0, 0],
        time: 0
    },

    isStopped: false,

    next: function (current) {
        if (this.isStopped) {
            return;
        }
        var timer = this;
        this.get('times')[current] = this.get('times')[current] + this.get('time');
        timer.set('allTime', timer.get('allTime') + this.get('time'));
        timer.set('timePrev', timer.get('time'));
        timer.set('time', 0);
        clearInterval(this.interval);
        timer.interval = setInterval(function () {
            timer.set('time', timer.get('time') + 1);
        }, 1000);
    },

    reset: function () {
        this.set('timePrev', this.get('time'));
        this.set('time', 0);
        this.set('allTime', 0);
        this.set('times', [0, 0, 0, 0]);
    },

    stop: function () {
        this.isStopped = true;
        clearInterval(this.interval);
    }

});

if (isNode) {
    module.exports = TimerModel;
}
