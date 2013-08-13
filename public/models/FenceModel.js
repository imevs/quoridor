var FenceModel = Backbone.Model.extend({

    initialize: function() {
        this.on({
            'markasselected': function() {
                this.set('state', 'prebusy');
            },
            'highlight': function() {
                if (!this.get('state')) {
                    this.set('state', 'highlight');
                }
            },
            'dehighlight': function() {
                if (this.get('state') == 'highlight') {
                    this.set('state', '');
                }
            }
        });
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
    model                        : FenceModel,

    initialize: function() {
        this.on('premarkasselected', this.clearBusy, this);
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

    triggerEventOnFenceAndSibling: function (item, event) {
        var siblingPosition = item.getAdjacentFencePosition();
        var sibling = this.findWhere({
            x   : siblingPosition.x,
            y   : siblingPosition.y,
            type: item.get('type')
        });

        if (sibling && event) {
            sibling.trigger(event);
            item.trigger(event);
        }
    },
    validateAndTriggerEventOnFenceAndSibling: function (item, event) {
        if (this.isBusy(item)) return false;
        if (!this.isFencePlaceable(item)) return false;

        var siblingPosition = item.getAdjacentFencePosition();
        var sibling = this.findWhere({
            x   : siblingPosition.x,
            y   : siblingPosition.y,
            type: item.get('type')
        });

        if (!sibling) return false;
        if (this.isBusy(sibling)) return false;

        if (!this.hasPassForPlayer(sibling, item)) return false;

        if (event) {
            item.trigger('pre' + event);
            sibling.trigger(event);
            item.trigger(event);
        }
        return true;
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