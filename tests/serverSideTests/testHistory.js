var nodeunit = require('nodeunit');
var Backbone = require('backbone');
var TurnModel = require('../../public/models/TurnModel.js');

Backbone.sync = function () {};

var gameHistory;
exports['test-quoridor'] = nodeunit.testCase({

    setUp: function (test) {
        gameHistory = new TurnModel();
        test();
    },

    'create history': function (test) {
        test.equal(gameHistory.get('turns').length, 0);
        test.done();
    },

    'move player 1': function (test) {
        gameHistory.add({
            x: 4,
            y: 1,
            t: 'p'
        });
        test.equals(gameHistory.at(0), 'e8');

        test.done();
    },

    'move players 1-2': function (test) {
        gameHistory.add({
            x: 4,
            y: 1,
            t: 'p'
        });

        gameHistory.add({
            x: 4,
            y: 7,
            t: 'p'
        });
        test.equals(gameHistory.at(0), 'e8 e2');

        test.done();
    },

    'move player 1-2-1': function (test) {
        gameHistory.add({
            x: 4,
            y: 1,
            t: 'p'
        });

        gameHistory.add({
            x: 4,
            y: 7,
            t: 'p'
        });

        gameHistory.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        test.equals(gameHistory.at(0), 'e8 e2');
        test.equals(gameHistory.at(1), 'e7');

        test.done();
    },

    'move 1 fence': function (test) {
        gameHistory.add({
            x : 4,
            x2: 5,
            y : 1,
            y2: 1,
            t : 'f'
        });

        test.equals(gameHistory.at(0), 'e7f7');

        test.done();
    },

    'move 2 fences': function (test) {
        gameHistory.add({
            x : 4,
            x2: 5,
            y : 1,
            y2: 1,
            t : 'f'
        });
        gameHistory.add({
            x : 4,
            x2: 5,
            y : 7,
            y2: 7,
            t : 'f'
        });

        test.equals(gameHistory.at(0), 'e7f7 e1f1');

        test.done();
    },

    'move player and fence': function (test) {
        gameHistory.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        gameHistory.add({
            x : 4,
            x2: 5,
            y : 7,
            y2: 7,
            t : 'f'
        });

        test.equals(gameHistory.at(0), 'e7 e1f1');

        test.done();
    },

    'getLength after first turn first player': function (test) {
        gameHistory.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        test.equals(gameHistory.getLength(), 1);

        test.done();
    },

    'getLength after first turn second player': function (test) {
        gameHistory.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        gameHistory.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        test.equals(gameHistory.getLength(), 1);

        test.done();
    },

    'getLength after second turn first player': function (test) {
        gameHistory.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        gameHistory.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        gameHistory.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        test.equals(gameHistory.getLength(), 2);

        test.done();
    },

    'getPlayersPositions getLength of array': function (test) {
        gameHistory.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        gameHistory.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        gameHistory.add({
            x: 4,
            y: 2,
            t: 'p'
        });

        test.equals(2, gameHistory.getPlayerPositions().length);

        test.done();
    },

    'getPlayersPositions getLength of array (4)': function (test) {
        var history = new TurnModel({playersCount: 4});
        history.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        history.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        history.add({
            x: 4,
            y: 2,
            t: 'p'
        });

        test.equals(4, history.getPlayerPositions().length);

        test.done();
    },

    'getFencesPositions getLength of array': function (test) {
        gameHistory.add({
            x : 4,
            x2: 5,
            y : 7,
            y2: 7,
            t : 'f'
        });
        gameHistory.add({
            x : 4,
            x2: 5,
            y : 7,
            y2: 7,
            t : 'f'
        });
        gameHistory.add({
            x : 4,
            x2: 5,
            y : 7,
            y2: 7,
            t : 'f'
        });

        test.equals(3, gameHistory.getFencesPositions().length);

        test.done();
    },

    'getFencesPositions check data': function (test) {
        gameHistory.add({
            x : 4,
            x2: 5,
            y : 7,
            y2: 7,
            t : 'f'
        });
        gameHistory.add({
            x : 4,
            x2: 5,
            y : 7,
            y2: 7,
            t : 'f'
        });
        gameHistory.add({
            x : 7,
            x2: 7,
            y : 4,
            y2: 5,
            t : 'f'
        });

        var expected = [
            { x: 4, x2: 5, y: 7, y2: 7, t: 'H' },
            { x: 4, x2: 5, y: 7, y2: 7, t: 'H' },
            { x: 7, x2: 7, y: 4, y2: 5, t: 'V' }
        ];
        test.deepEqual(expected, gameHistory.getFencesPositions());

        test.done();
    },

    'getPlayersPositions check positions': function (test) {
        gameHistory.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        gameHistory.add({
            x: 5,
            y: 1,
            t: 'p'
        });
        gameHistory.add({
            x: 4,
            y: 3,
            t: 'p'
        });
        gameHistory.add({
            x : 4,
            x2: 5,
            y : 7,
            y2: 7,
            t : 'f'
        });

        var expected = [
            { x: 4, y: 3, movedFences: 0 },
            { x: 5, y: 1, movedFences: 1 }
        ];
        test.deepEqual(expected, gameHistory.getPlayerPositions());

        test.done();
    },

    'test initPlayers': function (test) {
        gameHistory = new TurnModel({
            playersCount: '2'
        });
        gameHistory.initPlayers();
        gameHistory.initPlayers(); // tests for idempotency of initPlayers method
        var expected = [
            { x: 4, y: 0, movedFences: 0 },
            { x: 4, y: 8, movedFences: 0 }
        ];
        test.deepEqual(expected, gameHistory.getPlayerPositions());

        test.done();
    }

});
