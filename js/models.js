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

var FencesCollection = Backbone.Collection.extend({
    initialize: function() {
        this.on('add', this.onAdd);
    },
    onAdd: function(item) {
        item.on('selected', _.bind(this.onSelectItem, this));
    },
    onSelectItem: function(item) {
        var sibling = this.getAdjacentFence(item);
        sibling && sibling.set('color', 'green');
    },
    getAdjacentFence: function(current) {
        return null;
    }
});

var HorizontalFencesCollection = FencesCollection.extend({
    getAdjacentFence: function(current) {
        return this.findWhere({
            x: current.get('x') - 1,
            y: current.get('y')
        });
    }
});

var VerticalFencesCollection = FencesCollection.extend({
    getAdjacentFence: function(current) {
        return this.findWhere({
            x: current.get('x'),
            y: current.get('y') - 1
        });
    }
});

var PlayersCollection = Backbone.Collection.extend({

});