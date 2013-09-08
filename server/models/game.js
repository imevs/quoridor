var io = require('socket.io');
var _ = require('underscore');
var Backbone = require('../backbone.mongoose');
var Room = require('./room.js');

var Game = Backbone.Collection.extend({
    model: Room,
    mongooseModel: 'Room',

    initialize: function() {
        this.fetch();
    },
    start: function(io) {
        var self = this;
        self.io = io;
        io.sockets.on('connection', function(client){
            client.on('myconnection', _(self.addPlayer).partial(client).bind(self));
        });
    },
    findPlayerRoom: function(socket) {
        return this.find(function(room) {
            return room.findPlayer(socket);
        });
    },
    findFreeRoom: function(roomId) {
        return this.find(function(room) {
            return room.get('id') === roomId && !room.isFull();
        });
    },
    createNewRoom: function (playersCount) {
        var params = {};
        playersCount && (params.playersCount = playersCount);
        var room = Room.createRoom(params);

        this.add(room);
        return room;
    },
    addPlayer: function(socket, params) {
        var roomId = params.roomId, room, result = false;

        if (roomId) {
            room = this.findFreeRoom(roomId);
            result = room && room.addPlayer(socket);
        }
    }
});

module.exports = Game;