var _ = require('underscore');
var Backbone = require('../backbone.mongoose');
var Room = require('./room.js');

var Game = Backbone.Collection.extend({
    model: Room,
    mongooseModel: 'Room',

    initialize: function() {
        var game = this;
        this.fetch({
            success: function() {
                game.each(function(room) {
                    room.players.each(function(player) {
                        player.reset();
                    });
                });
            }
        });
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
    findRoomById: function(roomId) {
        return this.find(function(room) {
            return room.get('id') === roomId;
        });
    },
    findFreeRoom: function(roomId) {
        return this.find(function(room) {
            return room.get('id') === roomId && !room.isFull() && room.get('state') !== 'finished';
        });
    },
    removeOld: function () {
        var me = this;
        var twoHours = 2 * 60 * 60 * 1000;
        var currentTime = (new Date()).getTime();
        var d = new Date(currentTime - twoHours);

        var filter = this.filter(function (item) {
            return item.get('createDate') < d;
        });
        _(filter).each(function (item) {
            me.remove(item);
            item.destroy();
        });
    },
    createNewRoom: function (playersCount) {
        this.removeOld();

        var params = {};
        if (playersCount)  {
            params.playersCount = playersCount;
        }
        var room = Room.createRoom(params);

        this.add(room);
        return room;
    },
    addPlayer: function(socket, params) {
        var roomId = params.roomId, room, result = false;

        if (roomId) {
            room = this.findFreeRoom(roomId);
            result = room && room.addPlayer(socket);
            if (!result) {
                socket.emit('server_start', 'error');
            }
        }
    }
});

module.exports = Game;