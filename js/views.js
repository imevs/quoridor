var FieldModel = Backbone.Model.extend();

var GameObject = Backbone.RaphaelView.extend({}, {
    squareWidth: 50,
    squareHeight: 30,
    squareDistance: 10,
    getPaper: function() {
        return GameObject.paper || (GameObject.paper = Raphael('holder', 600, 600));
    }
});

var FieldView = GameObject.extend({

    initialize: function(){
        var cls = this.constructor;
        var model = this.model;

        this.listenTo(model, "change", this.render);
        var w = cls.squareWidth,
            h = cls.squareHeight,
            d = cls.squareDistance;
        var i = model.get("x"), j = model.get("y");
        var x = (w + d) * i + 10;
        var y = (h + d) * j + 10;
        var obj = cls.getPaper().rect(x, y, w, h);
        obj.attr("fill", "#f00");

        this.setElement(obj);
    },

    events: {
        "click": "sayType"
    },

    sayType: function(evt){
        this.model.set('color', 'green');
    },

    render: function(){
        var circle = this.el;
        var model = this.model;

        circle.attr({
            fill: model.get("color")
        });
    }

});

var FenceHView = GameObject.extend({

    initialize: function(){
        var cls = this.constructor;
        var model = this.model;
        this.listenTo(model, "change", this.render);

        var i = model.get("x"), j = model.get("y");

        var w = cls.squareWidth,
            h = cls.squareDistance,
            dh = cls.squareHeight,
            dw = cls.squareDistance;
        var x = (w + dw) * i + 10;
        var y = (h + dh) * j + 10 + dh;
        var obj = cls.getPaper().rect(x, y, w, h);
        obj.attr("fill", "blue");

        this.setElement(obj);
    },

    events: {
        "click": "sayType"
    },

    sayType: function(evt){
        this.model.set('color', 'green');
    },

    render: function(){
        var circle = this.el;
        var model = this.model;

        circle.attr({
            fill: model.get("color")
        });
    }

});

var FenceVView = GameObject.extend({

    initialize: function(){
        var cls = this.constructor;
        var model = this.model;
        this.listenTo(model, "change", this.render);

        var i = model.get("x"), j = model.get("y");

        var w = cls.squareDistance,
            h = cls.squareHeight,
            dh = cls.squareDistance,
            dw = cls.squareWidth;
        var x = (w + dw) * i + 10 + dw;
        var y = (h + dh) * j + 10;
        var obj = cls.getPaper().rect(x, y, w, h);
        obj.attr("fill", "blue");

        this.setElement(obj);
    },

    events: {
        "click": "sayType"
    },

    sayType: function(evt){
        this.model.set('color', 'green');
    },

    render: function(){
        var circle = this.el;
        var model = this.model;

        circle.attr({
            fill: model.get("color")
        });
    }

});

var PlayerView = GameObject.extend({

    initialize: function(){
        var cls = this.constructor;
        var model = this.model;
        this.listenTo(model, "change", this.render);

        var i = model.get("x"), j = model.get("y"), color = model.get("c");

        var w = cls.squareWidth,
            h = cls.squareHeight,
            d = cls.squareDistance;
        var x = (w + d) * i + 10 + w / 2;
        var y = (h + d) * j + 10 + h / 2;
        var obj = cls.getPaper().ellipse(x, y,
            (w - 10) / 2, (h - 10) / 2 );
        obj.attr("fill", color);

        this.setElement(obj);
    },

    events: {
        "click": "sayType"
    },

    sayType: function(evt){
        this.model.set('color', 'green');
    },

    render: function(){
        var circle = this.el;
        var model = this.model;

        circle.attr({
            fill: model.get("color")
        });
    }

});

var BoardView = Backbone.RaphaelView.extend({
    el: 'holder',

    initialize: function() {
        _([9, 9]).iter(function(i, j) {
            var model = new FieldModel({x: i, y: j});
            var view = new FieldView({model: model});
        });

        _([9, 8]).iter(function(i, j) {
            var model = new FieldModel({x: i, y: j});
            var view = new FenceHView({model: model});
        });

        _([8, 9]).iter(function(i, j) {
            var model = new FieldModel({x: i, y: j});
            var view = new FenceVView({model: model});
        });
    }
});
