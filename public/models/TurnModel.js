if (module) {
    var Backbone = require('backbone');
    var _ = require('underscore');
}

var TurnModel = Backbone.Model.extend({
    defaults: {
        player: '',
        x: '',
        y: '',
        x2: '',
        y2: '',
        type: ''
    },
    alpha: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k'],

    intToChar: function(i) {
        return this.alpha[i];
    },

    getX: function(x) {
        return this.intToChar(x);
    },

    getY: function(y) {
        return this.get('boardSize') - y;
    },

    toString: function() {
        return this.get('type') == 'player'
            ? this.getX(this.get('x')) + this.getY(this.get('y')) + ''
            : this.getX(this.get('x')) + this.getY(this.get('y')) +
                this.getX(this.get('x2')) + this.getY(this.get('y2')) + '';
    }

});

var TurnsCollection = Backbone.Collection.extend({

    model: TurnModel,

    initialize: function() {

    }
});

var GameHistoryModel = Backbone.Model.extend({

    add: function(turnInfo) {
        turnInfo['boardSize'] = this.get('boardSize');
        var turn = new TurnModel(turnInfo);
        this.get('turns').add(turn);

        this.trigger('change');
    },

    at: function(index) {
        var turnsLength = this.get('turns').length / this.get('playersCount');
        if (index > turnsLength) return 'error';

        var self = this;

        var result = [];
        var startIndex = index * this.get('playersCount');
        var turns = this.get('turns').filter(function (value, index) {
            return index >= startIndex && index < startIndex + self.get('playersCount')
        });
        _(turns).each(function(value, i) {
            result.push(value + '');
        });
        return result.join(' ');
    },

    getLength: function() {
        return Math.ceil(this.get('turns').length / this.get('playersCount'));
    },

    initialize: function(params) {
        params = params || {};
        this.set('boardSize', params.boardSize || 9);
        this.set('playersCount', params.playersCount || 2);
        this.set('turns', new TurnsCollection());
    }
});

module && (module.exports = GameHistoryModel);