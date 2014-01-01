var isNode = typeof module !== 'undefined';

if (isNode) {
    var _ = require('lodash-node/underscore');
    var Backbone = require('backbone');
    var Bot = require('./Bot.js');
    var PlayersCollection = require('../../public/models/PlayerModel.js');
    var FencesCollection = require('../../public/models/FenceModel.js');
    var BoardValidation = require('../../public/models/BoardValidation.js');
    var GameHistoryModel = require('./TurnModel.js');
}

var SmartBot = Bot.extend({

    onMovePlayer: function (params) {
        this.board.players.at(params.playerIndex).set({
            x: params.x,
            y: params.y,
            prev_x: params.x,
            prev_y: params.y
        });

        if (this.isPlayerCanMakeTurn(params.playerIndex)) {
            this.turn();
        }
    },

    onMoveFence: function (params) {
        var fence = this.board.fences.findWhere({
            x: params.x,
            y: params.y,
            type: params.type
        });
        var sibling = this.board.fences.getSibling(fence);
        fence.set('state', 'busy');
        sibling.set('state', 'busy');

        if (this.currentPlayer === params.playerIndex) {
            this.fencesRemaining--;
        }
        if (this.isPlayerCanMakeTurn(params.playerIndex)) {
            this.turn();
        }
    },

    onStart: function (currentPlayer, activePlayer, history, playersCount, boardSize) {
        this.newPositions = [];
        this.fencesPositions = [];
        this.currentPlayer = +currentPlayer;
        this.playersCount = +playersCount;

        var historyModel = new GameHistoryModel({
            boardSize: boardSize || 9,
            playersCount: this.playersCount
        });
        if (history.length) {
            historyModel.get('turns').reset(history);
        } else {
            historyModel.initPlayers();
        }

        this.board = new Backbone.Model({
            boardSize: historyModel.get('boardSize'),
            playersCount: historyModel.get('playersCount'),
            currentPlayer: this.currentPlayer,
            activePlayer: this.activePlayer
        });
        _.extend(this.board, BoardValidation.prototype);
        this.board.fences = new FencesCollection();
        this.board.fences.createFences(historyModel.get('boardSize'));
        this.board.players = new PlayersCollection(historyModel.getPlayerPositions());
        this.player = this.board.players.at(this.currentPlayer);

        var position = historyModel.getPlayerPositions()[this.currentPlayer];
        if (position) {
            this.fencesRemaining = Math.round(this.fencesCount / this.playersCount) - position.movedFences;
        }
    },

    getPossiblePosition: function () {
        //console.profile();
        var board = this.board.copy();
        var player = board.players.at(this.currentPlayer);
        var goalPath = this.findPathToGoal(player, board);
        var result = goalPath.pop();
        delete result.deep;
        //console.profileEnd();
        return result;
    },

    findPathToGoal: function (player, board) {
        var playerXY = player.pick('x', 'y');
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
        var path = this.buildPath(goal, playerXY, board, closed, player);
        board.players.each(function (p, i) {
            p.set(prevPositions[i]);
        });

        return path;
    },

    processBoardForGoal: function (board, player) {
        var open = [], closed = [];
        var currentCoordinate;

        open.push({
            x: player.get('x'),
            y: player.get('y'),
            deep: 0
        });

        var busyFences = board.getBusyFences();

        var addNewCoordinates = function (validMoveCoordinate) {
            var callback = function (item) {
                return item.x === validMoveCoordinate.x && item.y === validMoveCoordinate.y;
            };
            var isNotUsed = !_(closed).some(callback) && !_(open).some(callback);

            if (isNotUsed) {
                open.push({
                    x: validMoveCoordinate.x,
                    y: validMoveCoordinate.y,
                    deep: currentCoordinate.deep + 1
                });
            }
        };

        while (open.length) {
            currentCoordinate = open.shift();
            closed.push({
                x: currentCoordinate.x,
                y: currentCoordinate.y,
                deep: currentCoordinate.deep
            });
            player.set({
                x: currentCoordinate.x,
                y: currentCoordinate.y,
                prev_x: currentCoordinate.x,
                prev_y: currentCoordinate.y
            });
            _(board.getValidPositions(currentCoordinate, busyFences)).each(addNewCoordinates);
        }
        return closed;
    },

    findGoal: function (closed, pawn) {
        var winPositions = _(closed).filter(function (item) {
            return pawn.isWin(item.x, item.y);
        }).sort(function (a, b) {
                return a.deep - b.deep;
            });
        return winPositions[0];
    },

    buildPath: function (from, to, board, closed, player) {
        if (!from) {
            return false;
        }
        var current = from;
        var path = [];

        var func = function (pos) {
            return (pos.deep === current.deep - 1) &&
                _(board.getNearestPositions(current)).findWhere({x: pos.x, y: pos.y});
        };
        while (current.x !== to.x || current.y !== to.y) {
            player.set({
                x: current.x,
                y: current.y,
                prev_x: current.x,
                prev_y: current.y
            });
            path.push(current);
            current = _(closed).detect(func);
            if (!current) {
                console.log('cannot build path');
                return [false];
            }
        }
        return path;
    }

});

if (isNode) {
    module.exports = SmartBot;
}
