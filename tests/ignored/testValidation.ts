import { assert } from "chai";

import { PlayersCollection } from '../../src/models/PlayerModel';
import { BoardValidation as BoardModel } from '../../src/models/BoardValidation';

var board: BoardModel;

describe('test-validation', function () {

    beforeEach(function () {
        /* _ _ _
         0|_|x|_|
         1|_|_|_|
         2|_|x|_|
           0 1 2
         */
        board = new BoardModel({
            playersCount: 2,
            botsCount   : 0,
            currentPlayer: 0,
            activePlayer: 0,
            boardSize   : 3
        });
        board.players = new PlayersCollection([
            {x: 1, y: 0},
            {x: 1, y: 2}
        ]);
        board.players.playersPositions = [
            {x: 1, y: 0, color: 'red', name: "", isWin: function (_x, y) {
                return y === 2;
            } },
            {x: 1, y: 2, color: 'yellow', name: "", isWin: function (x) {
                return x === 2;
            } }
        ];
    });

    it('getValidPositions items (top center)', function () {
        var expected = [
            { x: 0, y: 0 },
            { x: 2, y: 0 },
            { x: 1, y: 1 }
        ];
        assert.deepEqual(board.getValidPositions({x: 1, y: 0}, []), expected);
    });

    it('getValidPositions items (top left)', function () {
        var expected = [
            { x: 0, y: 1 },
            { x: 2, y: 0 }
        ];
        assert.deepEqual(board.getValidPositions({x: 0, y: 0}, []), expected);
    });

    it('getValidPositions items (top left) - empty board', function () {
        board.players = new PlayersCollection([]);
        var expected = [
            { x: 1, y: 0 },
            { x: 0, y: 1 }
        ];
        assert.deepEqual(board.getValidPositions({x: 0, y: 0}, []), expected);
    });

    it('getValidPositions items (center of the board)', function () {
        var expected = [
            { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 0 }, { x: 2, y: 1 }
        ];
        assert.deepEqual(board.getValidPositions({x: 1, y: 1}, []), expected);
    });

    it('getValidPositions items (center of the board) - empty board', function () {
        board.players = new PlayersCollection([]);
        var expected = [
            { x: 0, y: 1 },
            { x: 2, y: 1 },
            { x: 1, y: 0 },
            { x: 1, y: 2 }
        ];
        assert.deepEqual(board.getValidPositions({x: 1, y: 1}, []), expected);
    });

    it('doesFenceBreakPlayerPath - first player - false', function () {
        assert.ok(!board.doesFenceBreakPlayerPath(
            board.players.at(0),
            board.fences.findWhere({x: 1, y: 1, type: 'H'})!
        ));
    });

    it('doesFenceBreakPlayerPath - second player - false', function () {
        assert.ok(!board.doesFenceBreakPlayerPath(
            board.players.at(0),
            board.fences.findWhere({x: 1, y: 1, type: 'H'})!
        ));
    });

    it('notBreakSomePlayerPath - all players - true', function () {
        assert.ok(board.notBreakSomePlayerPath(
            board.fences.findWhere({x: 1, y: 1, type: 'H'})!
        ));
    });

    it('doesFenceBreakPlayerPath - first player - true', function () {
        board.fences.findWhere({x: 2, y: 1, type: 'H'})!.set('state', 'busy');

        assert.ok(board.doesFenceBreakPlayerPath(
            board.players.at(0),
            board.fences.findWhere({x: 1, y: 1, type: 'H'})!
        ));
    });

    it('doesFenceBreakPlayerPath - second player - true', function () {
        board.fences.findWhere({x: 2, y: 1, type: 'H'})!.set('state', 'busy');

        assert.ok(board.doesFenceBreakPlayerPath(
            board.players.at(0),
            board.fences.findWhere({x: 1, y: 1, type: 'H'})!
        ));
    });

    it('breakSomePlayerPath - all players - true', function () {
        board.fences.findWhere({x: 2, y: 1, type: 'H'})!.set('state', 'busy');

        assert.ok(board.breakSomePlayerPath(
            board.fences.findWhere({x: 1, y: 1, type: 'H'})!
        ));
    });

    it('test isWallNearBorder - false', function () {
        var wall = {x: 4, y: 4, type: 'H'};
        assert.ok(!board.isWallNearBorder(wall));
    });

    it('test isWallNearBorder - OK', function () {
        var wall = {x: 0, y: 4, type: 'H'};
        assert.ok(board.isWallNearBorder(wall));
    });

    it('test getNearestWalls - Horizontal', function () {
        board = new BoardModel({
            playersCount: 2,
            botsCount   : 0,
            currentPlayer: 0,
            activePlayer: 0,
            boardSize   : 9
        });
        var wall = {x: 4, y: 3, type: 'H'};
        assert.deepEqual(board.getNearestWalls(wall), [
            {x: 5, y: 3, type: 'H'},
            {x: 3, y: 3, type: 'V'},
            {x: 3, y: 4, type: 'V'},
            {x: 4, y: 3, type: 'V'},
            {x: 4, y: 4, type: 'V'},
            {x: 2, y: 3, type: 'H'},
            {x: 2, y: 3, type: 'V'},
            {x: 2, y: 4, type: 'V'}
        ]);
    });

    it('test getNearestWalls - Vertical', function () {
        board = new BoardModel({
            playersCount: 2,
            botsCount   : 0,
            currentPlayer: 0,
            activePlayer: 0,
            boardSize   : 9
        });
        var wall = {x: 1, y: 4, type: 'V'};
        assert.deepEqual(board.getNearestWalls(wall), [
            {x: 1, y: 5, type: 'V'},
            {x: 1, y: 3, type: 'H'},
            {x: 2, y: 3, type: 'H'},
            {x: 1, y: 4, type: 'H'},
            {x: 2, y: 4, type: 'H'},
            {x: 1, y: 2, type: 'V'},
            {x: 1, y: 2, type: 'H'},
            {x: 2, y: 2, type: 'H'}
        ]);
    });

    it('test hasWallsOrPawnsNear - false', function () {
        board = new BoardModel({
            playersCount: 2,
            botsCount   : 0,
            currentPlayer: 0,
            activePlayer: 0,
            boardSize   : 9
        });
        var wall = {x: 1, y: 4, type: 'V'};

        assert.ok(!board.hasWallsOrPawnsNear(wall));
    });

    it('test hasWallsOrPawnsNear - OK', function () {
        board = new BoardModel({
            playersCount: 2,
            botsCount   : 0,
            currentPlayer: 0,
            activePlayer: 0,
            boardSize   : 9
        });

        var wall = {x: 1, y: 4, type: 'V'};

        board.fences.findWhere({x: 1, y: 3, type: 'H'})!.set('state', 'busy');
        assert.ok(board.hasWallsOrPawnsNear(wall));
    });

});