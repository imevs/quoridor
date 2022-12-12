import { GameObject, ViewOptions } from "public/views/GameObject";
import { FieldView } from "public/views/FieldView";
import { createFenceView } from "public/views/FenceView";
import { PlayerView } from "public/views/PlayerView";
import { InfoView } from "public/views/InfoView";
import { TimerView } from "public/views/TimerView";
import { GameHistoryView } from "public/views/GameHistoryView";
import _ from "underscore";
import { BoardValidation } from "public/models/BoardValidation";

export class BoardView extends GameObject<BoardValidation> {
    selector = '#board';
    events = () => ({
        'click': 'move'
    });
    move() {
        this.model.trigger('confirmturn', true);
    };
    render() {
        const me = this;
        this.$el = $(this.selector);
        require(['text!templates/board.html'], (tmpl: string) => {
            me.template = tmpl;
            // @ts-ignore
            me.$el.html(_.template(me.template, me.model.attributes, {variable: 'data'}));
            this.afterRender();
        });
        return this;
    };

    initialize() {
        this.render();
    }

    renderLegend() {
        const me = this.model;
        const cls = ViewOptions,
            d = cls.squareDistance,
            boardSize = me.get('boardSize'),
            depth = cls.borderDepth,
            w = boardSize * (d + cls.squareWidth),
            h = boardSize * (d + cls.squareHeight),
            x = cls.startX + depth / 2,
            y = cls.startY + depth / 2 - 2;
        const largeFontSize = depth - 3;
        const smallFontSize = depth / 2;

        _(_.range(boardSize)).each((i) => {
            let text;
            const _yv = y + i * (cls.squareHeight + d) + (cls.squareHeight + depth) / 2;
            const _xh = x + i * (cls.squareWidth + d) + (cls.squareWidth + depth) / 2;

            text = cls.getPaper().text(x, _yv, me.intToInt(i));
            text.attr('fill', 'white');
            text.attr('font-size', largeFontSize);

            text = cls.getPaper().text(x + w + depth - d, _yv, me.intToInt(i));
            text.attr('fill', 'black');
            text.attr('font-size', largeFontSize);

            text = cls.getPaper().text(_xh, y, me.intToChar(i));
            text.attr('fill', 'black');
            text.attr('font-size', largeFontSize);

            text = cls.getPaper().text(_xh, y + h + depth - d, me.intToChar(i));
            text.attr('fill', 'black');
            text.attr('font-size', largeFontSize);
        });

        _(_.range(boardSize - 1)).each((i) => {
            let text;
            const _yv = y + i * (cls.squareHeight + d) + cls.squareHeight + (d + depth) / 2;
            const _xh = x + i * (cls.squareWidth + d) + cls.squareWidth + (d + depth) / 2;

            text = cls.getPaper().text(x, _yv, me.intToInt(i));
            text.attr('fill', 'white');
            text.attr('font-size', smallFontSize);

            text = cls.getPaper().text(x + w + depth - d, _yv, me.intToInt(i));
            text.attr('fill', 'black');
            text.attr('font-size', smallFontSize);

            text = cls.getPaper().text(_xh, y, me.intToChar(i));
            text.attr('fill', 'black');
            text.attr('font-size', smallFontSize);

            text = cls.getPaper().text(_xh, y + h + depth - d, me.intToChar(i));
            text.attr('fill', 'black');
            text.attr('font-size', smallFontSize);
        });
    }

    drawBorders() {
        const me = this.model;
        const cls = ViewOptions,
            depth = cls.borderDepth,
            d = cls.squareDistance,
            w = me.get('boardSize') * (d + cls.squareWidth) - d + depth,
            h = me.get('boardSize') * (d + cls.squareHeight) - d,
            x = cls.startX,
            y = cls.startY;

        const p = cls.getPaper();
        const borderLeft = p.rect(x, y + depth, depth, h);
        const borderRight = p.rect(x + w, y + depth, depth, h);
        const borderTop = p.rect(x, y, w + depth, depth);
        const borderBottom = p.rect(x, y + h + depth, w + depth, depth);

        const defColor = '#c75';
        const positions = me.players.playersPositions;
        if (me.get('playersCount') === 2) {
            borderTop.attr('fill', positions[1]!.color);
            borderRight.attr('fill', defColor);
            borderBottom.attr('fill', positions[0]!.color);
            borderLeft.attr('fill', defColor);
        } else if (me.get('playersCount') === 4) {
            borderTop.attr('fill', positions[2]!.color);
            borderRight.attr('fill', positions[3]!.color);
            borderBottom.attr('fill', positions[0]!.color);
            borderLeft.attr('fill', positions[1]!.color);
        }

        this.renderLegend();
    }

    afterRender() {
        const me = this.model;

        me.fields.each((model) => {
            new FieldView({ model: model });
        });
        me.fences.each((model) => {
            createFenceView(model);
        });
        me.players.each((model) => {
            new PlayerView({model: model});
        });
        this.drawBorders();
        const info = new InfoView({
            model: me.infoModel,
            attributes: me.players.playersPositions
        });
        new TimerView({
            model: me.timerModel
        });
        new GameHistoryView({
            model: me.history
        });

        info.on('click', _.bind(this.move, this));
    }
}