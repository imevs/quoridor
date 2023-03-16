import { assert } from "chai";
import { GameHistoryModel as GameHistory, TurnsCollection } from '../../src/models/TurnModel';

describe('test-quoridor', function () {
    var gameHistory: GameHistory;

    beforeEach(function () {

        gameHistory = new GameHistory();
    });

    it('create history', function () {
        assert.equal(gameHistory.get('turns').length, 0);
    });

    it('move player 1', function () {
        gameHistory.add({
            x: 4,
            y: 1,
            t: 'p'
        });
        assert.equal(gameHistory.at(0), 'e8');
    });

    it('move players 1-2', function () {
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
    });

    it('move player 1-2-1', function () {
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
    });

    it('move 1 fence', function () {
        gameHistory.add({
            x : 4,
            x2: 5,
            y : 1,
            y2: 1,
            t : 'f'
        });

        assert.equal(gameHistory.at(0), 'e7f7');
    });

    it('move 2 fences', function () {
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
    });

    it('move player and fence', function () {
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
    });

    it('getLength after first turn first player', function () {
        gameHistory.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        assert.equal(gameHistory.getLength(), 1);
    });

    it('getLength after first turn second player', function () {
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
    });

    it('getLength after second turn first player', function () {
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
    });

    it('getPlayersPositions getLength of array', function () {
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
    });

    it('getPlayersPositions getLength of array (4)', function () {
        var history = new GameHistory({
            turns: new TurnsCollection(),
            playersCount: 4,
            boardSize: 9
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
        history.add({
            x: 4,
            y: 2,
            t: 'p'
        });

        assert.equal(4, history.getPlayerPositions().length);
    });

    it('getFencesPositions getLength of array', function () {
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
    });

    it('getFencesPositions check data', function () {
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
    });

    it('getPlayersPositions check positions', function () {
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
    });

    it('test initPlayers', function () {
        gameHistory = new GameHistory({
            turns: new TurnsCollection(),
            playersCount: 2,
            boardSize: 9
        });
        gameHistory.initPlayers();
        gameHistory.initPlayers(); // tests for idempotency of initPlayers method
        var expected = [
            { x: 4, y: 0, movedFences: 0 },
            { x: 4, y: 8, movedFences: 0 }
        ];
        assert.deepEqual(expected, gameHistory.getPlayerPositions());
    });

});
