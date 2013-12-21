/* global FencesCollection, FieldsCollection, PlayersCollection, GameHistoryModel */
var BoardModel = Backbone.Model.extend({
    isPlayerMoved: false,
    isFenceMoved: false,

    bots: [],

    defaults: {
        botsCount       : 0,
        boardSize       : 9,
        playersCount    : 2,
        currentPlayer   : null,
        activePlayer    : null
    },

    resetModels: function () {
        this.fences.each(function (fence) {
            fence.set('state', '');
        });
        this.players.initPlayerPositions();
        this.run();
    },
    createModels: function () {
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
        if (count !== 2 && count !== 4) {
            me.set('playersCount', 2);
        }
        me.set('botsCount', Math.min(me.get('playersCount'), me.get('botsCount')));
        me.fields.createFields(+me.get('boardSize'));
        me.fences.createFences(+me.get('boardSize'));
        me.players.createPlayers(+me.get('playersCount'));
    },

    switchActivePlayer: function () {
        this.set('activePlayer', this.players.getNextActivePlayer(this.get('activePlayer')));
    },

    makeTurn: function () {
        /* jshint maxcomplexity:8 */
        var me = this;
        if (!(me.isPlayerMoved || me.isFenceMoved)) {
            return;
        }
        var active = me.getActivePlayer();
        var preBusy = me.fences.getMovedFence();
        var index = me.get('activePlayer');
        if (me.isFenceMoved) {
            me.getActivePlayer().placeFence();
            var preBusySibling = me.fences.getSibling(preBusy);
            me.history.add({
                x: preBusy.get('x'),
                y: preBusy.get('y'),
                x2: preBusySibling.get('x'),
                y2: preBusySibling.get('y'),
                t: 'f'
            });
            me.fences.setBusy();
        }
        if (me.isPlayerMoved) {
            me.history.add({
                x: active.get('x'),
                y: active.get('y'),
                t: 'p'
            });
        }
        me.switchActivePlayer();
        /**
         * if local mode game then automatic change currentPlayer
         */
        if (!me.isOnlineGame()) {
            me.set('currentPlayer', me.get('activePlayer'));

            if (me.isFenceMoved) {
                me.emitEventToBots('server_move_fence', {
                    x: preBusy.get('x'),
                    y: preBusy.get('y'),
                    type: preBusy.get('type'),
                    playerIndex: index
                });
            }
            if (me.isPlayerMoved) {
                me.emitEventToBots('server_move_player', {
                    x: active.get('x'),
                    y: active.get('y'),
                    playerIndex: index
                });
            }
        }

        me.isPlayerMoved = false;
        me.isFenceMoved = false;
    },

    getNextActiveBot: function (next) {
        return _(this.bots).find(function (bot) {
            return bot.currentPlayer === next;
        }, this);
    },

    emitEventToBots: function (eventName, param) {
        var next = this.players.getNextActivePlayer(this.get('activePlayer'));
        _(this.bots).each(function (bot) {
            if (next !== bot.currentPlayer) {
                bot.postMessage({eventName: eventName, params: param });
            }
        }, this);
        var nextBot = this.getNextActiveBot(next);
        if (nextBot) {
            nextBot.postMessage({eventName: eventName, params: param });
        }
    },

    isOnlineGame: function () {
        return this.get('playerId') || this.get('roomId');
    },

    onMovePlayer: function (x, y) {
        var me = this;
        if (me.isValidCurrentPlayerPosition(x, y)) {
            var current = me.getActivePlayer();
            current.moveTo(x, y);
            me.fences.clearBusy();
            me.isFenceMoved = false;
            me.isPlayerMoved = true;
        } else {
            var activeBot = me.getActiveBot();
            if (activeBot) {
                activeBot.postMessage({eventName: 'server_turn_fail'});
            }
        }
    },

    updateInfo: function () {
        this.infoModel.set({
            currentplayer: this.get('currentPlayer'),
            activeplayer : this.get('activePlayer'),
            fences       : this.players.pluck('fencesRemaining')
        });
    },

    onFenceSelected: function (model) {
        if (this.canSelectFences() &&
            this.fences.validateFenceAndSibling(model) &&
            this.notBreakSomePlayerPath(model)) {

            this.fences.clearBusy();
            this.fences.validateAndTriggerEventOnFenceAndSibling(model, 'movefence');

            this.players.updatePlayersPositions();
            this.isPlayerMoved = false;
            this.isFenceMoved = true;
        } else {
            var activeBot = this.getActiveBot();
            if (activeBot) {
                activeBot.postMessage({eventName: 'server_turn_fail'});
            }
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
        this.on('change:activePlayer', this.updateInfo, this);
        this.on('change:currentPlayer', this.updateInfo, this);
        this.players.on('change', this.updateInfo, this);

        if (!this.isOnlineGame()) {
            this.players.on('win', function (player) {
                if (window.confirm(player + ' выиграл. Начать сначала?')) {
                    me.resetModels();
                }
            });
        }
        this.fences.on({
            'selected'                     : _.bind(me.onFenceSelected, me),
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
    run: function (activePlayer, currentPlayer) {
        this.set({
            activePlayer: activePlayer,
            currentPlayer: _.isUndefined(currentPlayer) ? activePlayer : currentPlayer
        });
        this.history.initPlayers();
        this.connectBots();
    },
    connectBots: function () {
        if (_.isUndefined(this.get('botsCount'))) {
            return;
        }
        var me = this;

        var turns = this.history.get('turns').toJSON();

        _(this.get('botsCount')).times(function (i) {
            var botIndex = i + (this.get('playersCount') - this.get('botsCount'));

            var bot = new Worker('/models/BotWorker.js');

            bot.addEventListener('message', function (event) {
                var events = {
                    'client_move_player': me.onSocketMovePlayer,
                    'client_move_fence': function (pos) {
                        if (me.onSocketMoveFence(pos) === false) {
                            var activeBot = this.getActiveBot();
                            if (activeBot) {
                                activeBot.postMessage({eventName: 'server_turn_fail'});
                            }
                        }
                    }
                };
                events[event.data.eventName].apply(me, event.data.params);
            });

            bot.currentPlayer = botIndex;
            bot.postMessage({
                eventName   : 'server_start',
                params: [botIndex, this.get('activePlayer'), turns, this.get('playersCount')]
            });

            this.bots.push(bot);
        }, this);
    },
    initialize: function () {
        this.set('playersCount', +this.get('playersCount'));
        this.set('boardSize', +this.get('boardSize'));
        this.createModels();
        this.initEvents();
        this.initModels();
        if (this.isOnlineGame()) {
            this.socketEvents();
        } else {
            this.on('confirmturn', this.makeTurn);
            this.run(0, 0);
        }
    }
});
_.extend(BoardModel.prototype, window.BoardValidation);
_.extend(BoardModel.prototype, window.BoardSocketEvents);