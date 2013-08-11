var InfoView = Backbone.View.extend({
    initialize: function() {
        this.template = require('game-info').replace(/\/\*\*.+\*\*\//, '');
        this.listenTo(this.model, "change", this.render);
        this.render();
    },
    render: function() {
        this.$el.html(_.template(this.template, this.model.attributes,  {variable: 'data'}));
    }
});