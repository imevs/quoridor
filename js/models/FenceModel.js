var FenceModel = FieldModel.extend();

var FenceHModel = FenceModel.extend({
    defaults: {
        type: 'H'
    },
    getAdjacentFencePosition: function() {
        return {
            x: this.get('x') - 1,
            y: this.get('y')
        };
    }
});

var FenceVModel = FenceModel.extend({
    defaults: {
        type: 'V'
    },
    getAdjacentFencePosition: function() {
        return {
            x: this.get('x'),
            y: this.get('y') - 1
        };
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
        var siblingPosition = item.getAdjacentFencePosition();
        var sibling = this.findWhere({
            x: siblingPosition.x,
            y: siblingPosition.y,
            type: item.get('type')
        });
        sibling && sibling.set('color', 'green');
    },
    getAdjacentFence: function(current) {
        return null;
    }
});