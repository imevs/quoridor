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
        item.on({
            'selected'       : function(item) {
                this.triggerEventOnFenceAndSibling(item, 'markasselected');
            },
            'highlight_current_and_sibling'  : function(item) {
                this.triggerEventOnFenceAndSibling(item, 'highlight');
            },
            'reset_current_and_sibling': function(item) {
                this.triggerEventOnFenceAndSibling(item, 'dehighlight');
            }
        }, this);
    },
    triggerEventOnFenceAndSibling      : function (item, event) {
        var siblingPosition = item.getAdjacentFencePosition();
        var sibling = this.findWhere({
            x   : siblingPosition.x,
            y   : siblingPosition.y,
            type: item.get('type')
        });
        if (sibling) {
            sibling.trigger(event);
            item.trigger(event);
        }
    }

});