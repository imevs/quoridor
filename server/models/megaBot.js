var _ = require('underscore');
var util = require('util');
var Bot = require('./smartBot.js');

var MegaBot = function (id, room, satisfiedRate) {
    MegaBot.super_.call(this, id, room);
    this.satisfiedRate = satisfiedRate || 1;
};

util.inherits(MegaBot, Bot);

_.extend(MegaBot.prototype, {

    possibleWallsMoves: false,

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

    initOthersPlayers: function (board) {
        this.othersPlayers = _(board.players.models).reject(function (v) {
            return v.get('url') === this.playerId;
        }, this);
    },

    getBestTurn: function () {
        var board = this.board.copy();
        var player = board.players.at(this.index);
        this.initOthersPlayers(board);
        var moves = this.getPossibleMoves(board, player);
        var rates = this.getRatesForPlayersMoves(moves, player, board)
            .concat(this.getRatesForWallsMoves(moves, player, board));

        rates = _(rates).sort(function (move1, move2) {
            return move1.rate - move2.rate;
        });

        var minRate = _(_(rates).pluck('rate')).min();
        var types = {'H': 0, 'V': 1, 'P': 2 };
        var minRatedMoves = _(rates).filter(function (move) {
            return move.rate === minRate;
        }).sort(function (a, b) {
            return types[b.type] - types[a.type];
        });
        return minRatedMoves[0];
    },

    getRatesForPlayersMoves: function (moves, player, board) {
        var result = [];
        var othersMinPathLength = this.othersPlayersHeuristic(board);
        _(moves).each(function (move) {
            if (move.type === 'P') {
                var prevPosition = player.pick('x', 'y', 'prev_x', 'prev_y');
                player.set({
                    x: move.x,
                    y: move.y,
                    prev_x: move.x,
                    prev_y: move.y
                });
                move.rate = this.calcHeuristic(player, board, othersMinPathLength);
                player.set(prevPosition);
                result.push(move);
            }
        }, this);
        return result;
    },

    getRatesForWallsMoves: function (moves, player, board) {
        if (!player.hasFences()) {
            return [];
        }
        var satisfiedCount = 0, result = [];
        _(moves).some(function (move) {
            if (move.type === 'P') {
                return false;
            }
            var fence = board.fences.findWhere(move);

            if (!board.fences.validateFenceAndSibling(fence)) {
                this.removePossibleWallsMove(move);
            } else if (!board.breakSomePlayerPath(fence)) {
                var sibling = board.fences.getSibling(fence);

                var prevStateFence = fence.get('state');
                var prevStateSibling = sibling.get('state');

                fence.set({state: 'busy'});
                sibling.set({state: 'busy'});

                move.rate = this.calcHeuristic(player, board);
                result.push(move);

                fence.set({state: prevStateFence});
                sibling.set({state: prevStateSibling});

                if (move.rate <= this.satisfiedRate) {
                    satisfiedCount++;
                }
            }
            return satisfiedCount >= 2;
        }, this);
        this.satisfiedRate = 0;
        return result;
    },

    othersPlayersHeuristic: function (board) {
        var paths = this.othersPlayers.map(function (player) {
            var path = this.findPathToGoal(player, board);
            return path ? path.length : 0;
        }, this);
        return _(paths).min();
    },

    calcHeuristic: function (player, board, othersMinPathLength) {
        var path = this.findPathToGoal(player, board);
        othersMinPathLength = _.isUndefined(othersMinPathLength)
            ? this.othersPlayersHeuristic(board) : othersMinPathLength;
        var number = (path ? path.length  + 1 : 9999) - othersMinPathLength;
        return number;
    },

    initPossibleMoves: function () {
        this.possibleWallsMoves = this.possibleWallsMoves || this.selectWallsMoves();
    },

    getPossibleMoves: function (board, player) {
        this.initPossibleMoves();
        var playerPositions = board.getValidPositions(player.pick('x', 'y'));
        playerPositions = _(playerPositions).map(function (playerPosition) {
            playerPosition.type = 'P';
            return playerPosition;
        });
        return player.hasFences()
            ? playerPositions.concat(this.possibleWallsMoves) : playerPositions;
    },

    removePossibleWallsMove: function (move) {
        var index = _(this.possibleWallsMoves).indexOf(move);
        this.possibleWallsMoves.splice(index, 1);
    },

    selectWallsMoves: function () {
        var positions = [];
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