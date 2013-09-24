var BoardModel = Backbone.Model.extend({
    isPlayerMoved: false,
    isFenceMoved: false,

    defaults: {
        boardSize       : 9,
        playersCount    : 2,
        currentPlayer   : null,
        activePlayer    : null
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
        this.history = new GameHistoryModel({
            boardSize: this.get('boardSize'),
            playersCount: this.get('playersCount')
        });
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

    switchActivePlayer: function () {
        this.set('activePlayer', this.players.getNextActivePlayer(this.get('activePlayer')));
    },

    makeTurn: function () {
        var me = this;
        if (me.isPlayerMoved || me.isFenceMoved) {
            if (me.isFenceMoved) {
                me.getActivePlayer().placeFence();
                var preBusy = me.fences.getPreBusy();
                me.history.add({
                    x: preBusy[0].get('x'),
                    y: preBusy[0].get('y'),
                    x2: preBusy[1].get('x'),
                    y2: preBusy[1].get('y'),
                    type: 'fence'
                });
                me.fences.setBusy();
            }
            if (me.isPlayerMoved) {
                var active = me.getActivePlayer();
                me.history.add({
                    x: active.get('x'),
                    y: active.get('y'),
                    type: 'player'
                });
            }
            me.switchActivePlayer();
            /**
             * if local mode game then automatic change currentPlayer
             */
            me.get('roomId') || me.set('currentPlayer', me.get('activePlayer'));

            me.isPlayerMoved = false;
            me.isFenceMoved = false;
        }
    },

    onMovePlayer: function (x, y) {
        var me = this;
        if (me.isValidCurrentPlayerPosition(x, y)) {
            var current = me.getActivePlayer();
            current.moveTo(x, y);
            me.fences.clearBusy();
            me.isFenceMoved = false;
            me.isPlayerMoved = true;
        }
    },

    updateInfo: function () {
        this.infoModel.set({
            currentplayer: this.get('currentPlayer'),
            activeplayer : this.get('activePlayer'),
            fences       : this.players.pluck('fencesRemaining')
        });
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
        this.on('change:activePlayer', this.updateInfo, this);
        this.on('change:currentPlayer', this.updateInfo, this);
        this.players.on('change', this.updateInfo, this);

        this.get('roomId') || this.players.on('win', function(player) {
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
        this.set({
            activePlayer: activePlayer,
            currentPlayer: _.isUndefined(currentPlayer) ? activePlayer : currentPlayer
        });
    },
    initialize: function () {
        this.set('playersCount', +this.get('playersCount'));
        this.set('boardSize', +this.get('boardSize'));
        this.createModels();
        this.initEvents();
        this.initModels();
        if (this.get('roomId')) {
            this.socketEvents();
        } else {
            this.on('confirmturn', this.makeTurn);
            this.run(0, 0);
        }
    }
});
_.extend(BoardModel.prototype, window.BoardValidation);
_.extend(BoardModel.prototype, window.BoardSocketEvents);