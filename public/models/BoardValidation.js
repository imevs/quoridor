if (typeof module !== 'undefined') {
    var _ = require('../utils.js');
    var Backbone = require('backbone');
    var FencesCollection = require('./FenceModel');
    var PlayersCollection = require('./PlayerModel');
}

var BoardValidation = {
    isBetween: function (n1, n2, n3) {
        var min = Math.min(n1, n2);
        var max = Math.max(n1, n2);
        return min <= n3 && n3 < max;
    },
    intToChar: function (i) {
        var a = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k'];
        return a[i];
    },
    /**
     *   f
     * x s x
     *   p
     *
     *  s - sibling
     *  f - sibling
     *  x - possible position
     *  p - player
     */
    isOtherPlayerAndFenceBehindHimVertical: function (pos1, pos2) {
        var playerX = pos1.x, playerY = pos1.y, y = pos2.y;
        var sibling1, sibling2;
        sibling1 = this.players.findWhere({x: playerX, y: y});
        var wallY = y - (playerY < y ? 0 : 1);
        sibling2 = wallY === -1 || wallY === 8 || this.fences.findWhere({
            x: playerX,
            y: wallY,
            state: 'busy',
            type: 'H'
        });

        return !!(sibling1 && sibling2);
    },

    /**
     *    x
     *  f s p
     *    x
     *
     *  s - sibling
     *  f - sibling
     *  x - possible position
     *  p - player
     */
    isOtherPlayerAndFenceBehindHimHorizontal: function (pos1, pos2) {
        var playerX = pos1.x, playerY = pos1.y, x = pos2.x;

        var sibling1, sibling2;
        sibling1 = this.players.findWhere({ x: x, y: playerY });
        var wallX = x - (playerX < x ? 0 : 1);
        sibling2 = wallX === -1 || wallX === 8 || this.fences.findWhere({
            x: wallX,
            y: playerY,
            state: 'busy',
            type: 'V'
        });

        return !!(sibling1 && sibling2);
    },
    isOtherPlayerAndFenceBehindHim: function (pos1, pos2) {
        var playerX = pos1.x, playerY = pos1.y, x = pos2.x, y = pos2.y;

        var isDiagonalSibling = Math.abs(playerX - x) === 1 && Math.abs(playerY - y) === 1;

        if (!isDiagonalSibling) {
            return false;
        }
        return this.isOtherPlayerAndFenceBehindHimVertical(pos1, pos2)
            || this.isOtherPlayerAndFenceBehindHimHorizontal(pos1, pos2);
    },
    noFenceBetweenPositions: function (pos1, pos2) {
        var me = this;
        var playerX = pos1.x, playerY = pos1.y,
            x = pos2.x, y = pos2.y;

        var busyFencesOnLine;
        if (playerX === x) {
            busyFencesOnLine = this.fences.where({
                x: x,
                type: 'H',
                state: 'busy'
            });
            return !_(busyFencesOnLine).find(function (fence) {
                return me.isBetween(playerY, y, fence.get('y'));
            });
        }
        if (playerY === y) {
            busyFencesOnLine = this.fences.where({
                y: y,
                type: 'V',
                state: 'busy'
            });
            return !_(busyFencesOnLine).find(function (fence) {
                return me.isBetween(playerX, x, fence.get('x'));
            });
        }

        return true;
    },
    isNearestPosition: function (currentPos, pos) {
        var prevX = currentPos.x, prevY = currentPos.y;
        return Math.abs(prevX - pos.x) === 1 && prevY === pos.y
            || Math.abs(prevY - pos.y) === 1 && prevX === pos.x;
    },
    isValidPlayerPosition: function (currentPos, newPos) {
        return this.isBetween(0, this.get('boardSize'), newPos.x)
            && this.isBetween(0, this.get('boardSize'), newPos.y)
            && this.players.isFieldNotBusy(newPos)
            && this.noFenceBetweenPositions(currentPos, newPos)
            && (
            this.isNearestPosition(currentPos, newPos) ||
                this.players.isFieldBehindOtherPlayer(currentPos, newPos) ||
                this.players.isFieldNearOtherPlayer(currentPos, newPos) ||
                this.isOtherPlayerAndFenceBehindHim(currentPos, newPos)
            );
    },
    isValidPlayerPositionQuickCheck: function (currentPos, newPos) {
        return this.isBetween(0, this.get('boardSize'), newPos.x)
            && this.isBetween(0, this.get('boardSize'), newPos.y)
            && this.players.isFieldNotBusy(newPos)
            && this.noFenceBetweenPositions(currentPos, newPos)
            && (
            this.isNearestPosition(currentPos, newPos) ||
                this.players.isFieldBehindOtherPlayer(currentPos, newPos) ||
                //this.players.isFieldNearOtherPlayer(currentPos, newPos) ||
                this.isOtherPlayerAndFenceBehindHim(currentPos, newPos)
            );
    },
    isCurrentPlayerTurn: function () {
        var current = this.get('currentPlayer');
        var active = this.get('activePlayer');
        return this.auto || (current === active && !!this.getActivePlayer() && !this.getActiveBot());
    },

    getActiveBot: function () {
        return _(this.bots).find(function (bot) {
            return bot.currentPlayer === this.get('currentPlayer');
        }, this);
    },

    getActivePlayer: function () {
        return this.players.at(this.get('activePlayer'));
    },

    isValidCurrentPlayerPosition: function (x, y) {
        var activePlayer = this.getActivePlayer();

        if (!this.isCurrentPlayerTurn()) {
            return false;
        }

        var currentPos = {x: activePlayer.get('prev_x'), y: activePlayer.get('prev_y')};
        return this.isValidPlayerPosition(currentPos, {x: x, y: y});
    },
    canSelectFences: function () {
        var activePlayer = this.getActivePlayer();
        return activePlayer && activePlayer.hasFences() && this.isCurrentPlayerTurn();
    },

    getNearestPositions: function (pawn) {
        return [
            {x: pawn.x - 1, y: pawn.y - 1},
            {x: pawn.x - 1, y: pawn.y},
            {x: pawn.x - 1, y: pawn.y + 1},

            {x: pawn.x + 1, y: pawn.y - 1},
            {x: pawn.x + 1, y: pawn.y},
            {x: pawn.x + 1, y: pawn.y + 1},

            {x: pawn.x, y: pawn.y - 1},
            {x: pawn.x, y: pawn.y + 1}
        ];
    },

    getPossiblePositions: function (pawn) {
        return [
            {x: pawn.x - 1, y: pawn.y - 1},
            {x: pawn.x - 1, y: pawn.y},
            {x: pawn.x - 1, y: pawn.y + 1},

            {x: pawn.x + 1, y: pawn.y - 1},
            {x: pawn.x + 1, y: pawn.y},
            {x: pawn.x + 1, y: pawn.y + 1},

            {x: pawn.x, y: pawn.y - 1},
            {x: pawn.x, y: pawn.y + 1},

            {x: pawn.x - 2, y: pawn.y},
            {x: pawn.x + 2, y: pawn.y},
            {x: pawn.x, y: pawn.y - 2},
            {x: pawn.x, y: pawn.y + 2}
        ];
    },

    getValidPositions: function (pawn) {
        var positions = this.getPossiblePositions(pawn);
        return _.filter(positions, function (pos) {
            return this.isValidPlayerPositionQuickCheck(pawn, pos);
        }, this);
    },

    doesFenceBreakPlayerPath: function (pawn, coordinate) {
        var open = [pawn.pick('x', 'y')], closed = [];
        var board = this.copy();
        var indexPlayer = this.players.indexOf(pawn);
        var player = board.players.at(indexPlayer);
        var fence = board.fences.findWhere(coordinate.pick('x', 'y', 'type'));
        var sibling = board.fences.getSibling(fence);
        fence.set('state', 'busy');
        if (!sibling) {
            return 'invalid';
        }
        sibling.set('state', 'busy');

        var addNewCoordinates = function (validMoveCoordinate) {
            if (!_(closed).findWhere(validMoveCoordinate)) {
                open.push(validMoveCoordinate);
            }
        };

        while (open.length) {
            var currentCoordinate = open.pop();
            closed.push(currentCoordinate);
            player.set({
                x: currentCoordinate.x,
                y: currentCoordinate.y,
                prev_x: currentCoordinate.x,
                prev_y: currentCoordinate.y
            });
            _(board.getValidPositions(currentCoordinate)).each(addNewCoordinates);
        }

        var canWin = _.some(closed, function (item) {
            return this.players.playersPositions[indexPlayer].isWin(item.x, item.y);
        }, this);
        return !canWin;
    },

    notBreakSomePlayerPath: function (wall) {
        return !this.breakSomePlayerPath(wall);
    },

    isWallNearBorder: function (wall) {
        var boardSize = this.get('boardSize');
        return wall.x === 0 || wall.x === boardSize
            || wall.y === 0  || wall.y === boardSize;
    },

    hasWallsOrPawnsNear: function (wall) {
        var busyFences = this.fences.where({state: 'busy'});
        busyFences = _.map(busyFences, function (item) {
            return item.get('type') + item.get('x') + item.get('y');
        });
        var nearestWalls = _.map(this.getNearestWalls(wall), function (item) {
            return item.type + item.x + item.y;
        });
        var result = !!_.intersection(busyFences, nearestWalls).length;
        return result;
    },

    _getNearestWalls: function (wall) {
        return wall.type === 'H' ? [
            {x: wall.x - 1, y: wall.y, type: 'H'},
            {x: wall.x + 1, y: wall.y, type: 'H'},

            {x: wall.x - 1, y: wall.y, type: 'V'},
            {x: wall.x - 1, y: wall.y + 1, type: 'V'},
            {x: wall.x, y: wall.y, type: 'V'},
            {x: wall.x, y: wall.y + 1, type: 'V'}
        ] : [
            {x: wall.x, y: wall.y - 1, type: 'V'},
            {x: wall.x, y: wall.y + 1, type: 'V'},

            {x: wall.x, y: wall.y - 1, type: 'H'},
            {x: wall.x + 1, y: wall.y - 1, type: 'H'},

            {x: wall.x, y: wall.y, type: 'H'},
            {x: wall.x + 1, y: wall.y, type: 'H'}
        ];
    },

    getNearestWalls: function (wall) {
        var fence = this.fences.findWhere(wall);
        var sibling = this.fences.getSibling(fence);
        var siblingWall = sibling.pick('x', 'y', 'type');
        var all = _(this._getNearestWalls(wall).concat(this._getNearestWalls(siblingWall)));
        all = all.without(all.findWhere(wall), all.findWhere(siblingWall));
        var unique = _.uniq(all, function (a) {
            return a.type + a.x + a.y;
        });
        return _.filter(unique, function (item) {
            return this.isBetween(0, this.get('boardSize'), item.x) ||
                   this.isBetween(0, this.get('boardSize'), item.y);
        }, this);
    },

    getNearestFields: function () {
        return [];
    },

    breakSomePlayerPath: function (wall) {
        var me = this;
        return this.hasWallsOrPawnsNear(wall.pick('x', 'y', 'type')) &&
            me.players.some(function (player) {
                return me.doesFenceBreakPlayerPath(player, wall);
            });
    },

    copy: function () {
        var board = new Backbone.Model({
            boardSize: this.get('boardSize'),
            playersCount: this.get('playersCount'),
            currentPlayer: this.get('currentPlayer'),
            activePlayer: this.get('activePlayer')
        });
        _.extend(board, BoardValidation);
        board.fences = new FencesCollection(this.fences.toJSON());
        board.players = new PlayersCollection(this.players.toJSON());
        board.players.playersPositions = this.players.playersPositions;

        return board;
    }
};

if (typeof module !== 'undefined') {
    module.exports = BoardValidation;
}