import { assert } from "chai";
import { SmartBot } from '../../src/models/SmartBot';

describe('bot', function () {

    var bot: SmartBot, playersPositions = [
        {x: 1, y: 0, color: 'red', name: "", isWin: function (_x: number, y: number) {
            return y === 2;
        } },
        {x: 1, y: 2, color: 'yellow', name: "", isWin: function (_x: number, y: number) {
            return y === 0;
        } }
    ];

    beforeEach(function () {
        /* _ _ _
         0|_|x|_|
         1|_|_|_|
         2|_|x|_|
           0 1 2
         */
        bot = new SmartBot(1);
        bot.onStart(1, 1, [{x: 1, y: 0, t: 'p'}, {x: 1, y: 2, t: 'p'}], 2, 3);
        bot.board.players.playersPositions = playersPositions;
    });

    it('processBoardForGoal', function () {
        var board = bot.board.copy();
        var player = board.players.at(1);

        var closed = bot.processBoardForGoal(board, player);

        assert.deepEqual(closed, [
            { x: 1, y: 2, deep: 0 },
            { x: 0, y: 2, deep: 1 },
            { x: 2, y: 2, deep: 1 },
            { x: 1, y: 1, deep: 1 },
            { x: 0, y: 1, deep: 2 },
            { x: 2, y: 1, deep: 2 },
            { x: 0, y: 0, deep: 2 },
            { x: 2, y: 0, deep: 2 }
        ]);
    });

    it('findGoal', function () {
        var board = bot.board.copy();
        var player = board.players.at(1);
        var pawn = bot.board.players.playersPositions[1]!;
        var closed = bot.processBoardForGoal(board, player);

        var goal = bot.findGoal(closed, pawn);

        assert.deepEqual(goal, {x: 0, y: 0, deep: 2});
    });

    it('buildPath', function () {
        var board = bot.board.copy();
        var player = board.players.at(1);
        var pawn = bot.board.players.playersPositions[1]!;
        var closed = bot.processBoardForGoal(board, player);
        var goal = bot.findGoal(closed, pawn);

        var path = bot.buildPath(goal, bot.board.players.at(1).pick('x', 'y'),
            board, closed, player);

        assert.deepEqual(path, [
            { x: 0, y: 0, deep: 2 },
            { x: 1, y: 1, deep: 1 }
        ]);
    });

    it('test findPathToGoal', function () {
        var board = bot.board.copy();
        assert.deepEqual(bot.findPathToGoal(board.players.at(1), board), [
            { x: 1, y: 0, deep: 2 }, { x: 1, y: 1, deep: 1 }
        ]);
    });

    it('getPossiblePosition - first', function () {
        bot.onStart(0, 0, [{x: 1, y: 0, t: 'p'}, {x: 1, y: 2, t: 'p'}], 2, 3);
        bot.board.players.playersPositions = playersPositions;

        assert.deepEqual(bot.getPossiblePosition(), {x: 1, y: 1});
    });

    it('getPossiblePosition - second', function () {
        assert.deepEqual(bot.getPossiblePosition(), {x: 1, y: 1});
    });

    it('getPossiblePosition - first - fullsizeboard', function () {
        bot = new SmartBot(0);
        bot.onStart(0, 0, [], 2, 9);

        assert.deepEqual(bot.getPossiblePosition(), {x: 4, y: 1});
    });

    it('getPossiblePosition - second - fullsizeboard', function () {
        bot = new SmartBot(1);
        bot.onStart(1, 1, [], 2, 9);
        assert.deepEqual(bot.getPossiblePosition(), {x: 4, y: 7});
    });

    it('getPossiblePosition - second - fullsizeboard2', function () {
        bot = new SmartBot(0);
        bot.onStart(0, 0, [], 2, 9);
        bot.board.players.at(0).set('y', 2);

        assert.deepEqual(bot.getPossiblePosition(), {x: 4, y: 3});
    });

    it.skip('getPossiblePosition - second - fullsizeboard 3', function () {
        bot = new SmartBot(1);
        bot.onStart(1, 1, [], 2, 9);
        bot.board.players.at(1).set({x: 3, y: 5});
        bot.board.fences.findWhere({x: 4, y: 3, type: 'H'})!.set('state', 'busy');
        bot.board.fences.findWhere({x: 5, y: 3, type: 'H'})!.set('state', 'busy');

        assert.deepEqual(bot.getPossiblePosition(), {x: 3, y: 4});
    });

});