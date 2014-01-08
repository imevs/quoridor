/* global GameObject,$,_ */
window.InfoView = GameObject.extend({
    fences: [],
    initialize: function (params) {
        var me = this;
        params = params || {};
        me.playersPositions = params.playersPositions;
        this.$el = $('#game-info');
        this.template = require(['text!templates/game-info.html'], function (tmpl) {
            me.template = tmpl;
            me.listenTo(me.model, 'change', me.render);
            me.render();
        });
        this.displayCurrentPlayer();
    },
    render: function () {
        var me = this;
        me.$el.html(_.template(me.template, me.model.toJSON(),  {variable: 'data'}));
        me.$el.find('.move').click(function () {
            me.trigger('click');
        });
        this.clearFences();
        this.drawRemainingFences();
        this.displayActivePlayer();
    },

    drawRemainingFences: function () {
        var me = this,
            cls = this.constructor,
            w = cls.squareDistance,
            h = cls.squareHeight,
            playersCount = me.model.get('fences').length,
            y0 = cls.startY - w - cls.squareHeight,
            x0 = cls.startX - w + cls.borderDepth,
            boardSize = 9,
            fenceCountPerPlayer = 5,
            boardHeight = (cls.squareHeight + cls.squareDistance) * boardSize + 2 * cls.borderDepth,
            boardWidth = (cls.squareWidth + cls.squareDistance) * fenceCountPerPlayer;

        _(me.model.get('fences')).each(function (fenceCount, index) {
            var x = x0, y = y0;
            if (playersCount === 2 && index === 1 || playersCount === 4 && index > 1) {
                y += boardHeight + h + w;
            }
            if (playersCount === 4 && (index === 1 || index === 2)) {
                x += boardWidth;
            }

            _(fenceCount).times(function (i) {
                var dx = i * (cls.squareWidth + cls.squareDistance);

                var obj = cls.getPaper().rect(x + dx, y, w, h);
                obj.attr('fill', me.playersPositions[index].color);
                obj.attr('stroke-width', 1);
                me.fences.push(obj);
            });

        });
    },

    clearFences: function () {
        while (this.fences.length) {
            var f = this.fences.pop();
            f.remove();
        }
    },

    displayActivePlayer: function () {
        var cls = this.constructor;
        if (this.active) {
            this.active[0].remove();
            this.active[1].remove();
        }
        this.active = this.displayPlayer(this.model.get('activeplayer'), cls.squareWidth * 4, 70, 'Active');
    },

    displayCurrentPlayer: function () {
        var cls = this.constructor;
        this.displayPlayer(this.model.get('currentplayer'), cls.squareWidth, 70, 'You');
    },

    displayPlayer: function (index, dx, dy, text) {
        dx += 70;
        var me = this,
            cls = me.constructor,
            color = me.playersPositions[index].color,
            w = cls.squareWidth,
            h = cls.squareHeight,
            x = cls.startX + dx,
            y = cls.startY - dy;

        var textObj = cls.getPaper().text(x - 70, y, text + ' -');
        textObj.attr('fill', 'black');
        textObj.attr('font-size', 20);

        var obj = cls.getPaper().ellipse(x, y, w / 2, h / 2);
        obj.attr('fill', color);
        return [obj, textObj];
    }
});