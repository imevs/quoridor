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
    }
});

var Info = Backbone.View.extend({

    templateId: '#info-tmpl',

    initialize: function() {
        this.template = $(this.templateId).html();
        this.listenTo(this.model, "change", this.render);
    },

    render: function() {
        this.$el.html(_.template(this.template, this.model.attributes,  {variable: 'data'}));
    }
});

var BoardView = Backbone.RaphaelView.extend({
    el: 'holder',

    fences          : new FencesCollection(),
    fields          : new FieldsCollection(),
    players         : new PlayersCollection(),
    infoModel       : new Backbone.Model(),
    boardSize       : 9,
    playersCount    : 4,

    initModels   : function () {
        var me = this, boardSize = this.boardSize;

        _([boardSize, boardSize]).iter(function (i, j) {
            me.fields.add(new FieldModel({x: i, y: j, color: '#f00'}));
        });
        _([boardSize, boardSize - 1]).iter(function (i, j) {
            me.fences.add(new FenceHModel({x: i, y: j, color: 'blue'}));
        });
        _([boardSize - 1, boardSize]).iter(function (i, j) {
            me.fences.add(new FenceVModel({x: i, y: j, color: 'blue'}));
        });
        this.players.createPlayers(this.playersCount);
    },
    initViews : function () {
        var me = this;
        me.fields.each(function (model) {
            new FieldView({model: model});
        });
        me.fences.each(function (model) {
            model instanceof FenceHModel
                ? new FenceHView({model: model}) : new FenceVView({model: model});
        });
        this.players.each(function (model) {
            new PlayerView({model: model})
        });
        var info = new Info({
            el   : $("#game-info"),
            model: this.infoModel
        });
    },
    initEvents: function () {
        var me = this;

        this.fields.on('moveplayer', function (x, y) {
            me.players.getCurrentPlayer().moveTo(x, y);
            me.players.switchPlayer();
        });
        this.fields.on('selectfield', function (x, y) {
            var current = me.players.getCurrentPlayer();
            if (current.isValidPosition(x, y)) {
                this.trigger('valid_position', x, y);
            }
        });
        this.players.on('change switchplayer', function() {
            me.infoModel.set({
                currentplayer: this.currentPlayer + 1,
                fences: this.pluck('fencesRemaining')
            });
        });
        this.fences.on('selected', function(fence) {
            if (me.players.getCurrentPlayer().hasFences()) {
                me.players.getCurrentPlayer().placeFence();
                me.players.switchPlayer();
            }
        });
    },
    run: function() {
        this.players.switchPlayer(1);
    },
    initialize: function () {
        this.initEvents();
        this.initModels();
        this.initViews();
        this.run();
    }
});