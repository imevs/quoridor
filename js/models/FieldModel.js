var FieldModel = Backbone.Model.extend({});

var FieldsCollection = Backbone.Collection.extend({
    selectField: function(x, y) {
        var field = this.findWhere({x: x, y: y});
        field.trigger('selectfield');
    }
});