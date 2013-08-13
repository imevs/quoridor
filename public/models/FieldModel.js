var FieldModel = Backbone.Model.extend({});

var FieldsCollection = Backbone.Collection.extend({
    model: FieldModel,
    selectField: function(x, y) {
        var field = this.findWhere({x: x, y: y});
        field.trigger('selectfield');
    }
});