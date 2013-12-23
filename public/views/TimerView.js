/* global Backbone,$,_ */

window.TimerView = Backbone.View.extend({
    initialize: function () {
        var me = this;
        this.$el = $('#timer');
        this.template = require(['text!templates/timer.html'], function (tmpl) {
            me.template = tmpl;
            me.listenTo(me.model, 'change', me.render);
            me.render();
        });
    },
    render: function () {
        var me = this;
        me.$el.html(_.template(me.template, me.model.toJSON(),  {variable: 'data'}));
        me.$el.find('.move').click(function () {
            me.trigger('click');
        });
    }
});