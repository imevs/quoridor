var GameObject = Backbone.RaphaelView.extend({
    // object methods
}, {
    squareWidth   : 50,
    squareHeight  : 30,
    squareDistance: 10,
    getPaper      : function () {
        return GameObject.paper || (GameObject.paper = Raphael('holder', 600, 600));
    }
});

var Info = Backbone.View.extend({

    templateId: '#info-tmpl',

    initialize: function() {
        this.template = $(this.templateId).html();
        this.listenTo(this.model, "change", this.render);
        this.render();
    },

    render: function() {
        this.$el.html(_.template(this.template, this.model.attributes,  {variable: 'data'}));
    }
});