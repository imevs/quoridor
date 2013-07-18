var FieldModel = Backbone.Model.extend({
    selectCurrent: function() {
        this.set({
            prevcolor: this.get('color'),
            color: 'black'
        });
    },
    unSelect: function() {
        if (this.get('prevcolor')) {
            this.set({
                prevcolor: '',
                color: this.get('prevcolor')
            });
        }
    }
});

var PlayerModel = Backbone.Model.extend({

    isValidPosition: function (x, y) {
        var prevX = this.get('x'),
            prevY = this.get('y');
        return Math.abs(prevX - x) == 1 && prevY == y
            || Math.abs(prevY - y) == 1 && prevX == x;
    },

    moveTo: function (x, y) {
        if (this.isValidPosition(x, y)) {
            this.set({x: x, y: y});
        }
    }

});

var FieldsCollection = Backbone.Collection.extend({
    initialize: function() {
        this.on('valid_position', this.selectField);
    },
    selectField: function(x, y) {
        var field = this.findWhere({x: x, y: y});
        field.selectCurrent();
    }
});

var FencesCollection = Backbone.Collection.extend({
    initialize: function() {
        this.on('add', this.onAdd);
    },
    onAdd: function(item) {
        item.on('selected', _.bind(this.onSelectItem, this));
    },
    onSelectItem: function(item) {
        var sibling = this.getAdjacentFence(item);
        sibling && sibling.set('color', 'green');
    },
    getAdjacentFence: function(current) {
        return null;
    }
});

var HorizontalFencesCollection = FencesCollection.extend({
    getAdjacentFence: function(current) {
        return this.findWhere({
            x: current.get('x') - 1,
            y: current.get('y')
        });
    }
});

var VerticalFencesCollection = FencesCollection.extend({
    getAdjacentFence: function(current) {
        return this.findWhere({
            x: current.get('x'),
            y: current.get('y') - 1
        });
    }
});

var PlayersCollection = Backbone.Collection.extend({
    currentPlayer: 0,

    getCurrentPlayer: function() {
        return this.at(this.currentPlayer);
    },

    switchPlayer: function() {
        var c = this.currentPlayer + 1;
        this.currentPlayer = c < this.length ? c : 0;
        this.trigger('switchplayer', this.currentPlayer);
    }
});