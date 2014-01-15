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
            {x: 4, y: 0, color: '#d2322d', name: 'red', isWin: function (x, y) { return y === 8; } },
            {x: 8, y: 4, color: '#3477B2', name: 'blue', isWin: function (x) { return x === 0; } },
            {x: 4, y: 8, color: 'green', name: 'green', isWin: function (x, y) { return y === 0; } },
            {x: 0, y: 4, color: '#ed9c28', name: 'orange', isWin: function (x) { return x === 8; } }
        ];

        if (players && players.length === 2 && me.playersPositions.length === 4) {
            me.playersPositions.splice(3, 1);
            me.playersPositions.splice(1, 1);
        }
    },

    getPlayerNames: function () {
        return _(this.playersPositions).pluck('name');
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

    isFieldBusy: function (pos) {
        /* jshint maxcomplexity: 8 */
        var p0 = this.at(0);
        var p1 = this.at(1);
        if (this.length === 2) {
            return p0.get('x') === pos.x && p0.get('y') === pos.y ||
                p1.get('x') === pos.x && p1.get('y') === pos.y;
        }
        if (this.length === 4) {
            var p2 = this.at(2);
            var p3 = this.at(3);
            return p0.get('x') === pos.x && p0.get('y') === pos.y ||
                p1.get('x') === pos.x && p1.get('y') === pos.y ||
                p2.get('x') === pos.x && p2.get('y') === pos.y ||
                p3.get('x') === pos.x && p3.get('y') === pos.y;
        }
        return false;
    },
    isBetween: function (n1, n2, n3) {
        var min, max;
        if (n1 > n2) {
            min = n2;
            max = n1;
        } else {
            min = n1;
            max = n2;
        }
        return min < n3 && n3 < max;
    },

    isFieldBehindOtherPlayer: function (pos1, pos2) {
        var me = this;
        var playerX = pos1.x, playerY = pos1.y, x = pos2.x, y = pos2.y;

        var distanceBetweenPositions = playerX === x && Math.abs(playerY - y)
            || playerY === y && Math.abs(playerX - x) || 0;

        if (distanceBetweenPositions !== 2) {
            return false;
        }
        var callback1 = function (item) {
            return y === item.get('prev_y') && me.isBetween(playerX, x, item.get('prev_x'));
        };
        var callback2 = function (item) {
            return x === item.get('prev_x') && me.isBetween(playerY, y, item.get('prev_y'));
        };
        return this.getCountByCondition(playerY === y ? callback1 : callback2) === 1;
    },

    getCountByCondition: function (callback) {
        var busyFieldsBetweenPositionLength = 0;
        for (var i = 0, len = this.length; i < len; i++) {
            if (callback(this.at(i))) {
                busyFieldsBetweenPositionLength++;
            }
        }
        return busyFieldsBetweenPositionLength;
    },

    isFieldNearOtherPlayer: function (pos1, pos2) {
        var isDiagonal = Math.abs(pos1.x - pos2.x) === 1 && Math.abs(pos1.y - pos2.y) === 1;
        if (!isDiagonal) {
            return false;
        }
        return !!(this.hasTwoVerticalSibling(pos1, pos2) || this.hasTwoHorizontalSiblings(pos1, pos2));
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
        return this.isPrevFieldBusy({ x: playerX, y: playerY - diffY})
            && this.isPrevFieldBusy({ x: playerX, y: playerY - diffY * 2 });
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
        return this.isPrevFieldBusy({x: playerX - diffX, y: playerY })
            && this.isPrevFieldBusy({x: playerX - diffX * 2, y: playerY});
    },

    isPrevFieldBusy: function (pos) {
        /* jshint maxcomplexity: 8 */
        var p0 = this.at(0);
        var p1 = this.at(1);
        var nameX = 'prev_x';
        var nameY = 'prev_y';
        if (this.length === 2) {
            return p0.get(nameX) === pos.x && p0.get(nameY) === pos.y ||
                p1.get(nameX) === pos.x && p1.get(nameY) === pos.y;
        }
        if (this.length === 4) {
            var p2 = this.at(2);
            var p3 = this.at(3);
            return p0.get(nameX) === pos.x && p0.get(nameY) === pos.y ||
                p1.get(nameX) === pos.x && p1.get(nameY) === pos.y ||
                p2.get(nameX) === pos.x && p2.get(nameY) === pos.y ||
                p3.get(nameX) === pos.x && p3.get(nameY) === pos.y;
        }
        return false;
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
