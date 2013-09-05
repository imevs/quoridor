var _ = require('underscore');
var Backbone = require("../backbone.mongoose");

var PlayersCollection = require('../../public/models/PlayerModel.js');
var FencesCollection = require('../../public/models/FenceModel.js');
var BoardValidation = require('../../public/models/BoardValidation.js');

var Room = Backbone.Model.extend({

    idAttribute: "_id",

    defaults: {
        id: 0,
        playerNumber: 0,
        title: '',
        boardSize: 9,
        playersCount: 2
    },

    mongooseModel: "Room",

    parse: function(data, options) {
        //this.books.reset(data.books);
        return data._doc;
    },

    initialize: function(model, options) {
        var room = this;
        room.players = new PlayersCollection();
        room.fences = new FencesCollection();

        room.fences.createFences(this.get('boardSize'));
        room.players.createPlayers(this.get('playersCount'));
        room.players.at(0).set('active', true);
    },
    isFull: function() {
        return this.findBusyPlayersPlaces().length >= 2;
    },
    addPlayer: function(socket) {
        var playerId = socket && socket.id && socket.id.toString();
        if (this.isFull()) return false;

        var player = this.players.find(function(player) {
            return player.get('state') != 'busy';
        });
        player.set('id', playerId);
        player.set('state', 'busy');
        player.set('socket', socket);
        var index = this.players.indexOf(player);

        socket.on('disconnect', _(this.disconnectPlayer).bind(this, socket));
        socket.on('client_move_player', _(this.onMovePlayer).partial(player).bind(this));
        socket.on('client_move_fence', _(this.onMoveFence).partial(player).bind(this));

        var playersData = this.players.map(function(item) {
            return item.pick('x', 'y', 'fencesRemaining', 'active');
        });
        socket.emit('server_start', index, playersData, this.getFencesPositions());

        return true;
    },
    getFencesPositions: function() {
        return this.fences.filter(function(fence) {
            return fence.get('state') == 'busy'
        }).map(function(fence) {
            return fence.pick('x', 'y', 'type');
        });
    },
    onMoveFence: function(player, eventInfo) {
        if (!player.get('active')) return;
        if (!player.hasFences()) return;

        var fence = this.fences.findWhere(_(eventInfo).pick('x', 'y', 'type'));
        if (!this.fences.validateFenceAndSibling(fence)) return;

        var index = this.players.indexOf(player);

        player.set('active', false);
        player.placeFence();
        fence.set({state: 'busy'});

        this.players.switchPlayer();
        this.players.getCurrentPlayer().set('active', true);
        this.set('playerNumber', this.players.currentPlayer);

        this.players.each(function(p) {
            var socket = p.get('socket');
            socket && socket.emit('server_move_fence', {
                x: eventInfo.x,
                y: eventInfo.y,
                type: eventInfo.type,
                fencesRemaining: player.get('fencesRemaining'),
                playerIndex: index
            });
        });
    },
    onMovePlayer: function(player, eventInfo) {
        if (!player.get('active')) return;
        if (!this.isValidCurrentPlayerPosition(eventInfo.x, eventInfo.y)) return;

        player.set('active', false);
        player.moveTo(eventInfo.x, eventInfo.y);

        var index = this.players.indexOf(player);
        this.players.switchPlayer();
        this.players.getCurrentPlayer().set('active', true);
        this.set('playerNumber', this.players.currentPlayer);

        this.players.each(function(player) {
            var socket = player.get('socket');
            socket && socket.emit('server_move_player', {
                x: eventInfo.x,
                y: eventInfo.y,
                playerIndex: index
            });
        });
    },
    findBusyPlayersPlaces: function() {
        return this.players.filter(function(player) {
            return player.get('state') == 'busy';
        });
    },
    disconnectPlayer: function(socket) {
        var player = this.findPlayer(socket);
        player && player.set({
            id    : '',
            state : '',
            socket: ''
        });
    },
    findPlayer: function(socket) {
        var playerId = socket && socket.id && socket.id.toString();
        return this.players.findWhere({id: playerId});
    }
}, {
    createRoom: function(params) {
        var room = new Room(params);

        room.set('title', 'Game created at ' + new Date());
        room.set('playerNumber', 0);

        return room;
    }
});
_.extend(Room.prototype, BoardValidation);

module.exports = Room;