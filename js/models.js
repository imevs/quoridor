var FieldModel = Backbone.Model.extend();

var FencesCollection = Backbone.Collection.extend({
    initialize: function() {
        this.on('add', this.onAdd);
    },
    onAdd: function(item) {
        var me = this;
        item.on('selected', function(item) {
            var sibling = me.getAdjacentFence(item);
            sibling && sibling.set('color', 'green');
        });
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
