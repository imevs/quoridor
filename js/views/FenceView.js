var FenceView = GameObject.extend({
    events                    : {
        'click'    : 'onClick',
        'mouseover': 'highlightCurrentAndSibling',
        'mouseout' : 'resetCurrentAndSibling'
    },
    onClick                   : function (evt) {
        this.model.trigger('selected', this.model);
    },
    highlightCurrentAndSibling: function () {
        this.model.trigger('highlight_current_and_sibling', this.model);
    },
    resetCurrentAndSibling    : function () {
        this.model.trigger('reset_current_and_sibling', this.model);
    },
    initialize                : function () {
        this.model.on({
            'change'        : this.render,
            'markasselected': this.markAsSelected,
            'highlight'     : this.selectCurrent,
            'dehighlight'   : this.unSelectCurrent
        }, this);

        var obj = this.createElement && this.createElement();
        this.setElement(obj);
    },
    markAsSelected            : function () {
        this.model.set('state', 'busy');
        this.model.set('color', 'black');
        this.model.set('prevcolor', 'black');
        this.el.toFront();
    },
    render                    : function () {
        var circle = this.el;
        var model = this.model;
        circle.attr({
            fill: model.get('color')
        });
    }
});

var FenceHView = FenceView.extend({

    createElement: function () {
        var cls = this.constructor;
        var w = cls.squareWidth,
            h = cls.squareDistance,
            dh = cls.squareHeight,
            dw = cls.squareDistance;

        var i = this.model.get('x'),
            j = this.model.get('y'),
            color = this.model.get('color');

        var x = (w + dw) * i + 10 - dw / 2;
        var y = (h + dh) * j + 10 + dh;
        var obj = cls.getPaper().rect(x, y, w + dw + 1, h);
        obj.attr('fill', color);
        obj.attr('stroke-width', 0);
/*
        var value = this.model.get('x') + '-' + this.model.get('y');
        var text = cls.getPaper().text(x + 30, y + 5, value);
        text.attr('fill', 'white');
*/
        return obj;
    }
});

var FenceVView = FenceView.extend({

    createElement: function () {
        var cls = this.constructor;
        var model = this.model;

        var i = model.get('x'), j = model.get('y'),
            color = model.get('color');

        var w = cls.squareDistance,
            h = cls.squareHeight,
            dh = cls.squareDistance,
            dw = cls.squareWidth;
        var x = (w + dw) * i + 10 + dw;
        var y = (h + dh) * j + 10 - dh / 2;
        var obj = cls.getPaper().rect(x, y, w, h + dh + 1);
        obj.attr('fill', color);
        obj.attr('stroke-width', 0);
/*
        var value = this.model.get('x') + '-' + this.model.get('y');
        var text = cls.getPaper().text(x + 5, y + 20, value);
        text.attr('fill', 'white');
*/
        return obj;
    }
});