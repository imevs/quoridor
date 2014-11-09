var assert = this.chai ? chai.assert : require('chai').assert;
var Backbone = this.Backbone || require('backbone');
var GameHistory = this.GameHistoryModel || require('../../public/models/TurnModel.js');

Backbone.sync = function () {};

describe('test-quoridor', function () {
    var gameHistory;

    beforeEach(function (test) {

        gameHistory = new GameHistory();
        test();
    });

    it('create history', function (test) {
        assert.equal(gameHistory.get('turns').length, 0);
        test();
    });

    it('move player 1', function (test) {
        gameHistory.add({
            x: 4,
            y: 1,
            t: 'p'
        });
        assert.equal(gameHistory.at(0), 'e8');

        test();
    });

    it('move players 1-2', function (test) {
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
        assert.equal(gameHistory.at(0), 'e8 e2');

        test();
    });

    it('move player 1-2-1', function (test) {
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
        assert.equal(gameHistory.at(0), 'e8 e2');
        assert.equal(gameHistory.at(1), 'e7');

        test();
    });

    it('move 1 fence', function (test) {
        gameHistory.add({
            x : 4,
            x2: 5,
            y : 1,
            y2: 1,
            t : 'f'
        });

        assert.equal(gameHistory.at(0), 'e7f7');

        test();
    });

    it('move 2 fences', function (test) {
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

        assert.equal(gameHistory.at(0), 'e7f7 e1f1');

        test();
    });

    it('move player and fence', function (test) {
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

        assert.equal(gameHistory.at(0), 'e7 e1f1');

        test();
    });

    it('getLength after first turn first player', function (test) {
        gameHistory.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        assert.equal(gameHistory.getLength(), 1);

        test();
    });

    it('getLength after first turn second player', function (test) {
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
        assert.equal(gameHistory.getLength(), 1);

        test();
    });

    it('getLength after second turn first player', function (test) {
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
        assert.equal(gameHistory.getLength(), 2);

        test();
    });

    it('getPlayersPositions getLength of array', function (test) {
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

        assert.equal(2, gameHistory.getPlayerPositions().length);

        test();
    });

    it('getPlayersPositions getLength of array (4)', function (test) {
        var history = new GameHistory({playersCount: 4});
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

        assert.equal(4, history.getPlayerPositions().length);

        test();
    });

    it('getFencesPositions getLength of array', function (test) {
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

        assert.equal(3, gameHistory.getFencesPositions().length);

        test();
    });

    it('getFencesPositions check data', function (test) {
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
        assert.deepEqual(expected, gameHistory.getFencesPositions());

        test();
    });

    it('getPlayersPositions check positions', function (test) {
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
        assert.deepEqual(expected, gameHistory.getPlayerPositions());

        test();
    });

    it('test initPlayers', function (test) {
        gameHistory = new GameHistory({
            playersCount: '2'
        });
        gameHistory.initPlayers();
        gameHistory.initPlayers(); // tests for idempotency of initPlayers method
        var expected = [
            { x: 4, y: 0, movedFences: 0 },
            { x: 4, y: 8, movedFences: 0 }
        ];
        assert.deepEqual(expected, gameHistory.getPlayerPositions());

        test();
    });

});
