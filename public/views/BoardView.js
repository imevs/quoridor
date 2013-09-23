var BoardView = GameObject.extend({
    selector: '#board',
    events: {
        'click': 'move'
    },
    move: function() {
        this.model.trigger('confirmturn', true);
    },
    render: function(callback) {
        var me = this;
        this.$el = $(this.selector);
        this.template = require(["text!templates/board.html"], function(tmpl) {
            me.template = tmpl;
            me.$el.html(_.template(me.template, me.model.attributes,  {variable: 'data'}));
            callback.call(me);
        });
    },
    initialize: function () {
        this.render(this.afterRender);
    },
    renderLegend  : function (y, x, w, h) {
        var me = this.model,
            cls = this.constructor,
            d = cls.squareDistance,
            boardSize = me.get('boardSize');

        _(_.range(boardSize)).each(function (i) {
            var _xv, _yh, text, value = i;
            var _yv = y + (i + 0.5) * (cls.squareHeight + d);
            var _xh = x + (i + 0.5) * (cls.squareWidth + d);

            _xv = x - 10;
            text = cls.getPaper().text(_xv, _yv, me.get('boardSize') - value);
            text.attr('fill', 'black');
            text.attr('font-size', 20);

            _xv = x + w + 10;
            text = cls.getPaper().text(_xv, _yv, me.get('boardSize') - value);
            text.attr('fill', 'black');
            text.attr('font-size', 20);

            _yh = y - 15;
            text = cls.getPaper().text(_xh, _yh, me.intToChar(value));
            text.attr('fill', 'black');
            text.attr('font-size', 20);

            _yh = y + h + 15;
            text = cls.getPaper().text(_xh, _yh, me.intToChar(value));
            text.attr('fill', 'black');
            text.attr('font-size', 20);
        });

        _(_.range(boardSize - 1)).each(function (i) {
            var _xv, _yh, text, value = i;
            var _yv = y + (i + 1) * (cls.squareHeight + d);
            var _xh = x + (i + 1) * (cls.squareWidth + d);

            _xv = x - 10;
            text = cls.getPaper().text(_xv, _yv, me.get('boardSize') - value - 1);
            text.attr('fill', 'black');
            text.attr('font-size', 10);

            _xv = x + w + 10;
            text = cls.getPaper().text(_xv, _yv, me.get('boardSize') - value - 1);
            text.attr('fill', 'black');
            text.attr('font-size', 10);

            _yh = y - 15;
            text = cls.getPaper().text(_xh, _yh, me.intToChar(value));
            text.attr('fill', 'black');
            text.attr('font-size', 10);

            _yh = y + h + 15;
            text = cls.getPaper().text(_xh, _yh, me.intToChar(value));
            text.attr('fill', 'black');
            text.attr('font-size', 10);
        });
    },

    afterRender: function () {
        this.$el.find('.move').click(_.bind(this.move, this));

        var me = this.model,
            cls = this.constructor,
            d = cls.squareDistance,
            w = me.get('boardSize') * (d + cls.squareWidth),
            h = me.get('boardSize') * (d + cls.squareHeight),
            x = cls.startX - d / 2,
            y = cls.startY - d / 2;

        var p = cls.getPaper();
        var borderLeft = p.rect(x, y, 7, h + 1);
        var borderRight = p.rect(x + w - 5, y, 7, h + 1);
        var borderTop = p.rect(x, y - 2, w + 2, 7);
        var borderBottom = p.rect(x, y + h - 5, w + 2, 7);

        borderLeft.attr('fill', '#c75');
        borderRight.attr('fill', '#c75');
        borderTop.attr('fill', '#c75');
        borderBottom.attr('fill', '#c75');
        this.renderLegend(y, x, w, h);
        me.fields.each(function (model) {
            var params = {model: model};
            if (model.get('y') == 0) {
                params.defaultColor = 'lightgray';
            }
            if (model.get('y') == me.get('boardSize') - 1) {
                params.defaultColor = 'red';
            }
            new FieldView(params);
        });
        me.fences.each(function (model) {
            FenceView.createFenceView(model);
        });
        me.players.each(function (model) {
            new PlayerView({model: model})
        });
        var info = new InfoView({
            model: me.infoModel
        });
        var history = new GameHistoryView({
            model: me.historyModel
        });

        //info.on('click', _.bind(this.move, this));
    }
});