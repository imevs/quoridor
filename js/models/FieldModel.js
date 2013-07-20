var FieldModel = Backbone.Model.extend({
    selectCurrent: function() {
        this.set({
            prevcolor: this.get('color'),
            color: 'black'
        });
    },
    unSelect: function() {
        if (this.get('prevcolor')) {
            this.set({
                prevcolor: '',
                color: this.get('prevcolor')
            });
        }
    }
});

var FieldsCollection = Backbone.Collection.extend({
    initialize: function() {
        this.on('valid_position', this.selectField);
    },
    selectField: function(x, y) {
        var field = this.findWhere({x: x, y: y});
        field.selectCurrent();
    }
});