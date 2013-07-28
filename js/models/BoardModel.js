var BoardModel = Backbone.Model.extend({
    defaults: {
        boardSize       : 9,
        playersCount    : 4
    },

    resetModels: function() {
        this.fences.each(function(fence) {
            fence.set('state', '');
        });
        this.players.initPlayerPositions();
        this.run();
    },
    createModels: function() {
        this.fences = new FencesCollection();
        this.fields = new FieldsCollection();
        this.players = new PlayersCollection();
        this.infoModel = new Backbone.Model();
    },
    initModels   : function () {
        var me = this, boardSize = this.get('boardSize');

        _([boardSize, boardSize]).iter(function (i, j) {
            me.fields.add(new FieldModel({x: i, y: j}));
        });
        _([boardSize, boardSize - 1]).iter(function (i, j) {
            me.fences.add(new FenceHModel({x: i, y: j}));
        });
        _([boardSize - 1, boardSize]).iter(function (i, j) {
            me.fences.add(new FenceVModel({x: i, y: j}));
        });
        this.players.createPlayers(this.get('playersCount'));
    },
    isBetween: function(n1, n2, n3) {
        var min = Math.min(n1, n2);
        var max = Math.max(n1, n2);
        return min <= n3 && n3 < max;
    },
    isOtherPlayerAndFenceBehindHim: function(player, x, y) {
        var sibling1, sibling2,
            playerX = player.get('x'), playerY = player.get('y');

        var isDiagonalSibling = Math.abs(playerX - x) == 1 && Math.abs(playerY - y) == 1;

        if (!isDiagonalSibling) return false;

        /**
         *   f
         * x s x
         *   p
         *
         *  s - sibling
         *  f - sibling
         *  x - possible position
         *  p - player
         */
        sibling1 = this.players.findWhere({
            x: playerX, y: playerY - (playerY - y)
        });
        sibling2 = this.fences.findWhere({
            x: playerX, y: playerY - (playerY - y), state: 'busy', type: 'H'
        });

        if (sibling1 && sibling2) return true;

        /**
         *    x
         *  f s p
         *    x
         *
         *  s - sibling
         *  f - sibling
         *  x - possible position
         *  p - player
         */
        sibling1 = this.players.findWhere({
            x: playerX - (playerX - x), y: playerY
        });
        sibling2 = this.fences.findWhere({
            x: playerX - (playerX - x), y: playerY, state: 'busy', type: 'V'
        });

        if (sibling1 && sibling2) return true;

        return false;
    },
    noFenceBetweenPositions: function(player, x, y) {
        var me = this;
        var playerX = player.get('x'),
            playerY = player.get('y');

        var busyFencesOnLine;
        if (playerX == x) {
            busyFencesOnLine = this.fences.where({
                x: x,
                type: 'H',
                state: 'busy'
            });
            return !_(busyFencesOnLine).find(function(fence) {
                return me.isBetween(playerY, y, fence.get('y'));
            });
        }
        if (playerY == y) {
            busyFencesOnLine = this.fences.where({
                y: y,
                type: 'V',
                state: 'busy'
            });
            return !_(busyFencesOnLine).find(function(fence) {
                return me.isBetween(playerX, x, fence.get('x'));
            });
        }

        return true;
    },
    isValidPlayerPosition: function(current, x, y) {
        return this.isBetween(0, this.get('boardSize'), x)
            && this.isBetween(0, this.get('boardSize'), y)
            && this.players.isFieldNotBusy(x, y)
            && this.noFenceBetweenPositions(current, x, y)
            && (
                current.isNearestPosition(x, y) ||
                this.players.isFieldBehindOtherPlayer(current, x, y) ||
                this.players.isFieldNearOtherPlayer(current, x, y) ||
                this.isOtherPlayerAndFenceBehindHim(current, x, y)
            );
    },
    initEvents: function () {
        var me = this;

        this.fields.on('moveplayer', function (x, y) {
            var current = me.players.getCurrentPlayer();
            if (me.isValidPlayerPosition(current, x, y)) {
                current.moveTo(x, y);
                me.players.switchPlayer();
            }
        });
        this.fields.on('beforeselectfield', function (x, y) {
            var current = me.players.getCurrentPlayer();
            if (me.isValidPlayerPosition(current, x, y)) {
                this.trigger('valid_position', x, y);
            }
        });
        this.players.on('change setcurrent', function() {
            me.infoModel.set({
                currentplayer: this.currentPlayer + 1,
                fences: this.pluck('fencesRemaining')
            });
        });
        this.players.on('win', function(player) {
            if (window.confirm(player + ' выиграл. Начать сначала?')) {
                me.resetModels();
            }
        });
        this.fences.on('placefence', function() {
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
        this.createModels();
        this.initEvents();
        this.initModels();
    }
});