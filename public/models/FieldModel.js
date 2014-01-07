var isNode = typeof module !== 'undefined';

if (isNode) {
    var Backbone = require('backbone');
    var _ = require('lodash-node/underscore');
}

var FieldModel = Backbone.Model.extend({

    getColor: function (playersPositions) {
        var color = '';
        _(playersPositions).some(function (pos) {
            if ((this.get('x') === 0 || this.get('x') === 8) &&
                (this.get('y') === 0 || this.get('y') === 8)) {
                return false;
            }
            var win = pos.isWin(this.get('x'), this.get('y'));
            if (win) {
                color = pos.color;
            }
            return win;
        }, this);
        return color;
    }
});

var FieldsCollection = Backbone.Collection.extend({
    model: FieldModel,
    selectField: function (x, y) {
        var field = this.findWhere({x: x, y: y});
        field.trigger('selectfield');
    },
    createFields: function (boardSize) {
        var me = this;
        _([boardSize, boardSize]).iter(function (i, j) {
            me.add({x: i, y: j});
        });
    }
});

if (isNode) {
    module.exports = FieldsCollection;
}