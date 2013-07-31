var Undo = Backbone.View.extend({
    events: {
        'click': 'onUndo'
    },
    initialize: function() {
        this.el = $('#undo');
        this.el.on('click', _(this.onUndo).bind(this));
    },
    onUndo: function() {
        this.model.trigger('undo')
    }
});