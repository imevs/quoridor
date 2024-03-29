import _ from "underscore";

import { GameObject, ViewOptions } from "./GameObject";
import { RaphaelEl } from "./backbone.raphael";
import { InfoModel } from "../models/BoardModel";

export class InfoView extends GameObject {
    fences!: Required<RaphaelEl>[];
    private current!: [Required<RaphaelEl>, Required<RaphaelEl>] | undefined;
    private active: [Required<RaphaelEl>, Required<RaphaelEl>] | undefined;
    playersPositions!: ({ color: string; })[];
    model!: InfoModel;

    initialize(params: { model: InfoModel }) {
        const me = this;
        me.fences = [];
        me.playersPositions = params.model.get("playersPositions");
        this.$el = $('#game-info');
        me.template = document.querySelector("#game-info-tmpl")?.innerHTML ?? "";
        me.listenTo(me.model, 'change', me.render);
    }
    render() {
        const me = this;
        me.$el.html(_.template(me.template, { variable: 'data' })(me.model.toJSON()));
        me.$el.find('.move').click(() => {
            me.trigger('click');
        });
        this.clearFences();
        this.drawRemainingFences();
        if (this.model.get("showCurrent")) {
            this.displayCurrentPlayer();
        }
        this.displayActivePlayer();
        return this;
    }

    drawRemainingFences() {
        const me = this,
            cls = ViewOptions,
            w = cls.squareDistance,
            h = cls.squareHeight,
            fences = me.model.get('fences'),
            playersCount = fences ? fences.length : 0,
            y0 = cls.startY - w - cls.squareHeight,
            x0 = cls.startX - w + cls.borderDepth,
            boardSize = 9,
            fenceCountPerPlayer = 5,
            boardHeight = (cls.squareHeight + cls.squareDistance) * boardSize + 2 * cls.borderDepth,
            boardWidth = (cls.squareWidth + cls.squareDistance) * fenceCountPerPlayer;

        _(me.model.get('fences')).each((fenceCount, index) => {
            let x = x0, y = y0;
            if (playersCount === 2 && index === 1 || playersCount === 4 && index > 1) {
                y += boardHeight + h + w;
            }
            if (playersCount === 4 && (index === 1 || index === 2)) {
                x += boardWidth;
            }

            _(fenceCount).times((i) => {
                const dx = i * (cls.squareWidth + cls.squareDistance);

                const obj = cls.getPaper().rect(x + dx, y, w, h);
                obj.attr('fill', me.playersPositions[index]!.color);
                obj.attr('stroke-width', 1);
                me.fences.push(obj);
            });

        });
    }

    clearFences() {
        while (this.fences.length) {
            const f = this.fences.pop()!;
            f.remove();
        }
    }

    displayActivePlayer() {
        const cls = ViewOptions;
        if (this.active) {
            this.active[0].remove();
            this.active[1].remove();
        }
        const active = this.model.get('activePlayer');
        if (active !== undefined) {
            this.active = this.displayPlayer(active, cls.squareWidth * 4, 70, 'Active');
        }
    }

    displayCurrentPlayer() {
        const cls = ViewOptions;
        if (this.current) {
            this.current[0].remove();
            this.current[1].remove();
        }
        const current = this.model.get('currentPlayer');
        if (current !== undefined) {
            this.current = this.displayPlayer(current, cls.squareWidth, 70, 'You');
        }
    }

    displayPlayer(index: number, dx: number, dy: number, text: string): [Required<RaphaelEl>, Required<RaphaelEl>] | undefined {
        dx += 70;
        if (_.isUndefined(index) || index < 0) {
            return;
        }
        const me = this,
            cls = ViewOptions,
            color = me.playersPositions[index]!.color,
            w = cls.squareWidth,
            h = cls.squareHeight,
            x = cls.startX + dx,
            y = cls.startY - dy;

        const textObj = cls.getPaper().text(x - 70, y, text + ' -');
        textObj.attr('fill', 'black');
        textObj.attr('font-size', 20);

        const obj = cls.getPaper().ellipse(x, y, w / 2, h / 2);
        obj.attr('fill', color);
        return [obj, textObj];
    }
}