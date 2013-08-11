var FieldModel = Backbone.Model.extend({});

var FieldsCollection = Backbone.Collection.extend({
    selectField: function(x, y) {
        var field = this.findWhere({x: x, y: y});
        field.set('state', '');
        field.trigger('selectfield');
    },
    markFieldOrMovePlayer: function(x, y, callback) {
        var field = this.findWhere({x: x, y: y});
        if (field.get('state') == 'marked' && callback) {
            callback();
        } else {
            this.each(function(item) {
                item.set('state', '');
            });
            field.set('state', 'marked');
            field.trigger('markfield');
        }
    }
});