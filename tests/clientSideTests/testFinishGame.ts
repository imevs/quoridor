import { assert } from 'chai';
import { BoardValidation as BoardModel } from '../../src/models/BoardValidation';

describe('Test Finish game', () => {
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

    it("testWin", function () {
        var isWin = false;
        board.players.at(0).set({x: 5, y: 7});
        board.players.at(0).set({prev_x: 5, prev_y: 7});
        board.players.on('win', function () {
            isWin = true;
        });
        board.fields.trigger('moveplayer', 5, 8);
        board.trigger('maketurn');
        assert.isTrue(isWin);
    });

    // TODO
    it.skip("_testResetGame", function () {
        var player = board.players.at(0);
        player.set({x: 5, y: 7});
        board.players.at(0).set({prev_x: 5, prev_y: 7});
        board.fields.trigger('moveplayer', 5, 8);
        board.trigger('maketurn');
        assert.deepEqual(player.pick('x', 'y'), {x: 4, y: 0 });
    });

    it("testNotResetGame", function () {
        var player = board.players.at(0);
        player.set({x: 5, y: 7});
        board.players.at(0).set({prev_x: 5, prev_y: 7});
        board.fields.trigger('moveplayer', 5, 8);
        board.trigger('maketurn');
        assert.deepEqual(player.pick('x', 'y'), {x: 5, y: 8 });
    });

});
