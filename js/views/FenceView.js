var FenceView = GameObject.extend({
    events         : {
        'click'    : 'onClick',
        'mouseover': 'selectCurrent',
        'mouseout' : 'unSelectCurrent'
    },
    selectCurrent  : function () {
        this.model.selectCurrent();
    },
    unSelectCurrent: function() {
        this.model.unSelect();
    },
    onClick        : function (evt) {
        this.model.set('color', 'green');
        this.model.set('prevcolor', 'green');
        this.model.trigger('selected', this.model);
    },
    render         : function () {
        var circle = this.el;
        var model = this.model;

        circle.attr({
            fill: model.get('color')
        });
    }

});

var FenceHView = FenceView.extend({

    initialize: function () {
        var cls = this.constructor;
        var model = this.model;
        this.listenTo(model, 'change', this.render);

        var i = model.get('x'), j = model.get('y'), color = model.get('color');

        var w = cls.squareWidth,
            h = cls.squareDistance,
            dh = cls.squareHeight,
            dw = cls.squareDistance;
        var x = (w + dw) * i + 10 - (dw/2);
        var y = (h + dh) * j + 10 + dh;
        var obj = cls.getPaper().rect(x, y, w + dw, h);
        obj.attr('fill', color);

        this.setElement(obj);
    }
});

var FenceVView = FenceView.extend({

    initialize: function () {
        var cls = this.constructor;
        var model = this.model;
        this.listenTo(model, 'change', this.render);

        var i = model.get('x'), j = model.get('y'),
            color = model.get('color');

        var w = cls.squareDistance,
            h = cls.squareHeight,
            dh = cls.squareDistance,
            dw = cls.squareWidth;
        var x = (w + dw) * i + 10 + dw;
        var y = (h + dh) * j + 10 - dh / 2;
        var obj = cls.getPaper().rect(x, y, w, h + dh);
        obj.attr('fill', color);

        this.setElement(obj);
    }
});