var io = require('socket.io');
var _ = require('underscore');
var Backbone = require('backbone');
var Room = require('./room.js');

var Game = Backbone.Collection.extend({
    model: Room,
    initialize: function() {

    },
    start: function(io) {
        var self = this;
        var room = new Room();
        self.add(room);

        self.io = io;
        io.sockets.on('connection', _(self.addPlayer).bind(self));
        io.sockets.on('disconnect', _(self.disconnectPlayer).bind(self));
    },
    disconnectPlayer: function(socket) {
        var playerId = socket && socket.id && socket.id.toString();
        var room = this.findPlayerRoom(socket);
        var player = room.players.findWhere({id: playerId});
        room.players.remove(player);
    },
    findPlayerRoom: function(socket) {
        var playerId = socket && socket.id && socket.id.toString();
        var room = this.find(function(room) {
            return room.players.findWhere({id: playerId});
        });
        return room;
    },
    findFreeRoom: function() {
        var room = this.find(function(room) {
            return room.players.length < 2;
        });
        return room;
    },
    addPlayer: function(socket) {
        var playerId = socket && socket.id && socket.id.toString();
        var room = this.findFreeRoom();
        var result = false;
        if (!!room) {
            result = room.addPlayer(playerId);
        }

        if (!result) {
            room = new Room();
            this.add(room);
            room.addPlayer(playerId);
        }
    }
});

module.exports = Game;