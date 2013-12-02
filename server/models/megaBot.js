var _ = require('underscore');
var util = require('util');
var Bot = require('./smartBot.js');

var MegaBot = function (id, room) {
    MegaBot.super_.call(this, id, room);
};

util.inherits(MegaBot, Bot);

_.extend(MegaBot.prototype, {

    calcHeuristic: function () {
        var player = this.board.players.findWhere({
            id: this.playerId
        });
        var path = this.findPathToGoal(player);

        var paths = _(this.board.players.models).reject(function (v) {
            return v.get('id') === this.playerId;
        }, this).map(function (player) {
            return this.findPathToGoal(player).length;
        }, this);
        var minPath = _(paths).min();

        return path.length - minPath;
    },

    selectMoves: function () {
        var positions = [];
        var player = this.board.players.findWhere({
            id: this.playerId
        });
        var playerPositions = this.board.getValidPositions(player.pick('x', 'y'));
        playerPositions = _(playerPositions).map(function (playerPosition) {
            playerPosition.type = 'p';
            return playerPosition;
        });
        positions = positions.concat(playerPositions);

        var boardSize = this.board.get('boardSize');
        _([boardSize, boardSize]).iter(function (i, j) {
            positions.push({x: i, y: j, type: 'H' });
            positions.push({x: i, y: j, type: 'V' });
        });

        return positions;
    }

});

module.exports = MegaBot;