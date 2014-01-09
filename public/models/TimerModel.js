
window.TimerModel = Backbone.Model.extend({

    defaults: {
        timePrev: 0,
        times: [0, 0, 0, 0],
        time: 0
    },

    next: function (current) {
        var timer = this;
        this.get('times')[current] = this.get('times')[current] + this.get('time');
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
        this.set('times', [0, 0, 0, 0]);
    },

    stop: function () {
        clearInterval(this.interval);
    }

});