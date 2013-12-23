var _ = require('underscore');
var Backbone = require('../backbone.mongoose');

var PlayersCollection = require('../../public/models/PlayerModel.js');
var FencesCollection = require('../../public/models/FenceModel.js');
var BoardValidation = require('../../public/models/BoardValidation.js');
var History = require('../../public/models/TurnModel.js');
var uuid = require('uuid');

var Room = Backbone.Model.extend({

    idAttribute: '_id',

    defaults: {
        id          : '',
        /**
         * Номер игрока, который будет ходить первым (нумерация идет с 0)
         */
        activePlayer: 0,
        title       : '',
        boardSize   : 9,
        playersCount: 2,
        createDate  : '',
        state       : ''
    },

    mongooseModel: 'Room',

    parse: function (data) {
        var room = this;
        var doc = data && data._doc;

        if (!room.history) {
            room.history = new History({
                boardSize: doc.boardSize,
                playersCount: doc.playersCount
            });
            room.history.initPlayers();
        }
        if (doc && doc.history && doc.history.length) {
            room.history.get('turns').reset(doc.history);
            doc.players = room.history.getPlayerPositions();
            _.each(doc.players, function (pl, index) {
                var info = (doc.playersInfo || [])[index];
                pl.url = info ? info.url : uuid.v4();
                pl.type = info && (info.url === info.id) ? 'bot' : 'human';
            });
            doc.fences = room.history.getFencesPositions();
        } else {
            console.log('parse error');
        }

        var hasPlayers = doc && doc.players && doc.players.length;
        var isPlayers = hasPlayers && room.isNoPlayers();
        if (isPlayers) {
            room.players = new PlayersCollection(doc.players);
            room.players.activePlayer = doc.activePlayer;
        }

        var hasFences = doc && doc.fences && doc.fences.length;
        var isFences = hasFences && room.isNoFences();
        if (isFences) {
            room.fences = new FencesCollection();
            room.fences.createFences(doc.boardSize, doc.fences);
        }
        if (doc) {
            delete doc.activePlayer;
            delete doc.players;
            delete doc.history;
            delete doc.fences;
        }
        return doc;
    },

    isNoFences: function () {
        return !this.fences || !this.fences.length;
    },

    isNoPlayers: function () {
        return !this.players || !this.players.length;
    },

    toJSON: function () {
        var result = Backbone.Model.prototype.toJSON.call(this);
        delete result._id;
        result.history = this.history.get('turns').toJSON && this.history.get('turns').toJSON();
        result.playersInfo = _.map(this.players.toJSON(), function (player) {
            return {
                url: player.url,
                id: player.id
            };
        });
        return result;
    },

    initialize: function () {
        var room = this;
        this.sockets = [];

        if (!room.players) {
            room.players = new PlayersCollection();
            room.players.createPlayers(this.get('playersCount'));
        }
        if (!room.fences) {
            room.fences = new FencesCollection();
            room.fences.createFences(this.get('boardSize'));
        }

        if (!room.history) {
            room.history = new History({
                boardSize: room.get('boardSize'),
                playersCount: room.get('playersCount')
            });
            room.history.initPlayers();
        }

        room.players.on('win', function (player) {
            var index = room.players.indexOf(player);

            room.players.each(function (p) {
                var socket = p.socket;
                if (socket) {
                    socket.emit('server_win', index);
                }
                p.reset();
            });
            clearTimeout(room.turnTimeout);
            room.set('title', 'Game over!');
            room.set('state', 'finished');
        });
    },
    isFull: function () {
        return this.findBusyPlayersPlaces().length >= this.get('playersCount');
    },
    isOver: function () {
        return this.get('state') === 'finished';
    },
    addPlayer: function (socket) {
        var socketId = socket && socket.id && socket.id.toString();
        var playerId = socket && socket.playerId && socket.playerId.toString();

        if (!playerId) {
            socket.emit('server_start',
                -1,
                this.get('activePlayer'),
                this.history.get('turns').toJSON(),
                this.get('playersCount')
            );

            this.sockets.push(socket);

            return true;
        }

        var player = this.players.findWhere({id: socketId});

        player = player || this.players.find(function (player) {
            return player.get('state') !== 'busy' && player.get('url') === playerId;
        });
        if (!player) {
            console.log('player not found');
            return false;
        }
        player.set('id', socketId);
        player.set('state', 'busy');
        player.socket = socket;

        socket.on('disconnect', _(this.disconnectPlayer).bind(this, socket));
        socket.on('client_move_player', _(this.onMovePlayer).partial(player).bind(this));
        socket.on('client_move_fence', _(this.onMoveFence).partial(player).bind(this));

        socket.emit('server_start',
            this.players.indexOf(player),
            this.get('activePlayer'),
            this.history.get('turns').toJSON(),
            this.get('playersCount')
        );

        return true;
    },
    getFencesPositions: function () {
        return this.fences.filter(function (fence) {
            return fence.get('state') === 'busy';
        }).map(function (fence) {
            return fence.pick('x', 'y', 'type');
        });
    },
    switchActivePlayer: function (callback) {
        console.log('switchActivePlayer', this.get('activePlayer'));
        this.set('activePlayer', this.players.getNextActivePlayer(this.get('activePlayer')));
        this.save({}, {
            success: callback
        });
        console.log('switchActivePlayer', this.get('activePlayer'));
        console.log('----------------');
    },
    onMoveFence: function (player, eventInfo) {
        var room = this;
        var index = this.players.indexOf(player);
        var fence = this.fences.findWhere(_(eventInfo).pick('x', 'y', 'type'));

        if (index !== this.get('activePlayer')) {
            return;
        }

        if (!player.hasFences() ||
            !this.fences.validateFenceAndSibling(fence) ||
            this.breakSomePlayerPath(fence)
            ) {

            player.socket.emit('server_turn_fail');
            return;
        }
        this.onTimeoutCount = 0;

        var sibling = this.fences.getSibling(fence);

        player.placeFence();
        fence.set({state: 'busy'});
        sibling.set({state: 'busy'});
        this.history.add({
            x: fence.get('x'),
            y: fence.get('y'),
            x2: sibling.get('x'),
            y2: sibling.get('y'),
            t: 'f'
        });

        this.switchActivePlayer(function () {
            eventInfo = {
                x : eventInfo.x,
                y : eventInfo.y,
                type: eventInfo.type,
                playerIndex: index
            };
            room.emitEventToAllPlayers(eventInfo, 'server_move_fence');
        });
    },
    onMovePlayer: function (player, eventInfo) {
        var room = this;
        var index = this.players.indexOf(player);
        this.set('currentPlayer', index);

        if (index !== this.get('activePlayer')) {
            return;
        }

        if (!eventInfo || !this.isValidCurrentPlayerPosition(eventInfo.x, eventInfo.y)) {
            player.socket.emit('server_turn_fail');
            return;
        }
        this.onTimeoutCount = 0;

        player.moveTo(eventInfo.x, eventInfo.y);

        this.history.add({
            x: player.get('x'),
            y: player.get('y'),
            t: 'p'
        });

        this.switchActivePlayer(function () {
            eventInfo = {
                x: eventInfo.x,
                y: eventInfo.y,
                playerIndex: index
            };
            room.emitEventToAllPlayers(eventInfo, 'server_move_player');
        });
    },
    emitEventToAllPlayers: function (eventInfo, eventName) {
        var room = this;

        process.nextTick(function () {
            console.log('room:emitEventToAllPlayers');
            clearTimeout(room.turnTimeout);
            room.players.each(function (player) {
                var index = room.players.indexOf(player);
                if (room.get('activePlayer') === index) {
                    return;
                }
                var socket = player.socket;
                if (socket) {
                    socket.emit(eventName, eventInfo);
                }
            });
            room.sockets.forEach(function (socket) {
                socket.emit(eventName, eventInfo);
            });
            var activePlayer = room.players.at(room.get('activePlayer'));
            var socket = activePlayer.socket;
            if (room.onTimeoutCount < 10) { // stop auto switch after 15 move passing
                room.turnTimeout = setTimeout(_(room.onTimeout).bind(room), 15 * 1000);
            }
            if (socket) {
                socket.emit(eventName, eventInfo);
            }
        });
    },

    /**
     * auto change current player after 10 sec (so we prevent suspended players)
     */
    onTimeout: function () {
        var room = this;
        var activePlayer = this.players.at(this.get('activePlayer'));

        if (!activePlayer.get('id')) {
            return;
        }
        this.onTimeoutCount = this.onTimeoutCount || 0;
        this.onTimeoutCount++;

        this.history.add({
            x: activePlayer.get('x'),
            y: activePlayer.get('y'),
            t: 'p'
        });

        var activePlayerIndex = room.get('activePlayer');
        this.switchActivePlayer(function () {
            var eventInfo = {
                x: activePlayer.get('x'),
                y: activePlayer.get('y'),
                timeout: 1,
                playerIndex: activePlayerIndex
            };
            room.emitEventToAllPlayers(eventInfo, 'server_move_player');
        });
    },

    findBusyPlayersPlaces: function () {
        return this.players.filter(function (player) {
            return player.get('state') === 'busy';
        });
    },
    disconnectPlayer: function (socket) {
        var player = this.findPlayer(socket);
        if (player) {
            player.reset();
        }
    },
    findPlayer: function (socket) {
        var playerId = socket && socket.id && socket.id.toString();
        return this.players.findWhere({id: playerId});
    }

}, {
    createRoom: function (params) {
        params.id = uuid.v4();
        var room = new Room(params);

        var date = new Date();
        room.set('createDate', date);

        return room;
    }
});
_.extend(Room.prototype, BoardValidation.prototype);

module.exports = Room;