/**
 * @type Backbone
 */
var global = this;
var Backbone = global.Backbone || require('backbone');
var _ = global._ || require('underscore');

var PlayerModel = Backbone.Model.extend({
    defaults: {
        fencesRemaining: 0
    },
    moveTo: function (x, y) {
        this.set({x: x, y: y});
    },
    placeFence: function() {
        this.set('fencesRemaining', this.get('fencesRemaining') - 1);
    },
    hasFences: function() {
        return this.get('fencesRemaining') > 0;
    }
});

var PlayersCollection = Backbone.Collection.extend({
    model           : PlayerModel,
    currentPlayer   : 0,
    fencesCount     : 20,

    initialize: function() {
        this.playersPositions = [
            {x: 4, y: 0, color: 'red', isWin: function(x,y) { return y == 8; } },
            {x: 8, y: 4, color: 'blue', isWin: function(x,y) { return x == 0; } },
            {x: 4, y: 8, color: 'white', isWin: function(x,y) { return y == 0; } },
            {x: 0, y: 4, color: 'yellow', isWin: function(x,y) { return x == 8; } }
        ];
    },

    getCurrentPlayer: function () {
        return this.at(this.currentPlayer);
    },

    switchPlayer: function (player) {
        this.checkWin(this.currentPlayer);

        var current = this.getCurrentPlayer();
        current.set({
            'prev_x': current.get('x'),
            'prev_y': current.get('y')
        });

        var c = _.isUndefined(player) ? this.currentPlayer + 1 : player - 1;
        this.currentPlayer = c < this.length ? c : 0;
        this.each(function(player) {
            player.trigger('resetstate');
        });
        current = this.getCurrentPlayer();
        current.trigger('setcurrent', this.currentPlayer);
    },

    checkWin: function(playerIndex) {
        var pos = this.at(this.currentPlayer).pick('x', 'y'),
            x = pos.x,
            y = pos.y;
        if (this.playersPositions[playerIndex].isWin(x, y) ) {
            this.trigger('win', playerIndex);
            return true;
        }
        return false;
    },
    createPlayers: function (playersCount) {
        var me = this;
        if (playersCount == 2) {
            me.playersPositions.splice(3,1);
            me.playersPositions.splice(1,1);
        }
        var fences = Math.round(me.fencesCount / playersCount);
        _(playersCount).times(function (player) {
            var position = me.playersPositions[player];
            var model = new PlayerModel({
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

    initPlayerPositions: function() {
        var me = this;
        this.each(function(player, i) {
            var position = me.playersPositions[i];
            var fences = Math.round(me.fencesCount / me.length);
            player.set({
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
    isBetween: function(n1, n2, n3) {
        var min = Math.min(n1, n2);
        var max = Math.max(n1, n2);
        return min < n3 && n3 < max;
    },

    isFieldBehindOtherPlayer: function(pos1, pos2) {
        var me = this;
        var playerX = pos1.x, playerY = pos1.y,
            x = pos2.x, y = pos2.y;

        var distanceBetweenPositions =
            playerX == x ? Math.abs(playerY - y) :
           (playerY == y ? Math.abs(playerX - x) : 0);

        if (distanceBetweenPositions != 2) return false;

        var busyFieldsBetweenPosition = this.filter(function(item) {
            return playerY == y && y == item.get('prev_y') && me.isBetween(playerX, x, item.get('prev_x')) ||
                   playerX == x && x == item.get('prev_x') && me.isBetween(playerY, y, item.get('prev_y'));
        });

        return busyFieldsBetweenPosition.length == (distanceBetweenPositions - 1);
    },

    isFieldNearOtherPlayer: function(pos1, pos2) {
        var isDiagonal = Math.abs(pos1.x - pos2.x) == 1 && Math.abs(pos1.y - pos2.y) == 1;
        if (!isDiagonal) return false;

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
        var sibling1 = this.findWhere({
            x: playerX, y: playerY - (playerY - y)
        });
        var sibling2 = this.findWhere({
            x: playerX, y: playerY - (playerY - y) * 2
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
        var sibling1 = this.findWhere({
            x: playerX - (playerX - x), y: playerY
        });
        var sibling2 = this.findWhere({
            x: playerX - (playerX - x) * 2, y: playerY
        });
        return sibling1 && sibling2;
    },

    updatePlayersPositions: function() {
        this.each(function(item) {
            if (item.get('x') != item.get('prev_x') ||
                item.get('y') != item.get('prev_y')) {
                item.set({
                    x: item.get('prev_x'),
                    y: item.get('prev_y')
                });
            }
        });
    }

});

module && (module.exports = PlayersCollection);