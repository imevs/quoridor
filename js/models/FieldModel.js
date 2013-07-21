var FieldModel = Backbone.Model.extend({});

var FieldsCollection = Backbone.Collection.extend({
    initialize: function() {
        this.on('valid_position', this.selectField);
    },
    selectField: function(x, y) {
        if (!this.isPlayerPlaceable(x, y)) return;

        var field = this.findWhere({x: x, y: y});
        field.trigger('selectfield');
    },
    isPlayerPlaceable: function (item) {
        return true;
    }

});