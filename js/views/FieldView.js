var FieldView = GameObject.extend({

    defaults: {
        color: '#742'
    },

    initialize: function () {
        var cls = this.constructor;
        var model = this.model;
        model.set('color', this.defaults.color);

        this.listenTo(model, 'change', this.render);
        this.listenTo(model, 'selectfield', this.selectCurrent);
        this.listenTo(model, 'markfield', this.markCurrent);
        var w = cls.squareWidth,
            h = cls.squareHeight,
            d = cls.squareDistance,
            color = model.get('color');
        var i = model.get('x'), j = model.get('y');
        var x = (w + d) * i + 10;
        var y = (h + d) * j + 10;
        var obj = cls.getPaper().rect(x, y, w, h);
        obj.attr('fill', color);
        obj.attr('stroke-width', 0);

/*
        var value = this.model.get('x') + '-' + this.model.get('y');
        var text = cls.getPaper().text(x + 25, y + 15, value);
        text.attr('fill', 'white');
*/
        this.setElement(obj);
    },

    selectCurrent  : function () {
        this.model.set({color: 'black'});
        this.el.toFront();
    },

    markCurrent  : function () {
        this.model.set({color: 'gray'});
        this.el.toFront();
    },

    unSelectCurrent: function() {
        this.model.set({color: this.defaults.color});
        this.el.toBack();
    },

    events: {
        'click'      : 'movePlayer',
        'mouseover'  : 'onSelectFieldBefore',
        'mouseout'   : 'unSelectCurrent'
    },

    movePlayer     : function (evt) {
        this.model.trigger('moveplayer',
            this.model.get('x'), this.model.get('y'));
    },
    onSelectFieldBefore: function() {
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