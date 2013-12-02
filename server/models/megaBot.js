var _ = require('underscore');
var util = require('util');
var Bot = require('./smartBot.js');

var MegaBot = function (id, room) {
    MegaBot.super_.call(this, id, room);
};

util.inherits(MegaBot, Bot);

_.extend(MegaBot.prototype, {

    doTurn     : function () {
        var turn = this.getBestTurn();
        var eventInfo = {
            x: turn.x,
            y: turn.y,
            type: turn.type,
            playerIndex: this.id
        };
        if (turn.type === 'P') {
            this.emit('client_move_player', eventInfo);
        } else {
            this.emit('client_move_fence', eventInfo);
        }
    },

    getBestTurn: function () {
        return this.getTurnsRating()[0];
    },

    getTurnsRating: function () {
        var board = this.board.copy();
        var player = board.players.findWhere({id: this.id});

        return _(this.selectMoves()).map(function (move) {

            if (move.type === 'P') {
                player.set({
                    x: move.x,
                    y: move.y,
                    prev_x: move.x,
                    prev_y: move.y
                });
                move.rate = this.calcHeuristic();
            } else {
                var fence = board.fences.findWhere(move);
                if (!player.hasFences() ||
                    !board.fences.validateFenceAndSibling(fence) ||
                    board.breakSomePlayerPath(fence)
                    ) {
                    move.rate = 999999;
                } else {
                    var sibling = board.fences.getSibling(fence);

                    fence.set({state: 'busy'});
                    sibling.set({state: 'busy'});
                    move.rate = this.calcHeuristic();
                }
            }
            return move;
        }, this).sort(function (move1, move2) {
            return move1.rate - move2.rate;
        });
    },

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
            playerPosition.type = 'P';
            return playerPosition;
        });
        positions = positions.concat(playerPositions);

        var boardSize = this.board.get('boardSize');
        _([boardSize, boardSize - 1]).iter(function (i, j) {
            positions.push({x: i, y: j, type: 'H'});
        });
        _([boardSize - 1, boardSize]).iter(function (i, j) {
            positions.push({x: i, y: j, type: 'V'});
        });

        return positions;
    }

});

module.exports = MegaBot;