var isNode = typeof module !== 'undefined';

if (isNode) {
    var _ = require('lodash-node/underscore');
    var SmartBot = require('./SmartBot.js');
}

var MegaBot = SmartBot.extend({

    possibleWallsMoves: false,
    satisfiedRate: 1,

    doTurn     : function () {
        var turn = this.getBestTurn();
        var eventInfo = {
            x: turn.x,
            y: turn.y,
            type: turn.type,
            playerIndex: this.id
        };
        if (turn.type === 'P') {
            this.trigger('client_move_player', eventInfo);
        } else {
            this.trigger('client_move_fence', eventInfo);
        }
    },

    initOthersPlayers: function (board) {
        this.othersPlayers = _(board.players.models).reject(function (v) {
            return v.get('url') === this.playerId;
        }, this);
    },

    getBestTurn: function () {
        //console.time('getBestTurn');
        //console.profile && console.profile('getBestTurn');
        var board = this.board.copy();
        var player = board.players.at(this.currentPlayer);
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
        //console.timeEnd('getBestTurn');
        //console.profile && console.profileEnd('getBestTurn');
        return minRatedMoves[_.random(0, minRatedMoves.length - 1)];
    },

    getRatesForPlayersMoves: function (moves, player, board) {
        var result = [];
        _(moves).each(function (move) {
            if (move.type === 'P') {
                var prevPosition = player.pick('x', 'y', 'prev_x', 'prev_y');
                player.set({
                    x: move.x,
                    y: move.y,
                    prev_x: move.x,
                    prev_y: move.y
                });
                move.rate = this.calcHeuristic(player, board);
                player.set(prevPosition);
                result.push(move);
            }
        }, this);
        return result;
    },

    getRatesForWallsMoves: function (moves, player, board) {
        if (!this.canMoveFence()) {
            return [];
        }
        var satisfiedCount = 0, result = [];
        _(moves).some(function (item) {
            var move = {x: item.x, y: item.y, type: item.type };
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

    calcHeuristic: function (player, board) {
        var otherPlayersPaths = [];
        var currentPlayerPathLength = 0;
        board.players.each(function (player, index) {
            if (this.currentPlayer === index) {
                currentPlayerPathLength = this.getCountStepsToGoal(player, board) + 1;
            } else {
                otherPlayersPaths.push(this.getCountStepsToGoal(player, board));
            }
        }, this);
        var othersMinPathLength = _(otherPlayersPaths).min();
        return currentPlayerPathLength - othersMinPathLength;
    },

    getCountStepsToGoal: function (player, board) {
        var indexPlayer = board.players.indexOf(player);

        /**
         * leave out of account another players positions
         */
        var prevPositions = [];
        board.players.each(function (p, i) {
            prevPositions.push(p.pick('x', 'y', 'prev_x', 'prev_y'));
            if (i !== indexPlayer) {
                p.set({x: -1, y: -1, prev_x: -1, prev_y: -1});
            }
        });

        var closed = this.processBoardForGoal(board, player);

        var goal = this.findGoal(closed, board.players.playersPositions[indexPlayer]);
        board.players.each(function (p, i) { p.set(prevPositions[i]); });

        return goal ? goal.deep : 9999;
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
        var item = _(this.possibleWallsMoves).findWhere(move);
        var index = _(this.possibleWallsMoves).indexOf(item);
        if (index !== -1) {
            this.possibleWallsMoves.splice(index, 1);
        }
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

if (isNode) {
    module.exports = MegaBot;
}