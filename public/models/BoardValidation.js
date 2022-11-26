var isNode = typeof module !== 'undefined';

if (isNode) {
    var _ = require('../utils.js');
    var Backbone = require('backbone');
    var FencesCollection = require('./FenceModel');
    var PlayersCollection = require('./PlayerModel');
}

var BoardValidation = function () { };

BoardValidation.prototype = {
    isBetween: function (n1, n2, n3) {
        var min, max;
        if (n1 > n2) {
            min = n2;
            max = n1;
        } else {
            min = n1;
            max = n2;
        }
        return min <= n3 && n3 < max;
    },
    intToChar: function (i) {
        if (this.get('debug')) {
            return i + '';
        }
        var a = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k'];
        return a[i];
    },
    intToInt: function (i) {
        if (this.get('debug')) {
            return i + '';
        }
        return this.get('boardSize') - i;
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
    isOtherPlayerAndFenceBehindHimVertical: function (pos1, pos2, busyFences) {
        var playerX = pos1.x, playerY = pos1.y, y = pos2.y;
        var wallY = y - (playerY < y ? 0 : 1);
        var sibling1 = this.players.isFieldBusy({x: playerX, y: y});
        var result = sibling1 && (wallY === -1 || wallY === 8 || busyFences.findWhere({
            x: playerX,
            y: wallY,
            type: 'H'
        }));

        return !!result;
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
    isOtherPlayerAndFenceBehindHimHorizontal: function (pos1, pos2, busyFences) {
        var playerX = pos1.x, playerY = pos1.y, x = pos2.x;
        var sibling1 = this.players.isFieldBusy({ x: x, y: playerY });
        var wallX = x - (playerX < x ? 0 : 1);
        var result = sibling1 && (wallX === -1 || wallX === 8 || busyFences.findWhere({
            x: wallX,
            y: playerY,
            type: 'V'
        }));

        return !!result;
    },
    isOtherPlayerAndFenceBehindHim: function (pos1, pos2, busyFences) {
        var playerX = pos1.x, playerY = pos1.y, x = pos2.x, y = pos2.y;

        var isDiagonalSibling = Math.abs(playerX - x) === 1 && Math.abs(playerY - y) === 1;

        if (!isDiagonalSibling) {
            return false;
        }
        return this.isOtherPlayerAndFenceBehindHimVertical(pos1, pos2, busyFences)
            || this.isOtherPlayerAndFenceBehindHimHorizontal(pos1, pos2, busyFences);
    },
    noFenceBetweenPositions: function (pos1, pos2, busyFences) {
        var me = this, playerX = pos1.x, playerY = pos1.y, x = pos2.x, y = pos2.y, callback;

        busyFences = this.getBusyFences(busyFences);

        if (playerX === x) {
            callback = function (fence) {
                return fence.x === x && fence.type === 'H' && me.isBetween(playerY, y, fence.y);
            };
        } else if (playerY === y) {
            callback = function (fence) {
                return fence.y === y && fence.type === 'V' && me.isBetween(playerX, x, fence.x);
            };
        } else {
            var minY = Math.min(playerY, y);
            var minX = Math.min(playerX, x);
            callback = function (fence) {
                return (fence.type === 'V' && fence.x === minX && (fence.y === y))
                    || (fence.type === 'H' && fence.y === minY && (fence.x === x));
            };
        }
        return !busyFences.some(callback);
    },
    isNearestPosition: function (currentPos, pos) {
        var prevX = currentPos.x, prevY = currentPos.y;
        return Math.abs(prevX - pos.x) === 1 && prevY === pos.y
            || Math.abs(prevY - pos.y) === 1 && prevX === pos.x;
    },
    isValidPlayerPosition: function (currentPos, newPos, busyFences) {
        busyFences = this.getBusyFences(busyFences);
        return this.isBetween(0, this.get('boardSize'), newPos.x)
            && this.isBetween(0, this.get('boardSize'), newPos.y)
            && !this.players.isFieldBusy(newPos)
            && this.noFenceBetweenPositions(currentPos, newPos, busyFences)
            && (
                this.isNearestPosition(currentPos, newPos) ||
                this.players.isFieldBehindOtherPlayer(currentPos, newPos) ||
                this.players.isFieldNearOtherPlayer(currentPos, newPos) ||
                this.isOtherPlayerAndFenceBehindHim(currentPos, newPos, busyFences)
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
        var busyFences = this.getBusyFences();
        var currentPos = {x: activePlayer.get('prev_x'), y: activePlayer.get('prev_y')};
        return this.isValidPlayerPosition(currentPos, {x: x, y: y}, busyFences);
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

    getBusyFences: function (busyFences) {
        if (busyFences) {
            return busyFences;
        }
        var callback = function (item) {
            return item.get('state') === 'busy';
        };
        var result = _(this.fences.filter(callback)).map(function (f) {
            return f.toJSON();
        });
        return _(result);
    },

    getValidPositions: function (pawn, busyFences) {
        busyFences = this.getBusyFences(busyFences);
        this._getPossiblePositions = this._getPossiblePositions ||
            _.memoize(this.getPossiblePositions, function (pawn) {
                return pawn.x * 10 + pawn.y;
            });
        var positions = this._getPossiblePositions(pawn);
        return _(positions).filter(function (pos) {
            return this.isValidPlayerPosition(pawn, pos, busyFences);
        }, this);
    },

    generatePositions: function (boardSize) {
        var notVisitedPositions = {};
        _([boardSize, boardSize]).iter(function (i, j) {
            notVisitedPositions[10 * i + j] = 1;
        });
        return notVisitedPositions;
    },

    getAddNewCoordinateFunc: function (notVisitedPositions, open, newDeep) {
        newDeep = newDeep || { value: 0};
        return function (validMoveCoordinate) {
            var hash = validMoveCoordinate.x * 10 + validMoveCoordinate.y;
            if (notVisitedPositions[hash]) {
                open.push({
                    x: validMoveCoordinate.x,
                    y: validMoveCoordinate.y,
                    deep: newDeep.value
                });
                delete notVisitedPositions[hash];
            }
        };
    },

    doesFenceBreakPlayerPath: function (pawn, coordinate) {
        var open = [pawn.pick('x', 'y')], closed = [];
        var board = this.copy();
        var indexPlayer = this.players.indexOf(pawn);
        var player = board.players.at(indexPlayer);
        var fence = board.fences.findWhere(coordinate.pick('x', 'y', 'type'));
        var sibling = board.fences.getSibling(fence);
        if (!sibling) {
            return 'invalid';
        }
        fence.set('state', 'busy');
        sibling.set('state', 'busy');

        var busyFences = board.getBusyFences();
        var notVisitedPositions = board.generatePositions(board.get('boardSize'));
        delete notVisitedPositions[10 * player.get('x') + player.get('y')];
        var addNewCoordinates = board.getAddNewCoordinateFunc(notVisitedPositions, open);

        while (open.length) {
            var currentCoordinate = open.pop();
            if (this.players.playersPositions[indexPlayer].isWin(currentCoordinate.x, currentCoordinate.y)) {
                return false;
            }
            closed.push(currentCoordinate);
            player.set({
                x: currentCoordinate.x,
                y: currentCoordinate.y,
                prev_x: currentCoordinate.x,
                prev_y: currentCoordinate.y
            });
            _(board.getValidPositions(currentCoordinate, busyFences)).each(addNewCoordinates);
        }
        return true;
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
        var busyFences = this.getBusyFences();
        busyFences = busyFences.map(function (item) {
            return item.type + item.x + item.y;
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
        return _(unique).filter(function (item) {
            return this.isBetween(0, this.get('boardSize'), item.x) ||
                this.isBetween(0, this.get('boardSize'), item.y);
        }, this);
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
        _.extend(board, BoardValidation.prototype);
        board.fences = new FencesCollection(this.fences.toJSON());
        board.players = new PlayersCollection(this.players.toJSON());
        board.players.playersPositions = this.players.playersPositions;

        return board;
    }
};

if (isNode) {
    module.exports = BoardValidation;
}