var isNode = typeof module !== 'undefined';

if (isNode) {
    var Backbone = require('backbone');
    var _ = require('lodash-node/underscore');
}

var TurnModel = Backbone.Model.extend({
    defaults: {
        x: '',
        y: '',
        t: ''
    },
    alpha: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k'],

    intToChar: function (i) {
        return this.alpha[i];
    },

    getX: function (x) {
        if (this.get('debug')) {
            return x + ':';
        }
        return this.intToChar(x);
    },

    getY: function (y) {
        if (this.get('debug')) {
            return y + '';
        }
        return TurnModel.boardSize - y;
    },

    toString: function () {
        var dy = this.get('y') === this.get('y2') ? 1 : 0;
        return this.get('t') === 'p'
            ? this.getX(this.get('x')) + this.getY(this.get('y')) + ''
            : this.getX(this.get('x')) + this.getY(this.get('y') + dy) +
            this.getX(this.get('x2')) + this.getY(this.get('y2') + dy) +  '';
    },

    toJSON: function () {
        var result = _.clone(this.attributes);
        delete result.debug;
        return result;
    }

});

var TurnsCollection = Backbone.Collection.extend({

    model: TurnModel,

    initialize: function () {

    }
});

var GameHistoryModel = Backbone.Model.extend({

    defaults: {
        playerNames: [],
        turns: []
    },

    getPlayerPositions: function () {
        var positions = [], self = this;

        var playersCount = this.get('playersCount');
        _(_.range(playersCount)).each(function (index) {
            var playerPositions = self.get('turns').filter(function (v, i) {
                var b = (i - index) % playersCount === 0;
                return v.get('t') === 'p' && b;
            });
            var playerFences = self.get('turns').filter(function (v, i) {
                var b = (i - index) % playersCount === 0;
                return v.get('t') === 'f' && b;
            });
            var playerInfo = _.last(playerPositions);
            if (playerInfo) {
                playerInfo = playerInfo.pick('x', 'y');
                playerInfo.movedFences = playerFences.length;
            }
            positions[index] = playerInfo;
        });
        return positions;
    },

    getFencesPositions: function () {
        var filter = this.get('turns').filter(function (val) {
            return val.get('t') === 'f';
        });
        return _(filter).map(function (item) {
            item = item.pick('x', 'x2', 'y', 'y2');
            item.t = item.x === item.x2 ? 'V' : (item.y === item.y2 ? 'H' : (''));
            return item;
        });
    },

    add: function (turnInfo) {
        turnInfo.debug = this.get('debug');
        var turn = new TurnModel(turnInfo);
        this.get('turns').add(turn);

        this.trigger('change');
    },

    at: function (index) {
        var turnsLength = this.get('turns').length / this.get('playersCount');
        if (index > turnsLength) {
            return 'error';
        }
        var self = this;

        var result = [];
        var startIndex = index * this.get('playersCount');
        var playersCount = +self.get('playersCount');
        var turns = this.get('turns').filter(function (value, index) {
            return index >= startIndex && index < startIndex + playersCount;
        });
        _(turns).each(function (value) {
            result.push(value + '');
        });
        return result.join(' ');
    },

    getLength: function () {
        return Math.ceil(this.get('turns').length / this.get('playersCount'));
    },

    initPlayers  : function () {
        var playersCount = this.get('playersCount');
        var self = this;
        if (playersCount === 2 && self.playersPositions.length !== 2) {
            self.playersPositions.splice(3, 1);
            self.playersPositions.splice(1, 1);
        }
        _(_.range(playersCount)).each(function (index) {
            var playersPosition = self.playersPositions[index];
            playersPosition.t = 'p';
            self.add(playersPosition);
        });
    },

    initialize: function (params) {
        params = params || {};
        this.set({
            boardSize: +params.boardSize || 9,
            playersCount: +params.playersCount || 2,
            turns: new TurnsCollection()
        });

        TurnModel.boardSize = this.get('boardSize');
        this.playersPositions = [
            {x: 4, y: 0 },
            {x: 8, y: 4 },
            {x: 4, y: 8 },
            {x: 0, y: 4 }
        ];
    }
});
if (isNode) {
    module.exports = GameHistoryModel;
}