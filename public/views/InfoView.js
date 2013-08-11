var InfoView = Backbone.View.extend({
    initialize: function() {
        var me = this;
        this.template = require(["text!templates/game-info.html"], function(tmpl) {
            me.template = tmpl;
            me.listenTo(me.model, "change", me.render);
            me.render();
        });
    },
    render: function() {
        this.$el.html(_.template(this.template, this.model.attributes,  {variable: 'data'}));
    }
});