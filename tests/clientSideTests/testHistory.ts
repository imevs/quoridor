import { assert } from 'chai';
import { BoardValidation as BoardModel } from '../../src/models/BoardValidation';

describe('Test History', () => {
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

    it("testNoHistoryOnGameStart", function () {
        assert.deepEqual(2, board.history.getLength());
    });
    it("testHistoryCountAfterFirstTurn", function () {
        board.fields.trigger('moveplayer', 4, 1);
        board.trigger('maketurn');

        assert.deepEqual(3, board.history.getLength());
    });
    it.skip("testHistoryTextAfterFirstTurn", function () {
        board.fields.trigger('moveplayer', 4, 1);
        board.trigger('maketurn');

        assert.deepEqual('e8', board.history.at(2));
    });
    it.skip("testHistoryCountAfterFirstFenceMove", function () {
        var fence2 = board.fences.findWhere({x: 1, y: 0, type: 'H'})!;
        fence2.trigger('selected', fence2);

        board.trigger('maketurn');

        assert.deepEqual(3, board.history.getLength());
    });
    it.skip("testHistoryTextAfterFirstFenceMove", function () {
        var fence2 = board.fences.findWhere({x: 4, y: 4, type: 'H'})!;
        fence2.trigger('selected', fence2);

        board.trigger('maketurn');

        assert.deepEqual('e4d4', board.history.at(2));
    });

});