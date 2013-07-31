var BoardView = GameObject.extend({
    el: 'holder',
    initialize: function () {
        var me = this.model,
            cls = this.constructor,
            d = cls.squareDistance,
            w = me.get('boardSize') * (d + cls.squareWidth),
            h = me.get('boardSize') * (d + cls.squareHeight),
            x = 10 - d / 2,
            y = 10 - d / 2;

        var p = cls.getPaper();
        var borderLeft = p.rect(x, y, 7, h + 1);
        var borderRight = p.rect(x + w - 5, y, 7, h + 1);
        var borderTop = p.rect(x, y - 2, w + 2, 7);
        var borderBottom = p.rect(x, y + h - 5, w + 2, 7);

        borderLeft.attr('fill', '#c75');
        borderRight.attr('fill', '#c75');
        borderTop.attr('fill', '#c75');
        borderBottom.attr('fill', '#c75');

        me.fields.each(function (model) {
            new FieldView({model: model});
        });
        me.fences.each(function (model) {
            FenceView.createFenceView(model);
        });
        me.players.each(function (model) {
            new PlayerView({model: model})
        });
        var info = new InfoView({
            el   : $("#game-info"),
            model: me.infoModel
        });
    }
});