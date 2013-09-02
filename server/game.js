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
        var room = self.createNewRoom();

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
            return (roomId ? room.get('id') == roomId : true) && !room.isFull();
        });
    },
    createNewRoom: function (playersCount) {
        var params = {
            id: this.length
        };
        playersCount && (params.playersCount = playersCount);
        var room = new Room(params);
        this.add(room);
        return room;
    },
    addPlayer: function(socket, params) {
        var roomId = params.roomId, room, result = false;

        if (roomId) {
            room = this.findFreeRoom(roomId);
            result = room && room.addPlayer(socket);
        } else {
            room = this.findFreeRoom();
            if (room) {
                result = room.addPlayer(socket);
            }
            if (!result) {
                room = this.createNewRoom();
                room.addPlayer(socket);
            }
        }
    }
});

module.exports = Game;