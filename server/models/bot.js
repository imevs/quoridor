var Backbone = require('backbone');
var Game = require('../../server/models/game.js');
var _ = require('underscore');
var util = require('util');
var emitter = require('events').EventEmitter;
var History = require('../../public/models/TurnModel.js');

var Bot = function (id, playersCount) {
    this.id = id;
    this.initEvents();
    this.playersCount = playersCount;
};
util.inherits(Bot, emitter);

_.extend(Bot.prototype, {

    fencesCount: 20,

    onStart: function (currentPlayer, activePlayer, history) {
        var historyModel = new History({
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

        if (currentPlayer == activePlayer) {
            this.turn();
        }
    },

    getNextActivePlayer: function(currentPlayer) {
        currentPlayer++;
        return currentPlayer < this.playersCount ? currentPlayer : 0;
    },

    initEvents: function () {
        this.on('server_move_player', _(this.onMovePlayer).bind(this));
        this.on('server_move_fence', _(this.onMoveFence).bind(this));
        this.on('server_start', _(this.onStart).bind(this));
        this.on('server_turn_fail', _(this.makeTurn).bind(this));
    },

    isPlayerCanMakeTurn: function (playerIndex) {
        return this.currentPlayer == this.getNextActivePlayer(playerIndex);
    },

    onMovePlayer: function (params) {
        if (this.currentPlayer == params.playerIndex) {
            this.x = params.x;
            this.y = params.y;
        }
        if (this.isPlayerCanMakeTurn(params.playerIndex)) {
            this.turn();
        }
    },

    onMoveFence: function (params) {
        if (this.currentPlayer == params.playerIndex) {
            this.fencesRemaining--;
        }
        if (this.isPlayerCanMakeTurn(params.playerIndex)) {
            this.turn();
        }
    },

    turn: function () {
        this.attemptsCount = 0;
        this.newPositions = this.getPositions();
        this.makeTurn();
    },

    makeTurn: function () {
        var bot = this;
        this.attemptsCount++;
        console.log('attemptsCount', this.attemptsCount);
        if (this.attemptsCount > 50) {
            console.log('bot can`t make a turn');
            return;
        }
        setTimeout(_(bot.doTurn).bind(bot), 100);
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
            playerPosition && bot.emit('client_move_player', playerPosition);
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

            bot.emit('client_move_fence', eventInfo);
            return;
        }
        console.log('something going wrong');
    },

    getPositions: function () {
        var newPositions = [
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
        return newPositions;
    },

    canMoveFence: function() {
        return this.fencesRemaining > 0;
    },

    canMovePlayer: function() {
        return this.newPositions.length > 0;
    },

    getPossiblePosition: function () {
        var random = _.random(0, this.newPositions.length - 1);
        var position = this.newPositions[random];
        this.newPositions.splice(random, 1);
        return position;
    }

});

module.exports = Bot;