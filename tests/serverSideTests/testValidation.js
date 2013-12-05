var nodeunit = require('nodeunit');

var PlayersCollection = require('../../public/models/PlayerModel.js');
var Room = require('../../server/models/room.js');

var board;

exports['test-validation'] = nodeunit.testCase({

    setUp: function (test) {
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
    },

    'getValidPositions items (top center)': function (test) {
        var expected = [
            { x: 0, y: 0 },
            { x: 2, y: 0 },
            { x: 1, y: 1 }
        ];
        test.deepEqual(board.getValidPositions({x: 1, y: 0}), expected);
        test.done();
    },

    'getValidPositions items (top left)': function (test) {
        var expected = [
            { x: 0, y: 1 },
            { x: 2, y: 0 }
        ];
        test.deepEqual(board.getValidPositions({x: 0, y: 0}), expected);
        test.done();
    },

    'getValidPositions items (top left) - empty board': function (test) {
        board.players = new PlayersCollection([]);
        var expected = [
            { x: 1, y: 0 },
            { x: 0, y: 1 }
        ];
        test.deepEqual(board.getValidPositions({x: 0, y: 0}), expected);
        test.done();
    },

    'getValidPositions items (center of the board)': function (test) {
        var expected = [
            { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 0 }, { x: 2, y: 1 }
        ];
        test.deepEqual(board.getValidPositions({x: 1, y: 1}), expected);
        test.done();
    },

    'getValidPositions items (center of the board) - empty board': function (test) {
        board.players = new PlayersCollection([]);
        var expected = [
            { x: 0, y: 1 },
            { x: 2, y: 1 },
            { x: 1, y: 0 },
            { x: 1, y: 2 }
        ];
        test.deepEqual(board.getValidPositions({x: 1, y: 1}), expected);
        test.done();
    },

    'doesFenceBreakPlayerPath - first player - false': function (test) {
        test.ok(!board.doesFenceBreakPlayerPath(
            board.players.at(0),
            board.fences.findWhere({x: 1, y: 1, type: 'H'})
        ));

        test.done();
    },

    'doesFenceBreakPlayerPath - second player - false': function (test) {
        test.ok(!board.doesFenceBreakPlayerPath(
            board.players.at(0),
            board.fences.findWhere({x: 1, y: 1, type: 'H'})
        ));

        test.done();
    },

    'notBreakSomePlayerPath - all players - true': function (test) {
        test.ok(board.notBreakSomePlayerPath(
            board.fences.findWhere({x: 1, y: 1, type: 'H'})
        ));

        test.done();
    },

    'doesFenceBreakPlayerPath - first player - true': function (test) {
        board.fences.findWhere({x: 2, y: 1, type: 'H'}).set('state', 'busy');

        test.ok(board.doesFenceBreakPlayerPath(
            board.players.at(0),
            board.fences.findWhere({x: 1, y: 1, type: 'H'})
        ));

        test.done();
    },

    'doesFenceBreakPlayerPath - second player - true': function (test) {
        board.fences.findWhere({x: 2, y: 1, type: 'H'}).set('state', 'busy');

        test.ok(board.doesFenceBreakPlayerPath(
            board.players.at(0),
            board.fences.findWhere({x: 1, y: 1, type: 'H'})
        ));

        test.done();
    },

    'breakSomePlayerPath - all players - true': function (test) {
        board.fences.findWhere({x: 2, y: 1, type: 'H'}).set('state', 'busy');

        test.ok(board.breakSomePlayerPath(
            board.fences.findWhere({x: 1, y: 1, type: 'H'})
        ));

        test.done();
    }

});