var _ = require('underscore');
var Backbone = require('backbone');
/**
 * @type PlayersCollection
 */
var PlayersCollection = require('../public/models/PlayerModel.js');

var Room = Backbone.Model.extend({
    initialize: function() {
        this.players = new PlayersCollection();
        this.players.createPlayers(2);
        this.players.at(0).set('active', true);
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

        socket.on('disconnect', _(this.disconnectPlayer).bind(this));
        socket.on('client_move_player', _(this.onMovePlayer).partial(player).bind(this));

        socket.emit('server_start', index, this.players.toJSON());

        return true;
    },
    onMovePlayer: function(player, eventInfo) {
        player.set('active', false);
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
        player.set('state', '');
        player.set('id', '');
        player.set('socket', '');
    },
    findPlayer: function(socket) {
        var playerId = socket && socket.id && socket.id.toString();
        return this.players.findWhere({id: playerId});
    }
});

module.exports = Room;