var global = this;
var Backbone = global.Backbone || require('backbone');
var _ = require('../utils.js');

var FenceModel = Backbone.Model.extend({

    defaults: {
        color: '#c75'
    },

    initialize: function() {
        this.on({
            'movefence': function() {
                this.set('state', 'prebusy');
            },
            'markfence': function() {
                if (!this.get('state')) {
                    this.set('state', 'highlight');
                }
            },
            'unmarkfence': function() {
                if (this.get('state') == 'highlight') {
                    this.set('state', '');
                }
            },
            'change:state': this.onChangeState
        });
    },

    onChangeState: function() {
        if (this.get('state') == 'prebusy') {
            this.set({
                color: 'black',
                prevcolor: 'black'
            });
        }
        if (this.get('state') == '') {
            this.set({
                color: this.defaults.color,
                prevcolor: ''
            });
        }
        if (this.get('state') == 'highlight') {
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
    model     : FenceModel,

    initialize: function() {
        this.on('premarkasselected', this.clearBusy, this);
    },

    createFences: function(boardSize) {
        var me = this;
        _([boardSize, boardSize - 1]).iter(function (i, j) {
            me.addHorizontal({x: i, y: j});
        });
        _([boardSize - 1, boardSize]).iter(function (i, j) {
            me.addVertical({x: i, y: j});
        });
    },

    clearBusy: function() {
        _(this.where({
            state: 'prebusy'
        })).each(function(fence) {
            fence.set({state: ''});
        });
    },
    setBusy: function() {
        _(this.where({
            state: 'prebusy'
        })).each(function(fence) {
            fence.set({state: 'busy'});
        });
    },

    getMovedFence: function() {
        var fences = this.where({
            state: 'prebusy'
        });
        return _.chain(fences)
            .sortBy(function(i) { return i.get('x')})
            .sortBy(function(i) { return i.get('y')})
            .last().value();
    },

    getSibling                      : function (item) {
        var siblingPosition = item.getAdjacentFencePosition();
        return this.findWhere({
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
    validateAndTriggerEventOnFenceAndSibling: function (item, event) {
        if (this.isBusy(item)) return false;
        if (!this.isFencePlaceable(item)) return false;

        var sibling = this.getSibling(item);

        var shouldTriggerEvent = sibling
            && !this.isBusy(sibling)
            && this.hasPassForPlayer(sibling, item);

        if (shouldTriggerEvent && event) {
            item.trigger('pre' + event);
            item.trigger(event);
            sibling.trigger(event);
        }
        return shouldTriggerEvent;
    },
    isBusy                       : function (item) {
        return item.get('state') == 'busy';
    },
    /**
     * @todo Расчитать наличие прохода по ломанной лмнии
     * @param item1
     * @param item2
     * @returns {boolean}
     */
    hasPassForPlayer             : function (item1, item2) {
        var type, i, j;
        item1.get('type') == 'H'
            ? (type = 'H', i = 'y', j = 'x')
            : (type = 'V', i = 'x', j = 'y');

        var attrs = {type: item1.get('type')};

        attrs[i] = item1.get(i);
        var fencesLengthOnLine = this.where(attrs).length;

        attrs.state = 'busy';
        var busyCount = this.where(attrs).length;

        busyCount += 2;

        return busyCount < fencesLengthOnLine;
    },
    isFencePlaceable             : function (item) {
        var type, i, j;
        item.get('type') == 'V'
            ? (type = 'H', i = 'y', j = 'x')
            : (type = 'V', i = 'x', j = 'y');
        var attrs = { state: 'busy', type: type };
        attrs[i] = item.get(i) - 1;
        var prevLine = this.where(attrs);
        var f1 = _(prevLine).find(function (model) {
            return model.get(j) == item.get(j)
        });
        var f2 = _(prevLine).find(function (model) {
            return model.get(j) == item.get(j) + 1
        });
        return !(f1 && f2);
    },

    addHorizontal: function(attrs) {
        this.add(new FenceHModel(attrs));
    },
    addVertical: function(attrs) {
        this.add(new FenceVModel(attrs));
    }

});

module.exports = FencesCollection;