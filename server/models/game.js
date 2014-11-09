var _ = this._ || require('lodash-node/underscore');
var Backbone = this.Backbone || require('../backbone.mongoose');
var Room = this.Room || require('./room.js');
var Bot = this.Bot || require('./../../public/models/Bot.js');
var SmartBot = this.SmartBot || require('./../../public/models/SmartBot.js');
var MegaBot = this.MegaBot || require('./../../public/models/MegaBot.js');
var uuid = this.uuid || require('node-uuid');

var Game = Backbone.Collection.extend({
    model: Room,
    mongooseModel: 'Room',

    initialize: function () {
/*
        var game = this;
        this.fetch({
            success: function () {
                game.each(function (room) {
                    room.players.each(function (player) {
                        player.reset();
                        if (player.isBot()) {
                            var bot = new Bot(player.get('url'));
                            room.addPlayer(bot);
                        }
                    });
                });
            }
        });
*/
    },
    start: function (io) {
        var self = this;
        self.io = io;
        io.sockets.on('connection', function (client) {
            client.on('myconnection', _.bind(_(self.addPlayer).partial(client), self));
        });
    },
    findPlayerRoom: function (socket) {
        return this.find(function (room) {
            return room.findPlayer(socket);
        });
    },
    findRoomById: function (roomId) {
        return this.find(function (room) {
            return room.get('id') === roomId;
        });
    },
    findFreeRoom: function (roomId) {
        return this.find(function (room) {
            return room.get('id') === roomId && !room.isFull() && room.get('state') !== 'finished';
        });
    },
    findRoomByPlayerId: function (playerId) {
        return this.find(function (room) {
            return room.players.find(function (player) {
                return player.get('url') === playerId;
            });
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
    createNewRoom: function (playersCount, playerParams) {
        this.removeOld();

        var params = {};
        if (playersCount)  {
            params.playersCount = playersCount;
        }
        playerParams = playerParams || [];
        var room = Room.createRoom(params);
        _(_.range(playersCount)).each(function (index) {
            var guid = uuid.v4();
            room.players.at(index).set('url', guid);
            var param = playerParams[index];
            if (param === 'bot') {
                var bot = new Bot(guid);
                room.addPlayer(bot);
            }
            if (param === 'smartbot') {
                room.addPlayer(new SmartBot(guid));
            }
            if (param === 'megabot') {
                room.addPlayer(new MegaBot(guid));
            }
        });

        this.add(room);
        return room;
    },
    addPlayer: function (socket, params) {
        var roomId = params.roomId,
            playerId = params.playerId,
            room,
            result = false;
        if (playerId) {
            room = this.findRoomByPlayerId(playerId);
            socket.playerId = playerId;
            result = room && room.addPlayer(socket);
            if (!result) {
                socket.emit('server_start', 'error');
            }
        } else if (roomId) {
            room = this.findRoomById(roomId);
            result = room && room.addPlayer(socket);
        }
    }
});

var isNode = typeof module !== 'undefined';

if (isNode) {
    module.exports = Game;
}