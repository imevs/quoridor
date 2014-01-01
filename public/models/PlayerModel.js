var isNode = typeof module !== 'undefined';

if (isNode) {
    var Backbone = require('backbone');
    var _ = require('lodash-node/underscore');
}

var PlayerModel = Backbone.Model.extend({
    defaults: {
        fencesRemaining: 0
    },
    initialize: function () {
        this.set('prev_x', this.get('x'));
        this.set('prev_y', this.get('y'));
    },
    moveTo: function (x, y) {
        this.set({x: x, y: y});
    },
    placeFence: function () {
        this.set('fencesRemaining', this.get('fencesRemaining') - 1);
    },
    hasFences: function () {
        return this.get('fencesRemaining') > 0;
    },
    reset: function () {
        this.socket = null;
        this.set({id: '', state: ''});
    },
    isBot: function () {
        return this.get('type') === 'bot';
    }
});

var PlayersCollection = Backbone.Collection.extend({
    model           : PlayerModel,
    fencesCount     : 20,

    initialize: function (players) {
        var me = this;
        _(players).each(function (player, i) {
            player.url = i;
            if (!_.isUndefined(player.movedFences)) {
                var fences = Math.round(me.fencesCount / players.length);
                player.fencesRemaining = fences - player.movedFences;
            }
        });
        me.playersPositions = [
            {x: 4, y: 0, color: 'red', isWin: function (x, y) { return y === 8; } },
            {x: 8, y: 4, color: 'blue', isWin: function (x) { return x === 0; } },
            {x: 4, y: 8, color: 'white', isWin: function (x, y) { return y === 0; } },
            {x: 0, y: 4, color: 'yellow', isWin: function (x) { return x === 8; } }
        ];

        if (players && players.length === 2 && me.playersPositions.length === 4) {
            me.playersPositions.splice(3, 1);
            me.playersPositions.splice(1, 1);
        }
    },

    getNextActivePlayer: function (currentPlayer) {
        this.checkWin(currentPlayer);

        var current = this.at(currentPlayer);
        current.set({
            'prev_x': current.get('x'),
            'prev_y': current.get('y')
        });

        var activePlayer = currentPlayer;
        activePlayer++;
        activePlayer = activePlayer < this.length ? activePlayer : 0;
        return activePlayer;
    },

    checkWin: function (playerIndex) {
        var pos = this.at(playerIndex).pick('x', 'y'),
            x = pos.x,
            y = pos.y;
        if (this.playersPositions[playerIndex].isWin(x, y)) {
            this.trigger('win', playerIndex);
            return true;
        }
        return false;
    },
    createPlayers: function (playersCount) {
        var me = this;
        playersCount = +playersCount;
        if (playersCount === 2 && me.playersPositions.length === 4) {
            me.playersPositions.splice(3, 1);
            me.playersPositions.splice(1, 1);
        }
        var fences = Math.round(me.fencesCount / playersCount);
        _(playersCount).times(function (player) {
            var position = me.playersPositions[player];
            var model = new PlayerModel({
                url            : player,
                color          : position.color,
                x              : position.x,
                prev_x         : position.x,
                y              : position.y,
                prev_y         : position.y,
                fencesRemaining: fences
            });
            me.add(model);
        });
    },

    initPlayerPositions: function () {
        var me = this;
        this.each(function (player, i) {
            var position = me.playersPositions[i];
            var fences = Math.round(me.fencesCount / me.length);
            player.set({
                url            : i,
                x              : position.x,
                prev_x         : position.x,
                y              : position.y,
                prev_y         : position.y,
                fencesRemaining: fences
            });
        });
    },

    isFieldNotBusy: function (pos) {
        return !this.isFieldBusy(pos);
    },

    isFieldBusy: function (pos) {
        return this.findWhere(pos);
    },
    isBetween: function (n1, n2, n3) {
        var min = Math.min(n1, n2);
        var max = Math.max(n1, n2);
        return min < n3 && n3 < max;
    },

    isFieldBehindOtherPlayer: function (pos1, pos2) {
        var me = this;
        var playerX = pos1.x, playerY = pos1.y,
            x = pos2.x, y = pos2.y;

        var distanceBetweenPositions =
            playerX === x ? Math.abs(playerY - y) :
           (playerY === y ? Math.abs(playerX - x) : 0);

        if (distanceBetweenPositions !== 2) {
            return false;
        }
        var busyFieldsBetweenPosition = this.filter(function (item) {
            var prevY = item.get('prev_y');
            var prevX = item.get('prev_x');
            return playerY === y && y === prevY && me.isBetween(playerX, x, prevX) ||
                   playerX === x && x === prevX && me.isBetween(playerY, y, prevY);
        });

        return busyFieldsBetweenPosition.length === (distanceBetweenPositions - 1);
    },

    isFieldNearOtherPlayer: function (pos1, pos2) {
        var isDiagonal = Math.abs(pos1.x - pos2.x) === 1 && Math.abs(pos1.y - pos2.y) === 1;
        if (!isDiagonal) {
            return false;
        }
        return !!(this.hasTwoVerticalSibling(pos1, pos2)
               || this.hasTwoHorizontalSiblings(pos1, pos2));
    },

    /**
     *   s2
     * x s1 x
     *   p
     *
     *  s1,s2 - siblings
     *  x - possible position
     *  p - player
     */
    hasTwoVerticalSibling    : function (pos1, pos2) {
        var playerX = pos1.x, playerY = pos1.y, y = pos2.y;
        var diffY = playerY - y; // 1 or -1
        var sibling1 = this.findWhere({
            prev_x: playerX,
            prev_y: playerY - diffY
        });
        var sibling2 = this.findWhere({
            prev_x: playerX,
            prev_y: playerY - diffY * 2
        });
        return sibling1 && sibling2;
    },

    /**
     *     x
     *  s2 s1 p
     *     x
     *
     *  s1,s2 - siblings
     *  x - possible position
     *  p - player
     */
    hasTwoHorizontalSiblings : function (pos1, pos2) {
        var playerX = pos1.x, playerY = pos1.y, x = pos2.x;
        var diffX = playerX - x; //1 or -1
        var sibling1 = this.findWhere({
            x: playerX - diffX,
            y: playerY
        });
        var sibling2 = this.findWhere({
            x: playerX - diffX * 2,
            y: playerY
        });
        return sibling1 && sibling2;
    },

    updatePlayersPositions: function () {
        this.each(function (item) {
            if (item.get('x') !== item.get('prev_x') ||
                item.get('y') !== item.get('prev_y')) {
                item.set({
                    x: item.get('prev_x'),
                    y: item.get('prev_y')
                });
            }
        });
    }

});

if (isNode) {
    module.exports = PlayersCollection;
}
