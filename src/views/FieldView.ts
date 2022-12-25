import { GameObject, ViewOptions } from "../views/GameObject";
import { FieldModel } from "../models/FieldModel";
import { RaphaelEl } from "../views/backbone.raphael";

export class FieldView extends GameObject<FieldModel> {

    public defaults() { return {
        color: '#742'
    }; }
    // @ts-ignore
    model: FieldModel;

    defaultColor = "";

    events = () => ({
        'click'      : 'movePlayer',
        'mouseover'  : 'onSelectFieldBefore',
        'mouseout'   : 'unSelectCurrent'
    });

    initialize(options: { attributes?: { defaultColor?: string; } }) {
        const cls = ViewOptions;
        const model = this.model!;
        this.defaultColor = options.attributes?.defaultColor || this.defaults().color;
        model.set('color', this.defaultColor);

        this.listenTo(model, 'change', this.render);
        this.listenTo(model, 'selectfield', this.selectCurrent);
        this.listenTo(model, 'markfield', this.markCurrent);

        const w = cls.squareWidth,
            h = cls.squareHeight,
            d = cls.squareDistance,
            color = model.get('color');
        const i = model.get('x'), j = model.get('y');
        const x = (w + d) * i + cls.startX + cls.borderDepth;
        const y = (h + d) * j + cls.startY + cls.borderDepth;
        const obj = cls.getPaper().rect(x, y, w, h);
        obj.attr('fill', color);
        obj.attr('stroke-width', 0);
        this.setElement(obj);
    }

    selectCurrent  () {
        this.model.set({color: 'black'});
    }

    markCurrent  () {
        this.model.set({color: 'gray'});
    }

    unSelectCurrent() {
        this.model.set({color: this.defaultColor});
    }

    movePlayer     () {
        this.model.trigger('moveplayer',
            this.model.get('x'), this.model.get('y'));
        this.unSelectCurrent();
    }
    onSelectFieldBefore() {
        this.model.trigger('beforeselectfield',
            this.model.get('x'), this.model.get('y'));
    }
    render() {
        const circle = this.el as Required<RaphaelEl>;
        const model = this.model;

        circle.attr({
            fill: model.get('color')
        });
        return this;
    }

}