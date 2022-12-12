import { GameObject, ViewOptions } from "public/views/GameObject";
import { FieldModel } from "public/models/FieldModel";
import { RaphaelEl } from "public/views/backbone.raphael";

export class FieldView extends GameObject<FieldModel> {

    defaults = {
        color: '#742'
    };
    // @ts-ignore
    model: FieldModel;

    defaultColor = "";

    events = () => ({
        'click'      : 'movePlayer',
        'mouseover'  : 'onSelectFieldBefore',
        'mouseout'   : 'unSelectCurrent'
    });

    initialize(options: { attributes: { defaultColor?: string; } }) {
        var cls = ViewOptions;
        var model = this.model!;
        this.defaultColor = options.attributes.defaultColor || this.defaults.color;
        model.set('color', this.defaultColor);

        this.listenTo(model, 'change', this.render);
        this.listenTo(model, 'selectfield', this.selectCurrent);
        this.listenTo(model, 'markfield', this.markCurrent);

        var w = cls.squareWidth,
            h = cls.squareHeight,
            d = cls.squareDistance,
            color = model.get('color');
        var i = model.get('x'), j = model.get('y');
        var x = (w + d) * i + cls.startX + cls.borderDepth;
        var y = (h + d) * j + cls.startY + cls.borderDepth;
        var obj = cls.getPaper().rect(x, y, w, h);
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
        var circle = this.el as Required<RaphaelEl>;
        var model = this.model;

        circle.attr({
            fill: model.get('color')
        });
        return this;
    }

}