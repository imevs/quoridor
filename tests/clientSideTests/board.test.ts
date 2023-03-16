import { assert } from 'chai';
import { BoardValidation as BoardModel } from '../../src/models/BoardValidation';

describe('Test Board', function () {
    
    let self: { board: BoardModel } = {} as any;

    beforeEach(function () {
        self.board = new BoardModel({
            playersCount: 2,
            currentPlayer: 0,
            botsCount: 0,
            boardSize: 9,
            activePlayer: 0,
        });
    });
    it('testCreateBoardCreateModels', function () {
        self.board = new BoardModel({
            playersCount: 2,
            currentPlayer: 0,
            botsCount: 0,
            boardSize: 9,
            activePlayer: 0,

        });
        assert.notEqual(self.board.fields, undefined);
        assert.notEqual(self.board.players, undefined);
        assert.notEqual(self.board.fences, undefined);
        assert.notEqual(self.board.infoModel, undefined);
    });
    it('testCreateBoardInitModels', function () {
        self.board = new BoardModel({
            playersCount: 4,
            currentPlayer: 0,
            botsCount: 0,
            boardSize: 9,
            activePlayer: 0,
        });
        assert.equal(self.board.fields.length, 9 * 9);
        assert.equal(self.board.fences.length, 2 * 9 * (9 - 1));
        assert.equal(self.board.players.length, 4);
    });
    it('testCreateBoardGetPlayers2', function () {
        assert.equal(self.board.players.length, 2);
    });
    it('testGetCurrentPlayer', function () {
        assert.equal(self.board.getActivePlayer(), self.board.players.at(0));
        assert.notEqual(self.board.getActivePlayer(), self.board.players.at(1));
    });
    it('testSwitchPlayer', function () {
        self.board.switchActivePlayer();
        assert.equal(self.board.getActivePlayer(), self.board.players.at(1));
    });
    it('testDoubleSwitchPlayer', function () {
        self.board.switchActivePlayer();
        self.board.switchActivePlayer();
        assert.equal(self.board.getActivePlayer(), self.board.players.at(0));
        assert.notEqual(self.board.getActivePlayer(), self.board.players.at(1));
    });

});