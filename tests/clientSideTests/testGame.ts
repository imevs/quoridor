import { assert } from 'chai';
import { BoardValidation as BoardModel } from '../../src/models/BoardValidation';

describe('Test game', () => {
    let board: BoardModel;

    beforeEach(function () {
        board = new BoardModel({
            playersCount: 2,
            currentPlayer: 0,
            botsCount: 0,
            boardSize: 9,
            activePlayer: 0,
        });
        board.run(0, 0);
    });

    afterEach(() => {
        board.stop();
    });

    it("testPlayersPositionsBeforeGame", function () {
        var players = board.players;
        var pos1 = players.at(0).pick('x', 'y');
        var pos2 = players.at(1).pick('x', 'y');
        assert.deepEqual(pos1, {x: 4, y: 0});
        assert.deepEqual(pos2, {x: 4, y: 8});
    });

    it("testFirstTurnValid", function () {
        board.fields.trigger('moveplayer', 4, 1);
        board.trigger('maketurn');
        var players = board.players;
        var pos1 = players.at(0).pick('x', 'y');
        var pos2 = players.at(1).pick('x', 'y');
        assert.deepEqual(pos1, {x: 4, y: 1});
        assert.deepEqual(pos2, {x: 4, y: 8});
        assert.deepEqual(board.getActivePlayer(), players.at(1));
    });

    it("testNeedConfirmForMovingPlayer", function () {
        board.fields.trigger('moveplayer', 4, 1);

        var players = board.players;
        var pos1 = players.at(0).pick('prev_x', 'prev_y');
        var pos2 = players.at(1).pick('prev_x', 'prev_y');

        assert.deepEqual(pos1, {prev_x: 4, prev_y: 0});
        assert.deepEqual(pos2, {prev_x: 4, prev_y: 8});
        assert.deepEqual(board.getActivePlayer(), players.at(0));
    });

    it("testFirstTurnInvalid", function () {
        board.fields.trigger('moveplayer', 5, 1);
        var players = board.players;
        var pos1 = players.at(0).pick('x', 'y');
        var pos2 = players.at(1).pick('x', 'y');
        assert.deepEqual(pos1, {x: 4, y: 0});
        assert.deepEqual(pos2, {x: 4, y: 8});
        assert.deepEqual(board.getActivePlayer(), players.at(0));
    });

    it("testFirstTurnSamePosition", function () {
        board.fields.trigger('moveplayer', 4, 0);
        var players = board.players;
        var pos1 = players.at(0).pick('x', 'y');
        var pos2 = players.at(1).pick('x', 'y');
        assert.deepEqual(pos1, {x: 4, y: 0});
        assert.deepEqual(pos2, {x: 4, y: 8});
        assert.deepEqual(board.getActivePlayer(), players.at(0));
    });

    it("testFirstTurnOutOfBoard", function () {
        board.fields.trigger('moveplayer', 4, -1);
        var players = board.players;
        var pos1 = players.at(0).pick('x', 'y');
        var pos2 = players.at(1).pick('x', 'y');
        assert.deepEqual(pos1, {x: 4, y: 0});
        assert.deepEqual(pos2, {x: 4, y: 8});
        assert.deepEqual(board.getActivePlayer(), players.at(0));
    });

});