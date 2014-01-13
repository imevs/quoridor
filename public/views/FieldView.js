/* global GameObject */
window.FieldView = GameObject.extend({

    defaults: {
        color: '#742'
    },

    events: {
        'click'      : 'movePlayer',
        'mouseover'  : 'onSelectFieldBefore',
        'mouseout'   : 'unSelectCurrent'
    },

    initialize: function (options) {
        var cls = this.constructor;
        var model = this.model;
        this.defaultColor = options.defaultColor || this.defaults.color;
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
    },

    selectCurrent  : function () {
        this.model.set({color: 'black'});
    },

    markCurrent  : function () {
        this.model.set({color: 'gray'});
    },

    unSelectCurrent: function () {
        this.model.set({color: this.defaultColor});
    },

    movePlayer     : function () {
        this.model.trigger('moveplayer',
            this.model.get('x'), this.model.get('y'));
        this.unSelectCurrent();
    },
    onSelectFieldBefore: function () {
        this.model.trigger('beforeselectfield',
            this.model.get('x'), this.model.get('y'));
    },
    render: function () {
        var circle = this.el;
        var model = this.model;

        circle.attr({
            fill: model.get('color')
        });
    }

});