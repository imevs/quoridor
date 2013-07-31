var FenceModel = Backbone.Model.extend({

    initialize: function() {
        this.on({
            'markasselected': function() {
                this.set('state', 'busy');
            },
            'highlight': function() {
                this.set('state', 'highlight');
            },
            'dehighlight': function() {
                this.set('state', '');
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
    }

});