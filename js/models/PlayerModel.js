var PlayerModel = Backbone.Model.extend({

    isNearestPosition: function (x, y) {
        var prevX = this.get('x'),
            prevY = this.get('y');
        return Math.abs(prevX - x) == 1 && prevY == y
            || Math.abs(prevY - y) == 1 && prevX == x;
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
    currentPlayer   : 0,
    fencesCount     : 20,
    playersPositions: [
        {x: 4, y: 0, color: 'red', isWin: function(x,y) { return y == 8; } },
        {x: 8, y: 4, color: 'blue', isWin: function(x,y) { return x == 0; } },
        {x: 4, y: 8, color: 'white', isWin: function(x,y) { return y == 0; } },
        {x: 0, y: 4, color: 'yellow', isWin: function(x,y) { return x == 8; } }
    ],

    getCurrentPlayer: function () {
        return this.at(this.currentPlayer);
    },

    switchPlayer: function (player) {
        this.checkWin(this.currentPlayer);

        var c = _.isUndefined(player) ? this.currentPlayer + 1 : player - 1;
        this.currentPlayer = c < this.length ? c : 0;
        this.each(function(player) {
            player.trigger('resetstate');
        });
        this.getCurrentPlayer().trigger('setcurrent', this.currentPlayer);
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
        _(playersCount).times(function (player) {
            var position = me.playersPositions[player];
            var fences = Math.round(me.fencesCount / playersCount);
            var model = new PlayerModel({
                x: position.x,
                y: position.y,
                color: position.color,
                fencesRemaining: fences
            });
            me.add(model);
        });
    },

    isValidPosition: function(player, x, y) {
        return this.isFieldNotBusy(x, y) && (
            player.isNearestPosition(x, y) ||
            this.isFieldBehindOtherPlayer(player, x, y) ||
            this.isFieldNearOtherPlayer(player, x, y)
        );
    },

    isFieldNotBusy: function (x, y) {
        return !this.isFieldBusy(x, y);
    },

    isFieldBusy: function (x, y) {
        return this.findWhere({x: x, y: y});
    },
    isBetween: function(n1, n2, n3) {
        var min = Math.min(n1, n2);
        var max = Math.max(n1, n2);
        return min < n3 && n3 < max;
    },

    isFieldBehindOtherPlayer: function(player, x, y) {
        var me = this;
        var playerX = player.get('x'),
            playerY = player.get('y');
        var distanceBetweenPositions =
            playerX == x ? Math.abs(playerY - y) :
           (playerY == y ? Math.abs(playerX - x) : 0);

        if (distanceBetweenPositions != 2) return false;

        var busyFieldsBetweenPosition = this.filter(function(item) {
            return playerY == y && y == item.get('y') && me.isBetween(playerX, x, item.get('x')) ||
                   playerX == x && x == item.get('x') && me.isBetween(playerY, y, item.get('y'));
        });

        return busyFieldsBetweenPosition.length == (distanceBetweenPositions - 1);
    },

    isFieldNearOtherPlayer: function(player, x, y) {
        var me = this;
        var playerX = player.get('x'),
            playerY = player.get('y');

        var isDiagonalSibling = Math.abs(playerX - x) == 1 && Math.abs(playerY - y) == 1;

        if (!isDiagonalSibling) return false;

        var sibling1, sibling2;

        /**
         *   s2
         * x s1 x
         *   p
         *
         *  s1,s2 - siblings
         *  x - possible position
         *  p - player
         */
        sibling1 = this.findWhere({
            x: playerX, y: playerY - (playerY - y)
        });
        sibling2 = this.findWhere({
            x: playerX, y: playerY - (playerY - y) * 2
        });

        if (sibling1 && sibling2) return true;

        /**
         *     x
         *  s2 s1 p
         *     x
         *
         *  s1,s2 - siblings
         *  x - possible position
         *  p - player
         */
        sibling1 = this.findWhere({
            x: playerX - (playerX - x), y: playerY
        });
        sibling2 = this.findWhere({
            x: playerX - (playerX - x) * 2, y: playerY
        });

        if (sibling1 && sibling2) return true;

        return false;
    }

});