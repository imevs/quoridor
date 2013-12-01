var _ = require('underscore');
var util = require('util');
var Bot = require('./bot.js');

var SmartBot = function (id, room) {
    this.id = id;
    this.playerId = id;
    this.board = room;
    this.initEvents();
    this.playersCount = room.get('playersCount');
};

util.inherits(SmartBot, Bot);

_.extend(SmartBot.prototype, {

    getPossiblePosition: function () {
        var pawn = this.board.players.findWhere({
            id: this.playerId
        });
        var goalPath = this.findPathToGoal(pawn);
        var result = goalPath.pop();
        delete result.deep;
        return result;
    },

    findPathToGoal: function (pawn) {
        var board = this.board.copy();
        var indexPlayer = this.board.players.indexOf(pawn);
        var player = board.players.at(indexPlayer);

        var closed = this.processBoardForGoal(board, player);
        var goal = this.findGoal(closed, this.board.players.playersPositions[indexPlayer]);
        return this.buildPath(goal, pawn.pick('x', 'y'), board, closed, player);
    },

    processBoardForGoal: function (board, player) {
        var open = [], closed = [];
        var currentCoordinate;

        open.push({
            x: player.get('x'),
            y: player.get('y'),
            deep: 0
        });

        var addNewCoordinates = function (validMoveCoordinate) {
            var isNotUsed = !_(closed).findWhere(validMoveCoordinate)
                && !_(open).findWhere(validMoveCoordinate);
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
            _(board.getValidPositions(currentCoordinate)).each(addNewCoordinates);
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
        var current = from;
        var path = [];

        var func = function (pos) {
            return pos.deep === current.deep - 1 &&
                _(board.getValidPositions(current)).findWhere({
                    x: pos.x,
                    y: pos.y
                });
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
        }
        return path;
    }

});

module.exports = SmartBot;