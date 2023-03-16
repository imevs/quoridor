import { assert } from 'chai';
import { BoardValidation as BoardModel } from '../../src/models/BoardValidation';
import { PlayerModel } from '../../src/models/PlayerModel';

describe('Test Validate Player Position', () => {
    let board: BoardModel;

    beforeEach(function () {
        board = new BoardModel({
            playersCount: 4,
            currentPlayer: 0,
            botsCount: 0,
            boardSize: 9,
            activePlayer: 0,
        });
    });

    afterEach(() => {
        board.stop();
    });

    it('test Valid Position With One Player At The Top', () => {
        [
            {x: 4, y: 1},
            {x: 5, y: 0},
            {x: 3, y: 0}
        ].forEach(function (input/*, expected*/) {
            var player = new PlayerModel({ x: 4, y: 0, fencesRemaining: 0, color: "", url: 1 });
            var res = board!.isValidPlayerPosition(player.pick('x', 'y') as { x: number; y: number; }, input, []);
            assert.isTrue(res);
        });
    });

    it('test InValid Position With One Player At The Top', () => {
        [
            {input: {x: 5, y: 1}},
            {input: {x: 3, y: 1}},
            {input: {x: 4, y: -1}},
            {input: {x: 4, y: 0}}
        ].forEach(function ({input}/*, expected*/) {
            var player = new PlayerModel({x: 4, y: 0, fencesRemaining: 0, color: "", url: 1});
            var res = board!.isValidPlayerPosition(player.pick('x', 'y') as { x: number; y: number; }, input, []);
            assert.isFalse(res);
        });
    });

    it('test Valid Position With One Player At The Bottom', () => {
        [
            {input: {x: 4, y: 7}},
            {input: {x: 5, y: 8}},
            {input: {x: 3, y: 8}}
        ].forEach(function ({input}/*, expected*/) {
            var player = new PlayerModel({x: 4, y: 8, fencesRemaining: 0, color: "", url: 1});
            var res = board!.isValidPlayerPosition(player.pick('x', 'y') as { x: number; y: number; }, input, []);
            assert.isTrue(res);
        });
    });

    it('test InValid Position With One Player At The Bottom', () => {
        [
            {input: {x: 3, y: 7}},
            {input: {x: 5, y: 7}},
            {input: {x: 4, y: 8}},
            {input: {x: 4, y: 9}}
        ].forEach(function ({input}/*, expected*/) {
            var player = new PlayerModel({x: 4, y: 8, fencesRemaining: 0, color: "", url: 1});
            var res = board!.isValidPlayerPosition(player.pick('x', 'y') as { x: number; y: number; }, input, []);
            assert.isFalse(res);
        });
    });

    it('test Valid Position With Two Players (current player - Left)', () => {
        [
            {input: {x: 4, y: 3}, expected: true},
            {input: {x: 4, y: 5}, expected: true},
            {input: {x: 6, y: 4}, expected: true},
            {input: {x: 3, y: 4}, expected: true},
            {input: {x: 5, y: 3}, expected: false},
            {input: {x: 5, y: 4}, expected: false},
            {input: {x: 5, y: 5}, expected: false}
        ].forEach(function ({input, expected}) {
            var player1 = board!.players.at(0).set({
                x: 4,
                y: 4,
                prev_x: 4,
                prev_y: 4
            });
            board!.players.at(1).set({
                x: 5,
                y: 4,
                prev_x: 5,
                prev_y: 4
            });
            var res = board!.isValidPlayerPosition(player1.pick('x', 'y') as { x: number; y: number; }, input, []);
            assert.deepEqual(res, expected);
        });
    });

    it('test Valid Position With Two Players (current player - Right)', () => {
        [
            {input: {x: 4, y: 3}, expected: false},
            {input: {x: 4, y: 5}, expected: false},
            {input: {x: 6, y: 4}, expected: true},
            {input: {x: 3, y: 4}, expected: true},
            {input: {x: 5, y: 3}, expected: true},
            {input: {x: 5, y: 4}, expected: false},
            {input: {x: 5, y: 5}, expected: true}
        ].forEach(function ({input, expected}) {
            board!.players.at(0).set({
                x: 4,
                y: 4,
                prev_x: 4,
                prev_y: 4
            });
            var player2 = board!.players.at(1).set({
                x: 5,
                y: 4,
                prev_x: 5,
                prev_y: 4
            });
            var res = board!.isValidPlayerPosition(player2.pick('x', 'y') as { x: number; y: number; }, input, []);
            assert.deepEqual(res, expected);
        });
    });

    it('test Valid With Three Players (current player - Left)', () => {
        [
            {input: {x: 3, y: 3}, expected: false},
            {input: {x: 3, y: 4}, expected: true},
            {input: {x: 3, y: 5}, expected: false},
            {input: {x: 4, y: 3}, expected: true},
            {input: {x: 4, y: 4}, expected: false},
            {input: {x: 4, y: 5}, expected: true},
            {input: {x: 5, y: 3}, expected: true},
            {input: {x: 5, y: 4}, expected: false},
            {input: {x: 5, y: 5}, expected: true},
            {input: {x: 6, y: 3}, expected: false},
            {input: {x: 6, y: 4}, expected: false},
            {input: {x: 6, y: 5}, expected: false},
            {input: {x: 7, y: 3}, expected: false},
            {input: {x: 7, y: 4}, expected: false},
            {input: {x: 7, y: 5}, expected: false}
        ].forEach(function ({input, expected}) {
            var player1 = board!.players.at(0).set({x: 4, y: 4, prev_x: 4, prev_y: 4 });
            board!.players.at(1).set({x: 5, y: 4, prev_x: 5, prev_y: 4 });
            board!.players.at(2).set({x: 6, y: 4, prev_x: 6, prev_y: 4});
            var res = board!.isValidPlayerPosition(player1.pick('x', 'y') as { x: number; y: number; }, input, []);
            assert.deepEqual(res, expected);
        });
    });

    it('test Valid With Three Players (current player - Middle)', () => {
        [
            {input: {x: 3, y: 3}, expected: false},
            {input: {x: 3, y: 4}, expected: true},
            {input: {x: 3, y: 5}, expected: false},
            {input: {x: 4, y: 3}, expected: false},
            {input: {x: 4, y: 4}, expected: false},
            {input: {x: 4, y: 5}, expected: false},
            {input: {x: 5, y: 3}, expected: true},
            {input: {x: 5, y: 4}, expected: false},
            {input: {x: 5, y: 5}, expected: true},
            {input: {x: 6, y: 3}, expected: false},
            {input: {x: 6, y: 4}, expected: false},
            {input: {x: 6, y: 5}, expected: false},
            {input: {x: 7, y: 3}, expected: false},
            {input: {x: 7, y: 4}, expected: true},
            {input: {x: 7, y: 5}, expected: false}
        ].forEach(function ({input, expected}) {
            board!.players.at(0).set({
                x: 4,
                y: 4,
                prev_x: 4,
                prev_y: 4
            });
            var player2 = board!.players.at(1).set({
                x: 5,
                y: 4,
                prev_x: 5,
                prev_y: 4
            });
            board!.players.at(2).set({
                x: 6,
                y: 4,
                prev_x: 6,
                prev_y: 4
            });
            var res = board!.isValidPlayerPosition(player2.pick('x', 'y') as { x: number; y: number; }, input, []);
            assert.deepEqual(res, expected);
        });
    });

    it('test Valid With Three Players (current player - Right)', () => {
        [
            {input: {x: 3, y: 3}, expected: false},
            {input: {x: 3, y: 4}, expected: false},
            {input: {x: 3, y: 5}, expected: false},
            {input: {x: 4, y: 3}, expected: false},
            {input: {x: 4, y: 4}, expected: false},
            {input: {x: 4, y: 5}, expected: false},
            {input: {x: 5, y: 3}, expected: true},
            {input: {x: 5, y: 4}, expected: false},
            {input: {x: 5, y: 5}, expected: true},
            {input: {x: 6, y: 3}, expected: true},
            {input: {x: 6, y: 4}, expected: false},
            {input: {x: 6, y: 5}, expected: true},
            {input: {x: 7, y: 3}, expected: false},
            {input: {x: 7, y: 4}, expected: true},
            {input: {x: 7, y: 5}, expected: false}
        ].forEach(function ({input, expected}) {
            board!.players.at(0).set({x: 4, y: 4, prev_x: 4, prev_y: 4 });
            board!.players.at(1).set({x: 5, y: 4, prev_x: 5, prev_y: 4});
            var player3 = board!.players.at(2).set({x: 6, y: 4, prev_x: 6, prev_y: 4});
            var res = board!.isValidPlayerPosition(player3.pick('x', 'y') as { x: number; y: number; }, input, []);
            assert.deepEqual(res, expected);
        });
    });

    it.skip('test bug with different prev_y and y', function () {
        var player1 = this.board.players.at(0).set({prev_x: 4, prev_y: 3, x: 4, y: 4});
        this.board.players.at(1).set({prev_x: 4, prev_y: 5, x: 4, y: 5});
        var newPos = {x: 5, y: 4};
        var currentPos = {x: player1.get('prev_x'), y: player1.get('prev_y')};
        assert.isFalse(this.board.isValidPlayerPosition(currentPos, newPos));
    });

});