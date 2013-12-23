var isNode = typeof module !== 'undefined';

if (isNode) {
    var Backbone = require('backbone');
    var _ = require('../utils.js');
}

var FenceModel = Backbone.Model.extend({

    defaults: {
        color: '#c75',
        state: ''
    },

    initialize: function () {
        this.on({
            'movefence': function () {
                this.set('state', 'prebusy');
            },
            'markfence': function () {
                if (!this.get('state')) {
                    this.set('state', 'highlight');
                }
            },
            'unmarkfence': function () {
                if (this.get('state') === 'highlight') {
                    this.set('state', '');
                }
            },
            'change:state': this.onChangeState
        });
    },

    onChangeState: function () {
        if (this.get('state') === 'prebusy') {
            this.set({
                color: 'black',
                prevcolor: 'black'
            });
        }
        if (this.get('state') === '') {
            this.set({
                color: this.defaults.color,
                prevcolor: ''
            });
        }
        if (this.get('state') === 'highlight') {
            this.set({
                color: 'black',
                prevcolor: this.get('color')
            });
        }
    }

});

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
_.defaults(FenceHModel.prototype.defaults, FenceModel.prototype.defaults);

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
_.defaults(FenceVModel.prototype.defaults, FenceModel.prototype.defaults);

var FencesCollection = Backbone.Collection.extend({

    model     : function (attrs, options) {
        return attrs.type === 'H'
            ? new FenceHModel(attrs, options)
            : new FenceVModel(attrs, options);
    },

    initialize: function () {
        this.on('premarkasselected', this.clearBusy, this);
    },
    createFences: function (boardSize, fences) {
        var me = this;
        _([boardSize, boardSize - 1]).iter(function (i, j) {
            me.add({x: i, y: j, type: 'H'});
        });
        _([boardSize - 1, boardSize]).iter(function (i, j) {
            me.add({x: i, y: j, type: 'V'});
        });

        _(fences).each(function (fence) {
            var find = me.findWhere({
                x: fence.x,
                y: fence.y,
                type: fence.t
            });
            var sibling = me.getSibling(find);
            find.set('state', 'busy');
            sibling.set('state', 'busy');
        });
    },
    clearBusy: function () {
        _(this.where({
            state: 'prebusy'
        })).each(function (fence) {
            fence.set({state: ''});
        });
    },
    getPreBusy: function () {
        return this.where({state: 'prebusy'});
    },
    setBusy: function () {
        _(this.getPreBusy()).each(function (fence) {
            fence.set({state: 'busy'});
        });
    },
    getMovedFence: function () {
        var fences = this.getPreBusy();
        return _.chain(fences)
            .sortBy(function (i) { return i.get('x'); })
            .sortBy(function (i) { return i.get('y'); })
            .last().value();
    },
    getSibling                      : function (item) {
        var siblingPosition = item && item.getAdjacentFencePosition();
        return siblingPosition && this.findWhere({
            x   : siblingPosition.x,
            y   : siblingPosition.y,
            type: item.get('type')
        });
    },
    triggerEventOnFenceAndSibling: function (item, event) {
        var sibling = this.getSibling(item);
        if (sibling && event) {
            sibling.trigger(event);
            item.trigger(event);
        }
    },
    validateFenceAndSibling: function (item) {
        if (!item) {
            return false;
        }
        if (this.isBusy(item)) {
            return false;
        }
        if (!this.isFencePlaceable(item)) {
            return false;
        }
        var sibling = this.getSibling(item);

        return !!(sibling && !this.isBusy(sibling));
    },
    validateAndTriggerEventOnFenceAndSibling: function (item, event) {
        var shouldTriggerEvent = this.validateFenceAndSibling(item);
        if (shouldTriggerEvent && event) {
            item.trigger('pre' + event);
            item.trigger(event);
            var sibling = this.getSibling(item);
            sibling.trigger(event);
        }
        return shouldTriggerEvent;
    },
    isBusy                       : function (item) {
        return item.get('state') === 'busy';
    },
    isFencePlaceable             : function (item) {
        var type, i, j;
        if (item.get('type') === 'V') {
            type = 'H';
            i = 'y';
            j = 'x';
        } else {
            type = 'V';
            i = 'x';
            j = 'y';
        }
        var attrs = { state: 'busy', type: type };
        attrs[i] = item.get(i) - 1;
        var prevLine = this.where(attrs);
        var f1 = _(prevLine).find(function (model) {
            return model.get(j) === item.get(j);
        });
        var f2 = _(prevLine).find(function (model) {
            return model.get(j) === item.get(j) + 1;
        });
        return !(f1 && f2);
    }

});

if (isNode) {
    module.exports = FencesCollection;
}