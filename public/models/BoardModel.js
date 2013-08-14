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
            me.fields.add({x: i, y: j});
        });
        _([boardSize, boardSize - 1]).iter(function (i, j) {
            me.fences.addHorizontal({x: i, y: j});
        });
        _([boardSize - 1, boardSize]).iter(function (i, j) {
            me.fences.addVertical({x: i, y: j});
        });
        this.players.createPlayers(this.get('playersCount'));
    },
    initEvents: function () {
        var me = this;

        this.on('turn', function(isEcho) {
            if (isEcho) {
                me.onTurnSendSocketEvent();
                return;
            }

            if (me.isPlayerMoved || me.isFenceMoved) {
                if (me.isFenceMoved) {
                    me.players.getCurrentPlayer().placeFence();
                    me.fences.setBusy();
                }

                me.players.switchPlayer();
                me.get('socket') || me.set('playerNumber', me.players.currentPlayer);
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
                if (me.canSelectFences()
                    && me.fences.validateAndTriggerEventOnFenceAndSibling(model, 'markasselected')) {
                    me.players.updatePlayersPositions();
                    me.isPlayerMoved = false;
                    me.isFenceMoved = true;
                }
            },
            'highlight_current_and_sibling': function (model) {
                if (me.canSelectFences()) {
                    me.fences.validateAndTriggerEventOnFenceAndSibling(model, 'highlight');
                }
            },
            'reset_current_and_sibling'    : function (model) {
                me.fences.triggerEventOnFenceAndSibling(model, 'dehighlight');
            }
        });
    },
    run: function(playerNumber) {
        playerNumber = _.isUndefined(playerNumber) ? 1 : playerNumber;
        this.players.switchPlayer(playerNumber);
    },
    initialize: function () {
        this.initSocket();
        this.createModels();
        this.initEvents();
        this.initModels();
        this.socketEvents();
    }
});
_.extend(BoardModel.prototype, window.BoardValidation);
_.extend(BoardModel.prototype, window.BoardSocketEvents);