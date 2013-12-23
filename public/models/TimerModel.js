
window.TimerModel = Backbone.Model.extend({

    defaults: {
        timePrev: 0,
        time: 0
    },

    start: function () {
        var timer = this;
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
    },

    stop: function () {
        clearInterval(this.interval);
    }

});