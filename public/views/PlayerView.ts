import { GameObject, ViewOptions } from "public/views/GameObject";

export class PlayerView extends GameObject {

    initialize() {
        var cls = ViewOptions;
        var model = this.model;
        this.listenTo(model, 'change', this.render);
        this.listenTo(model, 'resetstate', this.resetState);
        this.listenTo(model, 'setcurrent', this.markAsCurrent);

        var color = model.get('color'),
            w = cls.squareWidth,
            h = cls.squareHeight,
            x = this.getPosX(model.get('x')),
            y = this.getPosY(model.get('y'));

        var obj = cls.getPaper().ellipse(x, y,
            (w - 10) / 2, (h - 10) / 2);
        obj.attr('fill', color);

        this.setElement(obj);
    }

    markAsCurrent() {
        this.el.attr?.({'stroke-width': 3});
    }

    resetState() {
        this.el.attr?.({'stroke-width': 1});
    }

    getPosX(x: number) {
        var cls = ViewOptions,
            w = cls.squareWidth,
            d = cls.squareDistance;
        return (w + d) * x + cls.startX + w / 2 + cls.borderDepth;
    }

    getPosY(y: number) {
        var cls = ViewOptions,
            h = cls.squareHeight,
            d = cls.squareDistance;
        return (h + d) * y + cls.startY + h / 2 + cls.borderDepth;
    }

    render() {
        this.el.attr?.({
            fill: this.model.get('color'),
            cx  : this.getPosX(this.model.get('x')),
            cy  : this.getPosY(this.model.get('y'))
        });
        return this;
    }
}