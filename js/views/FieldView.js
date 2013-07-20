var FieldView = GameObject.extend({

    initialize: function () {
        var cls = this.constructor;
        var model = this.model;

        this.listenTo(model, 'change', this.render);
        var w = cls.squareWidth,
            h = cls.squareHeight,
            d = cls.squareDistance,
            color = model.get('color');
        var i = model.get('x'), j = model.get('y');
        var x = (w + d) * i + 10;
        var y = (h + d) * j + 10;
        var obj = cls.getPaper().rect(x, y, w, h);
        obj.attr('fill', color);

        this.setElement(obj);
    },

    events: {
        'click'    : 'movePlayer',
        'mouseover': 'onSelectField',
        'mouseout' : 'unSelectCurrent'
    },

    movePlayer     : function (evt) {
        this.model.trigger('moveplayer', this.model.get('x'), this.model.get('y'));
    },
    onSelectField: function() {
        this.model.trigger('selectfield', this.model.get('x'), this.model.get('y'));
    },
    unSelectCurrent: function () {
        this.model.unSelect();
    },

    render: function () {
        var circle = this.el;
        var model = this.model;

        circle.attr({
            fill: model.get('color')
        });
    }

});