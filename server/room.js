var _ = require('underscore');
var Backbone = require('backbone');
/**
 * @type PlayersCollection
 */
var PlayersCollection = require('../public/models/PlayerModel.js');
var FencesCollection = require('../public/models/FenceModel.js');

var Room = Backbone.Model.extend({

    boardSize: 9,
    playersCount: 2,

    initialize: function(playersCount) {
        this.playersCount = playersCount || this.playersCount;

        this.players = new PlayersCollection();
        this.players.createPlayers(this.playersCount);
        this.players.at(0).set('active', true);

        this.fences = [];
        //this.fences = new FencesCollection();
        //this.fences.createFences(this.boardSize);
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
        return this.fences;
/*
        var data = [];
        this.fences.each(function(fence) {
            if (fence.get('state') == 'busy') {
                data.push({
                    type: fence.get('type'),
                    x: fence.get('x'),
                    y: fence.get('y')
                });
            }
        });
        return data;
*/
    },
    onMoveFence: function(player, eventInfo) {
        if (!player.get('active')) return;
        if (!player.hasFences()) return;

        var index = this.players.indexOf(player);

        player.set('active', false);
        player.placeFence();
        this.fences.push(eventInfo);

        this.players.switchPlayer();
        this.players.getCurrentPlayer().set('active', true);

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

        player.set('active', false);
        player.set({
            x: eventInfo.x,
            y: eventInfo.y
        });

        var index = this.players.indexOf(player);
        this.players.switchPlayer();
        this.players.getCurrentPlayer().set('active', true);
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
});

module.exports = Room;