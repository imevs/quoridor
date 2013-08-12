var BoardModel = Backbone.Model.extend({
    isPlayerMoved: false,
    isFenceMoved: false,

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
    isOtherPlayerAndFenceBehindHim: function(pos1, pos2) {
        var sibling1, sibling2;
        var playerX = pos1.x, playerY = pos1.y,
            x = pos2.x, y = pos2.y;

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
    noFenceBetweenPositions: function(pos1, pos2) {
        var me = this;
        var playerX = pos1.x, playerY = pos1.y,
            x = pos2.x, y = pos2.y;

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
    isNearestPosition: function (currentPos, pos) {
        var prevX = currentPos.x, prevY = currentPos.y;
        return Math.abs(prevX - pos.x) == 1 && prevY == pos.y
            || Math.abs(prevY - pos.y) == 1 && prevX == pos.x;
    },
    isValidPlayerPosition: function(currentPos, newPos) {
        return this.isBetween(0, this.get('boardSize'), newPos.x)
            && this.isBetween(0, this.get('boardSize'), newPos.y)
            && this.players.isFieldNotBusy(newPos)
            && this.noFenceBetweenPositions(currentPos, newPos)
            && (
                this.isNearestPosition(currentPos, newPos) ||
                this.players.isFieldBehindOtherPlayer(currentPos, newPos) ||
                this.players.isFieldNearOtherPlayer(currentPos, newPos) ||
                this.isOtherPlayerAndFenceBehindHim(currentPos, newPos)
            );
    },
    isValidCurrentPlayerPosition: function (x, y) {
        var current = this.players.getCurrentPlayer();
        var currentPos = {x: current.get('prev_x'), y: current.get('prev_y')};
        return this.isValidPlayerPosition(currentPos, {x:x, y:y});
    },
    initEvents: function () {
        var me = this;

        this.on('turn', function() {
            if (me.isFenceMoved) {
                me.players.getCurrentPlayer().placeFence();
                me.fences.setBusy();
            }
            var currentPlayer = me.players.getCurrentPlayer();
            if (me.isPlayerMoved || me.isFenceMoved) {
                var socket = this.get('socket');
                var x = currentPlayer.get('x');
                var y = currentPlayer.get('y');
                socket.emit('turn', me.players.currentPlayer, x, y);
                me.players.switchPlayer();
            }

            me.isPlayerMoved = false;
            me.isFenceMoved = false;
        });

        this.fields.on('moveplayer', function (x, y) {
            if (me.isValidCurrentPlayerPosition(x, y)) {
                var current = me.players.getCurrentPlayer();
                current.moveTo(x, y);
                me.fences.clearBusy();
                me.isFenceMoved = false;
                me.isPlayerMoved = true;
            }
        });
        this.fields.on('beforeselectfield', function (x, y) {
            if (me.isValidCurrentPlayerPosition(x, y)) {
                this.selectField(x, y);
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
        this.fences.on({
            'selected'                     : function (model) {
                var hasFences = me.players.getCurrentPlayer().hasFences();
                if (hasFences && me.fences.validateAndTriggerEventOnFenceAndSibling(model, 'markasselected')) {
                    me.players.updatePlayersPositions();
                    me.isPlayerMoved = false;
                    me.isFenceMoved = true;
                }
            },
            'highlight_current_and_sibling': function (model) {
                var hasFences = me.players.getCurrentPlayer().hasFences();
                hasFences && me.fences.validateAndTriggerEventOnFenceAndSibling(model, 'highlight');
            },
            'reset_current_and_sibling'    : function (model) {
                me.fences.triggerEventOnFenceAndSibling(model, 'dehighlight');
            }
        });
    },
    run: function() {
        this.players.switchPlayer(1);
    },
    socketEvents: function() {
        //this.get('socket').on('stats', this.onStat);
        this.get('socket').on('turn', _(this.onTurn).bind(this));
    },
    onStat: function(arr) {
        console.log(arr);
    },
    onTurn: function(player, x, y) {
        console.log('onTurn', player, x, y);
        this.fields.trigger('moveplayer', x, y);
        this.trigger('turn');
    },
    initialize: function () {
        this.createModels();
        this.initEvents();
        this.initModels();
        this.socketEvents();
    }
});