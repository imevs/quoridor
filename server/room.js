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
    addPlayer: function(playerId) {
        if (this.players.length >= 2) return false;

        this.players.add({
            id: playerId
        });
        return true;
    }
});

module.exports = Room;