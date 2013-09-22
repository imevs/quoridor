var GameHistoryView = Backbone.View.extend({
    initialize: function() {
        var me = this;
        this.$el = $('#history');
        this.template = require(['text!templates/history.html'], function(tmpl) {
            me.template = tmpl;
            me.listenTo(me.model, 'change', me.render);
            me.render();
        });
    },
    render: function() {
        var data = [];
        _(_.range(this.model.getLength())).each(function(i) {
            data.push(this.model.at(i));
        }, this);
        this.$el.html(_.template(this.template, data, {variable: 'data'}));
    }
});