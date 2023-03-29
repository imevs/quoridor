import { GameObject, ViewOptions } from "./GameObject";
import { FenceModel } from "../models/FenceModel";
import { RaphaelEl } from "./backbone.raphael";

export class FenceView extends GameObject {

    model!: FenceModel;

    events() { return {
        click    : this.onClick,
        mouseover: this.highlightCurrentAndSibling,
        mouseout : this.resetCurrentAndSibling,
    }; }
    onClick                   () {
        this.model.trigger('selected', this.model);
    }
    highlightCurrentAndSibling() {
        this.model.trigger('highlight_current_and_sibling', this.model);
    }
    resetCurrentAndSibling    () {
        this.model.trigger('reset_current_and_sibling', this.model);
    }
    initialize                () {
        this.model.on({
            'change:color'  : this.render
        }, this);

        const obj = this.createElement();
        if (obj) {
            this.setElement(obj);
        }
    }
    render                    () {
        const circle = this.el as Required<RaphaelEl>;
        const model = this.model;

        if (model.get('state') === 'prebusy') {
            circle.toFront();
        }
        if (model.get('state') === '') {
            circle.toBack();
        }
        if (model.get('state') === 'highlight') {
            circle.toFront();
        }
        circle.attr({fill: model.get('color')});
        return this;
    }

    createElement(): null | RaphaelEl { return null; }
}

export function createFenceView(model: FenceModel): FenceHView | FenceVView {
    return model.get("orientation") === "H"
        ? new FenceHView({model: model})
        : new FenceVView({model: model});
}

export class FenceHView extends FenceView {

    createElement() {
        const cls = ViewOptions;
        const w = cls.squareWidth,
            h = cls.squareDistance,
            dh = cls.squareHeight,
            dw = cls.squareDistance;

        const i = this.model.get('x'),
            j = this.model.get('y'),
            color = this.model.get('color');

        const x = (w + dw) * i + cls.startX - dw / 2 + cls.borderDepth;
        const y = (h + dh) * j + cls.startY + dh + cls.borderDepth;
        const obj = cls.getPaper().rect(x, y, w + dw + 1, h);
        obj.attr('fill', color);
        obj.attr('stroke-width', 0);
        return obj;
    }
}

export class FenceVView extends FenceView {

    createElement() {
        const cls = ViewOptions;
        const model = this.model;

        const i = model.get('x'), j = model.get('y'),
            color = model.get('color');

        const w = cls.squareDistance,
            h = cls.squareHeight,
            dh = cls.squareDistance,
            dw = cls.squareWidth;
        const x = (w + dw) * i + cls.startX + dw + cls.borderDepth;
        const y = (h + dh) * j + cls.startY - dh / 2 + cls.borderDepth;
        const obj = cls.getPaper().rect(x, y, w, h + dh + 1);
        obj.attr('fill', color);
        obj.attr('stroke-width', 0);
        return obj;
    }
}