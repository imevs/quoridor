import { assert } from "chai";
import { MegaBot } from '../../src/models/MegaBot';

describe('mega bot', function () {

    var bot: MegaBot, playersPositions = [
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
        bot = new MegaBot(1);
        bot.onStart(1, 1, [{x: 1, y: 0, t: 'p'}, {x: 1, y: 2, t: 'p'}], 2, 3);
        // console.dir(bot.board);
        bot.board.players.playersPositions = playersPositions;
    });

    it('test getPossibleMoves', function () {
        assert.equal(bot.getPossibleMoves(bot.board, bot.player).length, 15);
    });

    it('test getBestTurn', function (test) {
        bot.onStart(0, 0, [{x: 1, y: 0, t: 'p'}, {x: 1, y: 2, t: 'p'}], 2, 3);
        bot.board.players.playersPositions = playersPositions;

        bot.getBestTurn(function (res) {
            assert.deepEqual(res, {x: 1, y: 1, type: 'P'});
            test();
        });
    });

    it('getPossiblePosition - first - fullsizeboard', function (test) {
        bot = new MegaBot(0);
        bot.onStart(0, 0, [], 2, 9);

        bot.getBestTurn(function (res) {
            assert.deepEqual(res, {x: 4, y: 1, type: 'P'});
            test();
        });
    });

    it('getPossiblePosition - second - fullsizeboard', function (test) {
        bot = new MegaBot(0);
        bot.onStart(1, 1, [], 2, 9);
        bot.getBestTurn(function (res) {
            assert.deepEqual(res, {x: 4, y: 7, type: 'P'});
            test();
        });
    });

    it('getPossiblePosition - second - fullsizeboard - walls', function (test) {
        bot = new MegaBot(0);
        bot.satisfiedRate = -2;
        bot.onStart(0, 0, [], 2, 9);

        var fences = bot.board.fences;
        /**
         * walls positions:
         *  _
         * |_
         * |x
         */
        fences.findWhere({x: 3, y: 6, type: 'H'})!.set('state', 'busy');
        fences.findWhere({x: 4, y: 6, type: 'H'})!.set('state', 'busy');

        fences.findWhere({x: 3, y: 7, type: 'H'})!.set('state', 'busy');
        fences.findWhere({x: 4, y: 7, type: 'H'})!.set('state', 'busy');

        fences.findWhere({x: 4, y: 7, type: 'V'})!.set('state', 'busy');
        fences.findWhere({x: 4, y: 8, type: 'V'})!.set('state', 'busy');

        bot.getBestTurn(function (result) {
            assert.equal(result.x, 2);
            assert.ok(result.y === 7 || result.y === 6);
            assert.equal(result.type, 'H');
            test();
        });
    });

});
