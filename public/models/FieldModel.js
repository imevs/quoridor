var isNode = typeof module !== 'undefined';

if (isNode) {
    var Backbone = require('backbone');
    var _ = require('lodash-node/underscore');
}

var FieldModel = Backbone.Model.extend({});

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