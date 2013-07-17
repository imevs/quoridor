var FieldModel = Backbone.Model.extend();

var FieldsCollection = Backbone.Collection.extend({
    initialize: function() {
        this.on('add', this.onAdd);
    },
    onAdd: function(item) {
        var me = this;
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