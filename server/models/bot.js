var Backbone = require('backbone');
var Game = require('../../server/models/game.js');
var _ = require('underscore');

function extend(Child, Parent) {
    Child.prototype = Parent.prototype;
}

var emitter = require('events').EventEmitter;
var Bot = function (game) {
    this.game = game;
    this.initEvents();
};
extend(Bot, emitter);

Bot.prototype.onStart = function(currentPlayer, activePlayer, history) {
    this.currentPlayer = currentPlayer;
    var position = this.game.history.getPlayerPositions()[currentPlayer];
    this.x = position.x;
    this.y = position.y;
    if (currentPlayer == activePlayer) {
        this.attemptsCount = 0;
        this.makeTurn();
    }
};

Bot.prototype.initEvents = function() {
    this.on('server_move_player', _(this.onMovePlayer).bind(this));
    this.on('server_move_fence', _(this.onMoveFence).bind(this));
    this.on('server_start', _(this.onStart).bind(this));
    this.on('server_turn_fail', _(this.makeTurn).bind(this));
};

Bot.prototype.isCurrent = function(playerIndex) {
    return this.currentPlayer == this.game.players.getNextActivePlayer(playerIndex);
};

Bot.prototype.onMovePlayer = function(params) {
    if (this.currentPlayer == params.playerIndex) {
        this.x = params.x;
        this.y = params.y;
    }
    if (this.isCurrent(params.playerIndex)) {
        this.attemptsCount = 0;
        this.makeTurn();
    }
};

Bot.prototype.onMoveFence = function(params) {
    if (this.currentPlayer == params.playerIndex) {

    }
    if (this.isCurrent(params.playerIndex)) {
        this.attemptsCount = 0;
        this.makeTurn();
    }
};

Bot.prototype.makeTurn = function() {
    this.attemptsCount++;
    if (this.attemptsCount > 20) {
        console.log('bot can`t make a turn');
        return;
    }

    this.emit('client_move_player', this.getPossiblePosition());
    //this.emit('client_move_fence');
};

Bot.prototype.getPossiblePosition = function() {
    var newPositions = [{
        x: this.x + 1,
        y: this.y
    }, {
        x: this.x - 1,
        y: this.y
    }, {
        x: this.x,
        y: this.y + 1
    }, {
        x: this.x,
        y: this.y - 1
    }];

    var random = _.random(0, 3);
    return newPositions[random];
};

module.exports = Bot;