/* global GameObject, FenceHModel */
import { GameObject, ViewOptions } from "public/views/GameObject";
import { FenceHModel, FenceVModel } from "public/models/FenceModel";
import { RaphaelEl } from "public/views/backbone.raphael";

export class FenceView extends GameObject {
    events = () => ({
        'click'    : 'onClick',
        'mouseover': 'highlightCurrentAndSibling',
        'mouseout' : 'resetCurrentAndSibling'
    });
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

        var obj = this.createElement();
        if (obj) {
            this.setElement(obj);
        }
    }
    render                    () {
        var circle = this.el as Required<RaphaelEl>;
        var model = this.model;

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

export function createFenceView(model: FenceHModel | FenceVModel): FenceHView | FenceVView {
    return model instanceof FenceHModel
        ? new FenceHView({model: model})
        : new FenceVView({model: model});
}

export class FenceHView extends FenceView {

    createElement() {
        var cls = ViewOptions;
        var w = cls.squareWidth,
            h = cls.squareDistance,
            dh = cls.squareHeight,
            dw = cls.squareDistance;

        var i = this.model.get('x'),
            j = this.model.get('y'),
            color = this.model.get('color');

        var x = (w + dw) * i + cls.startX - dw / 2 + cls.borderDepth;
        var y = (h + dh) * j + cls.startY + dh + cls.borderDepth;
        var obj = cls.getPaper().rect(x, y, w + dw + 1, h);
        obj.attr('fill', color);
        obj.attr('stroke-width', 0);
        return obj;
    }
}

export class FenceVView extends FenceView {

    createElement() {
        var cls = ViewOptions;
        var model = this.model;

        var i = model.get('x'), j = model.get('y'),
            color = model.get('color');

        var w = cls.squareDistance,
            h = cls.squareHeight,
            dh = cls.squareDistance,
            dw = cls.squareWidth;
        var x = (w + dw) * i + cls.startX + dw + cls.borderDepth;
        var y = (h + dh) * j + cls.startY - dh / 2 + cls.borderDepth;
        var obj = cls.getPaper().rect(x, y, w, h + dh + 1);
        obj.attr('fill', color);
        obj.attr('stroke-width', 0);
        return obj;
    }
}