import { assert } from 'chai';
import { BoardValidation as BoardModel } from '../../src/models/BoardValidation';

describe('Test testValidateFencePositions', () => {

    let board: BoardModel;

    afterEach(() => {
        board.stop();
    });

    it.skip('test 1', function () {
        board = new BoardModel({
            playersCount: 4,
            currentPlayer: 0,
            botsCount: 0,
            boardSize: 9,
            activePlayer: 0,
        });
        board.fences.findWhere({x: 0, y: 5, type: 'H'})!.set('state', 'busy');
        board.fences.findWhere({x: 1, y: 5, type: 'H'})!.set('state', 'busy');
        board.fences.findWhere({x: 2, y: 5, type: 'H'})!.set('state', 'busy');
        board.fences.findWhere({x: 3, y: 5, type: 'H'})!.set('state', 'busy');
        board.fences.findWhere({x: 4, y: 5, type: 'H'})!.set('state', 'busy');
        board.fences.findWhere({x: 5, y: 5, type: 'H'})!.set('state', 'busy');
        board.fences.findWhere({x: 6, y: 5, type: 'H'})!.set('state', 'busy');

        var fence = board.fences.findWhere({x: 8, y: 5, type: 'H'})!;
        //console.profile();
        assert.isTrue(board.doesFenceBreakPlayerPath(board.players.at(0), fence));
        //console.profileEnd();
    });

    it.skip('test 2', function () {
        board = new BoardModel({
            playersCount: 4,
            currentPlayer: 0,
            botsCount: 0,
            boardSize: 9,
            activePlayer: 0,
        });
        board.players.at(0).set({prev_x: 6, prev_y: 5, x: 6, y: 5});
        board.players.at(1).set({prev_x: 8, prev_y: 5, x: 8, y: 5});

        board.fences.findWhere({x: 0, y: 5, type: 'H'})!.set('state', 'busy');
        board.fences.findWhere({x: 1, y: 5, type: 'H'})!.set('state', 'busy');
        board.fences.findWhere({x: 2, y: 5, type: 'H'})!.set('state', 'busy');
        board.fences.findWhere({x: 3, y: 5, type: 'H'})!.set('state', 'busy');
        board.fences.findWhere({x: 4, y: 5, type: 'H'})!.set('state', 'busy');
        board.fences.findWhere({x: 5, y: 5, type: 'H'})!.set('state', 'busy');
        board.fences.findWhere({x: 6, y: 5, type: 'H'})!.set('state', 'busy');

        var fence = board.fences.findWhere({x: 8, y: 5, type: 'H'})!;
        assert.isTrue(board.doesFenceBreakPlayerPath(board.players.at(0), fence));
        assert.isFalse(board.doesFenceBreakPlayerPath(board.players.at(1), fence));
    });

});