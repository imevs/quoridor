if (typeof module !== 'undefined') {
    var _ = require('underscore');
    var Bot = require('./bot.js');
}

var SmartBot = Bot.extend({

    constructor: function (id, room) {
        Bot.prototype.constructor.apply(this, arguments);
        this.board = room;
        this.player = room.players.findWhere({url: id});
        this.index = room.players.indexOf(this.player);
        this.playersCount = room.get('playersCount');
    },

    getPossiblePosition: function () {
        var board = this.board.copy();
        var player = board.players.at(this.index);
        var goalPath = this.findPathToGoal(player, board);
        var result = goalPath.pop();
        delete result.deep;
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

if (typeof module !== 'undefined') {
    module.exports = SmartBot;
}