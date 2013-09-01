var BoardModel = Backbone.Model.extend({
    isPlayerMoved: false,
    isFenceMoved: false,

    defaults: {
        boardSize       : 9,
        playersCount    : 2
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
        var me = this;
        var count = me.get('playersCount');
        if (count != 2 && count != 4) {
            me.set('playersCount', 2);
        }
        me.fields.createFields(me.get('boardSize'));
        me.fences.createFences(me.get('boardSize'));
        me.players.createPlayers(me.get('playersCount'));
    },

    makeTurn: function () {
        var me = this;
        if (me.isPlayerMoved || me.isFenceMoved) {
            if (me.isFenceMoved) {
                me.players.getCurrentPlayer().placeFence();
                me.fences.setBusy();
            }

            me.players.switchPlayer();
            me.get('socket') || me.set('playerNumber', me.players.currentPlayer);

            me.isPlayerMoved = false;
            me.isFenceMoved = false;
        }
    },

    onMovePlayer: function (x, y) {
        var me = this;
        if (me.isValidCurrentPlayerPosition(x, y)) {
            var current = me.players.getCurrentPlayer();
            current.moveTo(x, y);
            me.fences.clearBusy();
            me.isFenceMoved = false;
            me.isPlayerMoved = true;
        }
    },

    initEvents: function () {
        var me = this;

        this.on('maketurn', this.makeTurn);

        this.fields.on('moveplayer', me.onMovePlayer, this);
        this.fields.on('beforeselectfield', function (x, y) {
            if (me.isValidCurrentPlayerPosition(x, y)) {
                this.selectField(x, y);
            }
        });
        this.players.on('change setcurrent', function() {
            me.infoModel.set({
                currentplayer: me.get('playerNumber'),
                activeplayer: this.currentPlayer,
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
                    && me.fences.validateAndTriggerEventOnFenceAndSibling(model, 'movefence')) {
                    me.players.updatePlayersPositions();
                    me.isPlayerMoved = false;
                    me.isFenceMoved = true;
                }
            },
            'highlight_current_and_sibling': function (model) {
                if (me.canSelectFences()) {
                    me.fences.validateAndTriggerEventOnFenceAndSibling(model, 'markfence');
                }
            },
            'reset_current_and_sibling'    : function (model) {
                me.fences.triggerEventOnFenceAndSibling(model, 'unmarkfence');
            }
        });
    },
    run: function(activePlayer, currentPlayer) {
        this.set('playerNumber', currentPlayer);
        activePlayer = _.isUndefined(activePlayer) ? 1 : activePlayer;
        this.players.switchPlayer(activePlayer);
    },
    initialize: function () {
        this.createModels();
        this.initEvents();
        this.initModels();
        this.socketEvents();
    }
});
_.extend(BoardModel.prototype, window.BoardValidation);
_.extend(BoardModel.prototype, window.BoardSocketEvents);