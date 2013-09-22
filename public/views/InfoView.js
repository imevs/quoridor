var InfoView = Backbone.View.extend({
    initialize: function() {
        var me = this;
        this.$el = $("#game-info");
        this.template = require(["text!templates/game-info.html"], function(tmpl) {
            me.template = tmpl;
            me.listenTo(me.model, "change", me.render);
            me.render();
/*
            me.$el.find('.move').click(function () {
                me.trigger('click');
            });
*/
        });
    },
    render: function() {
        this.$el.html(_.template(this.template, this.model.toJSON(),  {variable: 'data'}));
    }
});