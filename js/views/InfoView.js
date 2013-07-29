var InfoView = Backbone.View.extend({
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