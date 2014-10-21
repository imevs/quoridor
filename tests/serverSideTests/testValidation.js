var assert = this.chai ? chai.assert : require('chai').assert;

var PlayersCollection = this.PlayersCollection || require('../../public/models/PlayerModel.js');
var Room = this.Room || require('../../server/models/room.js');

var board;

describe('test-validation', function () {

    beforeEach(function (test) {
        /* _ _ _
         0|_|x|_|
         1|_|_|_|
         2|_|x|_|
           0 1 2
         */
        board = Room.createRoom({
            playersCount: 2,
            boardSize   : 3
        });
        board.players = new PlayersCollection([
            {x: 1, y: 0},
            {x: 1, y: 2}
        ]);
        board.players.playersPositions = [
            {x: 1, y: 0, color: 'red', isWin: function (x, y) {
                return y === 2;
            } },
            {x: 1, y: 2, color: 'yellow', isWin: function (x) {
                return x === 2;
            } }
        ];

        test();
    });

    it('getValidPositions items (top center)', function (test) {
        var expected = [
            { x: 0, y: 0 },
            { x: 2, y: 0 },
            { x: 1, y: 1 }
        ];
        assert.deepEqual(board.getValidPositions({x: 1, y: 0}), expected);
        test();
    });

    it('getValidPositions items (top left)', function (test) {
        var expected = [
            { x: 0, y: 1 },
            { x: 2, y: 0 }
        ];
        assert.deepEqual(board.getValidPositions({x: 0, y: 0}), expected);
        test();
    });

    it('getValidPositions items (top left) - empty board', function (test) {
        board.players = new PlayersCollection([]);
        var expected = [
            { x: 1, y: 0 },
            { x: 0, y: 1 }
        ];
        assert.deepEqual(board.getValidPositions({x: 0, y: 0}), expected);
        test();
    });

    it('getValidPositions items (center of the board)', function (test) {
        var expected = [
            { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 0 }, { x: 2, y: 1 }
        ];
        assert.deepEqual(board.getValidPositions({x: 1, y: 1}), expected);
        test();
    });

    it('getValidPositions items (center of the board) - empty board', function (test) {
        board.players = new PlayersCollection([]);
        var expected = [
            { x: 0, y: 1 },
            { x: 2, y: 1 },
            { x: 1, y: 0 },
            { x: 1, y: 2 }
        ];
        assert.deepEqual(board.getValidPositions({x: 1, y: 1}), expected);
        test();
    });

    it('doesFenceBreakPlayerPath - first player - false', function (test) {
        assert.ok(!board.doesFenceBreakPlayerPath(
            board.players.at(0),
            board.fences.findWhere({x: 1, y: 1, type: 'H'})
        ));

        test();
    });

    it('doesFenceBreakPlayerPath - second player - false', function (test) {
        assert.ok(!board.doesFenceBreakPlayerPath(
            board.players.at(0),
            board.fences.findWhere({x: 1, y: 1, type: 'H'})
        ));

        test();
    });

    it('notBreakSomePlayerPath - all players - true', function (test) {
        assert.ok(board.notBreakSomePlayerPath(
            board.fences.findWhere({x: 1, y: 1, type: 'H'})
        ));

        test();
    });

    it('doesFenceBreakPlayerPath - first player - true', function (test) {
        board.fences.findWhere({x: 2, y: 1, type: 'H'}).set('state', 'busy');

        assert.ok(board.doesFenceBreakPlayerPath(
            board.players.at(0),
            board.fences.findWhere({x: 1, y: 1, type: 'H'})
        ));

        test();
    });

    it('doesFenceBreakPlayerPath - second player - true', function (test) {
        board.fences.findWhere({x: 2, y: 1, type: 'H'}).set('state', 'busy');

        assert.ok(board.doesFenceBreakPlayerPath(
            board.players.at(0),
            board.fences.findWhere({x: 1, y: 1, type: 'H'})
        ));

        test();
    });

    it('breakSomePlayerPath - all players - true', function (test) {
        board.fences.findWhere({x: 2, y: 1, type: 'H'}).set('state', 'busy');

        assert.ok(board.breakSomePlayerPath(
            board.fences.findWhere({x: 1, y: 1, type: 'H'})
        ));

        test();
    });

    it('test isWallNearBorder - false', function (test) {
        var wall = {x: 4, y: 4, type: 'H'};
        assert.ok(!board.isWallNearBorder(wall));

        test();
    });

    it('test isWallNearBorder - OK', function (test) {
        var wall = {x: 0, y: 4, type: 'H'};
        assert.ok(board.isWallNearBorder(wall));

        test();
    });

    it('test getNearestWalls - Horizontal', function (test) {
        board = Room.createRoom({playersCount: 2, boardSize: 9 });
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

        test();
    });

    it('test getNearestWalls - Vertical', function (test) {
        board = Room.createRoom({playersCount: 2, boardSize: 9 });
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

        test();
    });

    it('test hasWallsOrPawnsNear - false', function (test) {
        board = Room.createRoom({playersCount: 2, boardSize: 9 });
        var wall = {x: 1, y: 4, type: 'V'};

        assert.ok(!board.hasWallsOrPawnsNear(wall));

        test();
    });

    it('test hasWallsOrPawnsNear - OK', function (test) {
        board = Room.createRoom({playersCount: 2, boardSize: 9 });
        var wall = {x: 1, y: 4, type: 'V'};

        board.fences.findWhere({x: 1, y: 3, type: 'H'}).set('state', 'busy');
        assert.ok(board.hasWallsOrPawnsNear(wall));

        test();
    });

});