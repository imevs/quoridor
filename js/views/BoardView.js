var BoardView = GameObject.extend({
    el: 'holder',

    initialize: function () {
        var me = this.model,
            cls = this.constructor,
            d = cls.squareDistance,
            w = me.boardSize * (d + cls.squareWidth),
            h = me.boardSize * (d + cls.squareHeight),
            x = 10 - d / 2,
            y = 10 - d / 2;

        var obj = cls.getPaper().rect(x, 10 - d/2, w, h);
        obj.attr('fill', 'blue');

        this.setElement(obj);

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