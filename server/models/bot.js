var Backbone = require('backbone');
var Game = require('../../server/models/game.js');
var _ = require('underscore');
var util = require("util");
var emitter = require('events').EventEmitter;

var Bot = function (game) {
    this.game = game;
    this.initEvents();
};
util.inherits(Bot, emitter);

_.extend(Bot.prototype, {


    onStart: function (currentPlayer, activePlayer, history) {
        this.currentPlayer = currentPlayer;
        var position = this.game.history.getPlayerPositions()[currentPlayer];
        this.x = position.x;
        this.y = position.y;
        if (currentPlayer == activePlayer) {
            this.turn();
        }
    },

    initEvents: function () {
        this.on('server_move_player', _(this.onMovePlayer).bind(this));
        this.on('server_move_fence', _(this.onMoveFence).bind(this));
        this.on('server_start', _(this.onStart).bind(this));
        this.on('server_turn_fail', _(this.makeTurn).bind(this));
    },

    isCurrent: function (playerIndex) {
        return this.currentPlayer == this.game.players.getNextActivePlayer(playerIndex);
    },

    onMovePlayer: function (params) {
        if (this.currentPlayer == params.playerIndex) {
            this.x = params.x;
            this.y = params.y;
        }
        if (this.isCurrent(params.playerIndex)) {
            this.turn();
        }
    },

    onMoveFence: function (params) {
        if (this.currentPlayer == params.playerIndex) {

        }
        if (this.isCurrent(params.playerIndex)) {
            this.turn();
        }
    },

    turn: function () {
        this.attemptsCount = 0;
        this.newPositions = this.getPositions();
        this.makeTurn();
    },

    makeTurn: function () {
        this.attemptsCount++;
        console.log('attemptsCount', this.attemptsCount);
        if (this.attemptsCount > 10) {
            console.log('bot can`t make a turn');
            return;
        }

        var position = this.getPossiblePosition();
        this.emit('client_move_player', position);
        //this.emit('client_move_fence');
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

    getPossiblePosition: function () {
        var random = _.random(0, this.newPositions.length - 1);
        var position = this.newPositions[random];
        this.newPositions.splice(random, 1);
        return position;
    }

});

module.exports = Bot;