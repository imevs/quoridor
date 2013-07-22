var BoardModel = Backbone.Model.extend({
    boardSize       : 9,
    playersCount    : 4,

    resetModels: function() {
        this.fences.reset();
        this.fields.reset();
        this.players.reset();
    },
    createModels: function() {
        this.fences = new FencesCollection();
        this.fields = new FieldsCollection();
        this.players = new PlayersCollection();
        this.infoModel = new Backbone.Model();
    },
    initModels   : function () {
        var me = this, boardSize = this.boardSize;

        _([boardSize, boardSize]).iter(function (i, j) {
            me.fields.add(new FieldModel({x: i, y: j}));
        });
        _([boardSize, boardSize - 1]).iter(function (i, j) {
            me.fences.add(new FenceHModel({x: i, y: j}));
        });
        _([boardSize - 1, boardSize]).iter(function (i, j) {
            me.fences.add(new FenceVModel({x: i, y: j}));
        });
        this.players.createPlayers(this.playersCount);
    },
    isBetween: function(n1, n2, n3) {
        var min = Math.min(n1, n2);
        var max = Math.max(n1, n2);
        return min <= n3 && n3 < max;
    },
    existsFenceBetweenPositions: function(player, x, y) {
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
            return _(busyFencesOnLine).find(function(fence) {
                return me.isBetween(playerY, y, fence.get('y'));
            });
        }
        if (playerY == y ) {
            busyFencesOnLine = this.fences.where({
                y: y,
                type: 'V',
                state: 'busy'
            });
            return _(busyFencesOnLine).find(function(fence) {
                return me.isBetween(playerX, x, fence.get('x'));
            });
        }

        return false;
    },
    initEvents: function () {
        var me = this;

        this.fields.on('moveplayer', function (x, y) {
            var current = me.players.getCurrentPlayer();
            if (me.players.isValidPosition(current, x, y)) {
                current.moveTo(x, y);
                me.players.switchPlayer();
            }
        });
        this.fields.on('beforeselectfield', function (x, y) {
            var current = me.players.getCurrentPlayer();
            if (me.players.isValidPosition(current, x, y) &&
               !me.existsFenceBetweenPositions(current, x, y)) {
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
                me.trigger('rerun');
            }
        });
        this.fences.on('selected', function(fence) {
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