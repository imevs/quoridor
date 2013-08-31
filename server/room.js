var _ = require('underscore');
var Backbone = require('backbone');
/**
 * @type PlayersCollection
 */
var PlayersCollection = require('../public/models/PlayerModel.js');

var Room = Backbone.Model.extend({
    initialize: function() {
        this.players = new PlayersCollection();
    },
    isFull: function() {
        return this.players.length >= 2;
    },
    addPlayer: function(socket) {
        var playerId = socket && socket.id && socket.id.toString();
        if (this.isFull()) return false;

        var player = this.players.add({
            id: playerId
        });
        socket.on('disconnect', _(this.disconnectPlayer).bind(this));
        return true;
    },
    disconnectPlayer: function(socket) {
        var player = this.findPlayer(socket);
        this.players.remove(player);
    },
    findPlayer: function(socket) {
        var playerId = socket && socket.id && socket.id.toString();
        return this.players.findWhere({id: playerId});
    }
});

module.exports = Room;