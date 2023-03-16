import { assert } from 'chai';
import { BoardValidation as BoardModel } from '../../src/models/BoardValidation';

describe.skip('Test testValidatePlayerPositionNearFences', () => {
    let board: BoardModel;

    beforeEach(function () {
        board = new BoardModel({
            playersCount: 2,
            currentPlayer: 0,
            botsCount: 0,
            boardSize: 9,
            activePlayer: 0,
        });
    });

    afterEach(() => {
        board.stop();
    });

    it('test Valid Position With One Player and Fence', () => {
        [
            {input: {x: 3, y: 0}, expected: false},
            {input: {x: 3, y: 1}, expected: true},
            {input: {x: 3, y: 2}, expected: false},
            {input: {x: 4, y: 0}, expected: true},
            {input: {x: 4, y: 1}, expected: false},
            {input: {x: 4, y: 2}, expected: false},
            {input: {x: 5, y: 0}, expected: false},
            {input: {x: 5, y: 1}, expected: true},
            {input: {x: 5, y: 2}, expected: false}
        ].forEach(function ({input, expected }) {
            var player = board!.players.at(0);
            player.set({x: 4, y: 1});
            board!.fences.findWhere({x: 4, y: 1})!.set('state', 'busy');
            board!.fences.findWhere({x: 5, y: 1})!.set('state', 'busy');
            var res = board!.isValidPlayerPosition(player.pick('x', 'y') as { x: number; y: number; }, input, []);
            assert.deepEqual(res, expected);
        });
    });

    it('test Valid Position With Two Players and Horizontal Fence ', () => {
        [
            {input: {x: 3, y: 0}, expected: true},
            {input: {x: 3, y: 1}, expected: true},
            {input: {x: 3, y: 2}, expected: false},
            {input: {x: 4, y: 0}, expected: false},
            {input: {x: 4, y: 1}, expected: false},
            {input: {x: 4, y: 2}, expected: false},
            {input: {x: 5, y: 0}, expected: true},
            {input: {x: 5, y: 1}, expected: true},
            {input: {x: 5, y: 2}, expected: false}
        ].forEach(function ({input, expected }) {
            var player1 = board!.players.at(0);
            player1.set({x: 4, y: 0});
            var player2 = board!.players.at(1);
            player2.set({x: 4, y: 1});

            board!.fences.findWhere({x: 4, y: 1, type: 'H'})!.set('state', 'busy');
            board!.fences.findWhere({x: 5, y: 1, type: 'H'})!.set('state', 'busy');
            var res = board!.isValidPlayerPosition(player1.pick('x', 'y') as { x: number; y: number; }, input, []);
            assert.deepEqual(res, expected);
        });
    });

    it('test Valid Position With Two Players and Vertical Fence', () => {
        [
            {input: {x: 3, y: 0}, expected: true},
            {input: {x: 3, y: 1}, expected: false},
            {input: {x: 3, y: 2}, expected: true},

            {input: {x: 4, y: 0}, expected: true},
            {input: {x: 4, y: 1}, expected: false},
            {input: {x: 4, y: 2}, expected: true},

            {input: {x: 5, y: 0}, expected: false},
            {input: {x: 5, y: 1}, expected: false},
            {input: {x: 5, y: 2}, expected: false}
        ].forEach(function ({input, expected }) {
            var player1 = board!.players.at(0);
            player1.set({x: 3, y: 1});
            var player2 = board!.players.at(1);
            player2.set({x: 4, y: 1});

            board!.fences.findWhere({x: 4, y: 0, type: 'V'})!.set('state', 'busy');
            board!.fences.findWhere({x: 4, y: 1, type: 'V'})!.set('state', 'busy');
            var res = board!.isValidPlayerPosition(player1.pick('x', 'y') as { x: number; y: number; }, input, []);
            assert.deepEqual(res, expected);
        });
    });

    it('test Valid Position With Two Players and Both Vertical And Horizontal Walls', function () {
        var player1 = this.board.players.at(0);
        player1.set({x: 1, y: 3});
        var player2 = this.board.players.at(1);
        player2.set({x: 2, y: 3});

        this.board.fences.findWhere({x: 2, y: 2, type: 'V'}).set('state', 'busy');
        this.board.fences.findWhere({x: 2, y: 3, type: 'V'}).set('state', 'busy');

        this.board.fences.findWhere({x: 1, y: 3, type: 'H'}).set('state', 'busy');
        this.board.fences.findWhere({x: 2, y: 3, type: 'H'}).set('state', 'busy');

        var res = this.board.isValidPlayerPosition(player1.pick('x', 'y'), { x: 2, y: 4 });
        assert.isFalse(res);
    });

    it('test Valid Position With Two Players and Horizontal Wall near border', () => {
        [
            {input: {x: 0, y: 2}}
            //{input: {x: 1, y: 2}}
        ].forEach(function ({input}) {
            var player1 = board!.players.at(0);
            player1.set({x: 0, y: 3});
            var player2 = board!.players.at(1);
            player2.set({x: 1, y: 3});

            board!.fences.findWhere({x: input.x, y: input.y, type: 'H'})!.set('state', 'busy');
            board!.fences.findWhere({x: 1, y: 2, type: 'H'})!.set('state', 'busy');

            var res = board!.isValidPlayerPosition(player2.pick('x', 'y') as { x: number; y: number; }, { x: 0, y: 2 }, []);
            assert.isFalse(res);
        });
    });
});