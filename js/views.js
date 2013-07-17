var GameObject = Backbone.RaphaelView.extend({}, {
    squareWidth   : 50,
    squareHeight  : 30,
    squareDistance: 10,
    getPaper      : function () {
        return GameObject.paper || (GameObject.paper = Raphael('holder', 600, 600));
    }
});

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
        var x = (w + dw) * i + 10;
        var y = (h + dh) * j + 10 + dh;
        var obj = cls.getPaper().rect(x, y, w, h);
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
        var y = (h + dh) * j + 10;
        var obj = cls.getPaper().rect(x, y, w, h);
        obj.attr('fill', color);

        this.setElement(obj);
    }
});

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
    },

    isValidPosition: function (x, y) {
        var prevX = this.model.get('x'),
            prevY = this.model.get('y');
        return Math.abs(prevX - x) == 1 && prevY == y
            || Math.abs(prevY - y) == 1 && prevX == x;
    },

    moveTo: function (x, y) {
        if (this.isValidPosition(x, y)) {
            this.model.set({x: x, y: y});
        }
    }

});

var BoardView = Backbone.RaphaelView.extend({
    el: 'holder',

    verticalFences  : new VerticalFencesCollection(),
    horizontalFences: new HorizontalFencesCollection(),
    fields          : new FieldsCollection(),
    players         : new PlayersCollection(),

    initialize: function () {

        var model, view, me = this;
        _([9, 9]).iter(function (i, j) {
            model = new FieldModel({x: i, y: j, color: '#f00'});
            view = new FieldView({model: model});
            me.fields.add(model);
        });

        _([9, 8]).iter(function (i, j) {
            model = new FieldModel({x: i, y: j, color: 'blue'});
            view = new FenceHView({model: model});
            me.horizontalFences.add(model);
        });

        _([8, 9]).iter(function (i, j) {
            model = new FieldModel({x: i, y: j, color: 'blue'});
            view = new FenceVView({model: model});
            me.verticalFences.add(model);
        });

        var model1 = new FieldModel({x: 4, y: 0, color: 'black'});
        var view1 = new PlayerView({model: model1});

        var model2 = new FieldModel({x: 4, y: 8, color: 'white'});
        var view2 = new PlayerView({model: model2});

        this.fields.on('moveplayer', function (x, y) {
            view1.moveTo(x, y);
        });

        this.fields.on('selectfield', function (x, y) {
            if (view1.isValidPosition(x, y)) {
                this.trigger('valid_position', x, y);
            }
        });

        this.players.add(model1);
        this.players.add(model2);
    }
});