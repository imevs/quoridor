var PlayerView = GameObject.extend({

    initialize: function () {
        var cls = this.constructor;
        var model = this.model;
        this.listenTo(model, 'change', this.render);

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

    getPosX: function (x) {
        var cls = this.constructor,
            w = cls.squareWidth,
            d = cls.squareDistance;
        return (w + d) * x + 10 + w / 2;
    },

    getPosY: function (y) {
        var cls = this.constructor,
            h = cls.squareHeight,
            d = cls.squareDistance;
        return (h + d) * y + 10 + h / 2;
    },

    events: {
        'click': 'sayType'
    },

    sayType: function (evt) {
        this.model.set('color', 'green');
    },

    render: function () {
        var circle = this.el;
        var model = this.model;

        circle.attr({
            fill: model.get('color'),
            cx  : this.getPosX(model.get('x')),
            cy  : this.getPosY(model.get('y'))
        });
    }
});