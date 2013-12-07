var _ = require('underscore');
var util = require('util');
var Bot = require('./smartBot.js');

var MegaBot = function (id, room, satisfiedRate) {
    MegaBot.super_.call(this, id, room);
    this.player = this.board.players.findWhere({url: this.id});
    this.othersPlayers = _(this.board.players.models)
        .reject(function (v) {
            return v.get('url') === this.playerId;
        }, this);
    this.satisfiedRate = satisfiedRate || 0;
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
        //console.time('getTurnsRating');
        var rates = this.getTurnsRating();
        //console.timeEnd('getTurnsRating');
        var minRate = _(_(rates).pluck('rate')).min();
        var types = {'H': 0, 'V': 1, 'P': 2 };
        var minRatedMoves = _(rates).filter(function (move) {
            return move.rate === minRate;
        }).sort(function (a, b) {
            return types[b.type] - types[a.type];
        });
        return minRatedMoves[0];
    },

    getTurnsRating: function () {
        var board = this.board;//.copy();
        var player = this.player;
        var othersMinPathLength = this.othersPlayersHeuristic();

        var result = [];

        var satisfiedCount = 0;
        var moves = this.selectMoves();
        _(moves).each(function (move) {
            if (move.type === 'P') {
                var prevPosition = player.pick('x', 'y', 'prev_x', 'prev_y');
                player.set({
                    x: move.x,
                    y: move.y,
                    prev_x: move.x,
                    prev_y: move.y
                });
                move.rate = this.calcHeuristic(othersMinPathLength);
                player.set(prevPosition);
                result.push(move);
            }
        }, this);

        _(moves).some(function (move) {
            if (move.type !== 'P') {
                var fence = board.fences.findWhere(move);
                var sibling = board.fences.getSibling(fence);
                if (!player.hasFences() ||
                    !board.fences.validateFenceAndSibling(fence) &&
                    board.breakSomePlayerPath(fence)
                    ) {
                    move.rate = 999999;
                } else {
                    var prevStateFence = fence.get('state');
                    var prevStateSibling = sibling.get('state');
                    fence.set({state: 'busy'});
                    sibling.set({state: 'busy'});
                    move.rate = this.calcHeuristic();
                    fence.set({state: prevStateFence});
                    sibling.set({state: prevStateSibling});
                    result.push(move);
                }
            }
            if (move.rate <= this.satisfiedRate) {
                satisfiedCount++;
            }
            return satisfiedCount >= 2;
        }, this);

        result = _(result).sort(function (move1, move2) {
            return move1.rate - move2.rate;
        });
        return result;
    },

    othersPlayersHeuristic: function () {
        var paths = this.othersPlayers.map(function (player) {
            return this.findPathToGoal(player).length;
        }, this);
        return _(paths).min();
    },

    calcHeuristic: function (othersMinPathLength) {
        var path = this.findPathToGoal(this.player);
        othersMinPathLength = _.isUndefined(othersMinPathLength)
            ? this.othersPlayersHeuristic() : othersMinPathLength;
        return (path.length + 1) - othersMinPathLength;
    },

    selectMoves: function () {
        var positions = [];
        var player = this.player;
        var playerPositions = this.board.getValidPositions(player.pick('x', 'y'));
        playerPositions = _(playerPositions).map(function (playerPosition) {
            playerPosition.type = 'P';
            return playerPosition;
        });
        positions = positions.concat(playerPositions);
        if (player.hasFences()) {
            var boardSize = this.board.get('boardSize');
            _([boardSize, boardSize - 1]).iter(function (i, j) {
                positions.push({x: i, y: j, type: 'H'});
            });
            _([boardSize - 1, boardSize]).iter(function (i, j) {
                positions.push({x: i, y: j, type: 'V'});
            });
        }

        return positions;
    }

});

module.exports = MegaBot;