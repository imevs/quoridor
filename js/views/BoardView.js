var BoardView = Backbone.RaphaelView.extend({
    el: 'holder',

    initialize: function () {
        var me = this.model;
        me.fields.each(function (model) {
            new FieldView({model: model});
        });
        me.fences.each(function (model) {
            model instanceof FenceHModel
                ? new FenceHView({model: model}) : new FenceVView({model: model});
        });
        me.players.each(function (model) {
            new PlayerView({model: model})
        });
        var info = new Info({
            el   : $("#game-info"),
            model: me.infoModel
        });
    }
});