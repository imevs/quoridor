var PlayerModel = Backbone.Model.extend({

    isNearestPosition: function (pos) {
        var prevX = this.get('x'),
            prevY = this.get('y');
        return Math.abs(prevX - pos.x) == 1 && prevY == pos.y
            || Math.abs(prevY - pos.y) == 1 && prevX == pos.x;
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
        var current = this.getCurrentPlayer();
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
            me.playersPositions = _(me.playersPositions).reject(function(v, i) {
                return _([1,3]).contains(i);
            });
        }
        _(playersCount).times(function (player) {
            var position = me.playersPositions[player];
            var model = new PlayerModel({
                color: position.color
            });
            me.add(model);
        });
        me.initPlayerPositions();
    },

    initPlayerPositions: function() {
        var me = this;
        this.each(function(player, i) {
            var position = me.playersPositions[i];
            var fences = Math.round(me.fencesCount / me.length);
            player.set({
                x: position.x,
                y: position.y,
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
            return playerY == y && y == item.get('y') && me.isBetween(playerX, x, item.get('x')) ||
                   playerX == x && x == item.get('x') && me.isBetween(playerY, y, item.get('y'));
        });

        return busyFieldsBetweenPosition.length == (distanceBetweenPositions - 1);
    },

    isFieldNearOtherPlayer: function(pos1, pos2) {
        var sibling1, sibling2;
        var playerX = pos1.x, playerY = pos1.y,
            x = pos2.x, y = pos2.y;

        var isDiagonalSibling = Math.abs(playerX - x) == 1 && Math.abs(playerY - y) == 1;

        if (!isDiagonalSibling) return false;

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
    },

    initialize: function() {
        this.positions = new Backbone.Collection();
    },

    _saveMemento: function(memento){
        var newMemento = memento.memento();
        memento.memento(newMemento);
    },

    _beforeRestoreMemento: function(memento){
        var newMemento = memento.memento();
        memento.memento(newMemento);
    }

});