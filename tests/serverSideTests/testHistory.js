var nodeunit = require('nodeunit');
var Backbone = require('backbone');
var TurnModel = require('../../public/models/TurnModel.js');
var sinon = require('sinon');

Backbone.sync = function() {};

var history;
exports['quoridor'] = nodeunit.testCase({

    setUp   : function (test) {
        history = new TurnModel();
        test();
    },

    'create history': function (test) {
        test.equal(history.get('turns').length, 0);
        test.done();
    },

    'move player 1': function(test) {
        history.add({
            x: 4,
            y: 1,
            t: 'p'
        });
        test.equals(history.at(0), 'e8');

        test.done();
    },

    'move players 1-2': function(test) {
        history.add({
            x: 4,
            y: 1,
            t: 'p'
        });

        history.add({
            x: 4,
            y: 7,
            t: 'p'
        });
        test.equals(history.at(0), 'e8 e2');

        test.done();
    },

    'move player 1-2-1': function(test) {
        history.add({
            x: 4,
            y: 1,
            t: 'p'
        });

        history.add({
            x: 4,
            y: 7,
            t: 'p'
        });

        history.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        test.equals(history.at(0), 'e8 e2');
        test.equals(history.at(1), 'e7');

        test.done();
    },

    'move 1 fence': function(test) {
        history.add({
            x: 4,
            x2: 5,
            y: 1,
            y2: 1,
            t: 'f'
        });

        test.equals(history.at(0), 'e7f7');

        test.done();
    },

    'move 2 fences': function(test) {
        history.add({
            x: 4,
            x2: 5,
            y: 1,
            y2: 1,
            t: 'f'
        });
        history.add({
            x: 4,
            x2: 5,
            y: 7,
            y2: 7,
            t: 'f'
        });

        test.equals(history.at(0), 'e7f7 e1f1');

        test.done();
    },

    'move player and fence': function(test) {
        history.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        history.add({
            x: 4,
            x2: 5,
            y: 7,
            y2: 7,
            t: 'f'
        });

        test.equals(history.at(0), 'e7 e1f1');

        test.done();
    },

    'getLength after first turn first player': function(test) {
        history.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        test.equals(history.getLength(), 1);

        test.done();
    },

    'getLength after first turn second player': function(test) {
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
        test.equals(history.getLength(), 1);

        test.done();
    },

    'getLength after second turn first player': function(test) {
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
        test.equals(history.getLength(), 2);

        test.done();
    },

    'getPlayersPositions getLength of array': function(test) {
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

        test.equals(2, history.getPlayerPositions().length);

        test.done();
    },

    'getPlayersPositions getLength of array (4)': function(test) {
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

    'getFencesPositions getLength of array': function(test) {
        history.add({
            x: 4,
            x2: 5,
            y: 7,
            y2: 7,
            t: 'f'
        });
        history.add({
            x: 4,
            x2: 5,
            y: 7,
            y2: 7,
            t: 'f'
        });
        history.add({
            x: 4,
            x2: 5,
            y: 7,
            y2: 7,
            t: 'f'
        });

        test.equals(3, history.getFencesPositions().length);

        test.done();
    },

    'getFencesPositions check data': function(test) {
        history.add({
            x: 4,
            x2: 5,
            y: 7,
            y2: 7,
            t: 'f'
        });
        history.add({
            x: 4,
            x2: 5,
            y: 7,
            y2: 7,
            t: 'f'
        });
        history.add({
            x: 7,
            x2: 7,
            y: 4,
            y2: 5,
            t: 'f'
        });

        var expected = [
            { x: 4, x2: 5, y: 7, y2: 7, t: 'H' },
            { x: 4, x2: 5, y: 7, y2: 7, t: 'H' },
            { x: 7, x2: 7, y: 4, y2: 5, t: 'V' }
        ];
        test.deepEqual(expected, history.getFencesPositions());

        test.done();
    },

    'getPlayersPositions check positions': function(test) {
        history.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        history.add({
            x: 5,
            y: 1,
            t: 'p'
        });
        history.add({
            x: 4,
            y: 3,
            t: 'p'
        });
        history.add({
            x: 4,
            x2: 5,
            y: 7,
            y2: 7,
            t: 'f'
        });

        var expected = [
            { x: 4, y: 3, movedFences: 0 },
            { x: 5, y: 1, movedFences: 1 }
        ];
        test.deepEqual(expected, history.getPlayerPositions());

        test.done();
    }

});
