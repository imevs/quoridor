
window.TimerModel = Backbone.Model.extend({

    defaults: {
        playersCount: 4,
        timePrev: 0,
        current: -1,
        times: [0, 0, 0, 0],
        time: 0
    },

    start: function () {
        var timer = this;
        var current = this.get('current');
        this.get('times')[current] = this.get('times')[current] + this.get('time');
        timer.set('timePrev', timer.get('time'));
        timer.set('time', 0);
        clearInterval(this.interval);
        this.set('current', current < this.get('playersCount') - 1 ? current + 1 : 0);
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