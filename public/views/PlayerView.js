var PlayerView = GameObject.extend({

    initialize: function () {
        var cls = this.constructor;
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
    },

    markAsCurrent: function() {
        this.el.attr({'stroke-width': 3});
    },

    resetState: function() {
        this.el.attr({'stroke-width': 1});
    },

    getPosX: function (x) {
        var cls = this.constructor,
            w = cls.squareWidth,
            d = cls.squareDistance;
        return (w + d) * x + cls.startX + w / 2;
    },

    getPosY: function (y) {
        var cls = this.constructor,
            h = cls.squareHeight,
            d = cls.squareDistance;
        return (h + d) * y + cls.startY + h / 2;
    },

    render: function () {
        this.el.attr({
            fill: this.model.get('color'),
            cx  : this.getPosX(this.model.get('x')),
            cy  : this.getPosY(this.model.get('y'))
        });
    }
});