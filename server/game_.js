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
        this.add(room);

        this.io = io;
        io.sockets.on('connection', _(self.addPlayer).bind(this));
    },
    addPlayer: function(socket) {
        var room = this.at(0);
        var playerId = socket && socket.id && socket.id.toString();
        var result = room.addPlayer(playerId);
        if (!result) {
            room = new Room();
            this.add(room);
            result = room.addPlayer(playerId);
        }
    }
});

module.exports = Game;