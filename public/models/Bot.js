var isNode = typeof module !== 'undefined';

if (isNode) {
    var _ = require('underscore');
    var Emitter = require('events').EventEmitter;
    var GameHistoryModel = require('./TurnModel.js');
    var Backbone = require('backbone');
}

var Bot = Backbone.Model.extend({

    fencesCount: 20,

    constructor: function (id) {
        this.id = id;

        this.playerId = id;
        if (Emitter) {
            this.emitter = new Emitter();
        }
        this.emit = this.trigger;
        this.initEvents();
    },

    trigger: function () {
        //console.log(arguments[0]);
        //console.log(arguments[1]);
        if (this.emitter) {
            return this.emitter.emit.apply(this, arguments);
        } else {
            return Backbone.Model.prototype.trigger.apply(this, arguments);
        }
    },

    on: function () {
        if (this.emitter) {
            return this.emitter.on.apply(this, arguments);
        } else {
            return Backbone.Model.prototype.on.apply(this, arguments);
        }
    },

    startGame: function (currentPlayer, activePlayer) {
        this.onStart.apply(this, arguments);
        if (currentPlayer === activePlayer) {
            this.turn();
        }
    },

    onStart: function (currentPlayer, activePlayer, history, playersCount) {
        this.playersCount = +playersCount;
        var historyModel = new GameHistoryModel({
            boardSize: 9,
            playersCount: this.playersCount
        });
        historyModel.get('turns').reset(history);
        var position = historyModel.getPlayerPositions()[currentPlayer];

        this.x = position.x;
        this.y = position.y;
        this.newPositions = [];
        this.fencesPositions = [];
        this.currentPlayer = currentPlayer;
        this.fencesRemaining = Math.round(this.fencesCount / this.playersCount) - position.movedFences;
    },

    getNextActivePlayer: function (currentPlayer) {
        currentPlayer++;
        return currentPlayer < this.playersCount ? currentPlayer : 0;
    },

    initEvents: function () {
        this.on('server_move_player', _(this.onMovePlayer).bind(this));
        this.on('server_move_fence', _(this.onMoveFence).bind(this));
        this.on('server_start', _(this.startGame).bind(this));
        this.on('server_turn_fail', _(this.makeTurn).bind(this));
    },

    isPlayerCanMakeTurn: function (playerIndex) {
        return this.currentPlayer === this.getNextActivePlayer(playerIndex);
    },

    onMovePlayer: function (params) {
        if (this.currentPlayer === params.playerIndex) {
            this.x = params.x;
            this.y = params.y;
        }
        if (this.isPlayerCanMakeTurn(params.playerIndex)) {
            this.turn();
        }
    },

    onMoveFence: function (params) {
        if (this.currentPlayer === params.playerIndex) {
            this.fencesRemaining--;
        }
        if (this.isPlayerCanMakeTurn(params.playerIndex)) {
            this.turn();
        }
    },

    turn: function () {
        this.attemptsCount = 0;
        this.newPositions = this.getJumpPositions();
        this.makeTurn();
    },

    makeTurn: function () {
        var bot = this;
        this.attemptsCount++;
        console.log('bot:attemptsCount', this.attemptsCount);
        console.log('bot:currentPlayer', this.currentPlayer);
        console.log('----------------');
        if (this.attemptsCount > 50) {
            console.log('bot can`t make a turn');
            return;
        }
        setTimeout(_(bot.doTurn).bind(bot), 1000);
    },

    getFencePosition: function () {
        var y = _.random(0, 8);
        var x = _.random(0, 8);
        var type = _.random(0, 1) ? 'H' : 'V';
        var res = {y: y, x: x, type: type};
        if (_(this.fencesPositions).contains(res)) {
            return this.getFencePosition();
        }
        this.fencesPositions.push(res);
        return res;
    },

    doTurn     : function () {
        var bot = this;
        var random = _.random(0, 1);
        var playerPosition;
        if (bot.canMovePlayer() && (random || !bot.canMoveFence())) {
            playerPosition = bot.getPossiblePosition();
            if (playerPosition) {
                bot.trigger('client_move_player', playerPosition);
            }
            return;
        }

        if (bot.canMoveFence()) {
            var res = this.getFencePosition();
            var eventInfo = {
                x          : res.x,
                y          : res.y,
                type       : res.type,
                playerIndex: bot.id
            };

            bot.trigger('client_move_fence', eventInfo);
            return;
        }
        console.log('something going wrong');
    },

    getJumpPositions: function () {
        return [
            {
                x: this.x + 1,
                y: this.y
            },
            {
                x: this.x - 1,
                y: this.y
            },
            {
                x: this.x,
                y: this.y + 1
            },
            {
                x: this.x,
                y: this.y - 1
            }
        ];
    },

    canMoveFence: function () {
        return this.fencesRemaining > 0;
    },

    canMovePlayer: function () {
        return this.newPositions.length > 0;
    },

    getPossiblePosition: function () {
        var random = _.random(0, this.newPositions.length - 1);
        var position = this.newPositions[random];
        this.newPositions.splice(random, 1);
        return position;
    }

});

if (isNode) {
    module.exports = Bot;
}
