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
    },
    findPlayerRoom: function(socket) {
        return this.find(function(room) {
            return room.findPlayer(socket);
        });
    },
    findFreeRoom: function() {
        return this.find(function(room) {
            return !room.isFull();
        });
    },
    addPlayer: function(socket) {
        var room = this.findFreeRoom(), result = false;
        if (room) {
            result = room.addPlayer(socket);
        }
        if (!result) {
            room = new Room();
            room.addPlayer(socket);
            this.add(room);
        }
    }
});

module.exports = Game;