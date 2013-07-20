var FenceModel = FieldModel.extend();

var FenceHModel = FenceModel.extend({
    defaults                : {
        type: 'H'
    },
    getAdjacentFencePosition: function () {
        return {
            x: this.get('x') - 1,
            y: this.get('y')
        };
    }
});

var FenceVModel = FenceModel.extend({
    defaults                : {
        type: 'V'
    },
    getAdjacentFencePosition: function () {
        return {
            x: this.get('x'),
            y: this.get('y') - 1
        };
    }
});

var FencesCollection = Backbone.Collection.extend({
    initialize                   : function () {
        this.on('add', this.onAdd);
    },
    onAdd                        : function (item) {
        item.on({
            'selected'                     : function (item) {
                this.triggerEventOnFenceAndSibling(item, 'markasselected');
            },
            'highlight_current_and_sibling': function (item) {
                this.triggerEventOnFenceAndSibling(item, 'highlight');
            },
            'reset_current_and_sibling'    : function (item) {
                this.triggerEventOnFenceAndSibling(item, 'dehighlight');
            }
        }, this);
    },
    triggerEventOnFenceAndSibling: function (item, event) {
        if (this.isBusy(item)) return;
        if (!this.isFencePlaceable(item)) return;

        var siblingPosition = item.getAdjacentFencePosition();
        var sibling = this.findWhere({
            x   : siblingPosition.x,
            y   : siblingPosition.y,
            type: item.get('type')
        });

        if (!sibling) return;
        if (this.isBusy(item)) return;

        sibling.trigger(event);
        item.trigger(event);
    },
    isBusy                       : function (item) {
        return item.get('state') == 'busy';
    },
    isFencePlaceable             : function (item) {
        var type, i, j;
        item.get('type') == 'V'
            ? (type = 'H', i = 'y', j = 'x')
            : (type = 'V', i = 'x', j = 'y');
        var attrs = { state: 'busy', type : type };
        attrs[i] = item.get(i) - 1;
        var prevLine = this.where(attrs);
        var f1 = _(prevLine).find(function(model) {
            return model.get(j) == item.get(j)
        });
        var f2 = _(prevLine).find(function(model) {
            return model.get(j) == item.get(j) + 1
        });
        return !(f1 && f2);
    }

});