var nodeunit = require('nodeunit');
var Bot = require('../../public/models/MegaBot.js');

var bot, playersPositions = [
    {x: 1, y: 0, color: 'red', isWin: function (x, y) {
        return y === 2;
    } },
    {x: 1, y: 2, color: 'yellow', isWin: function (x, y) {
        return y === 0;
    } }
];

exports.bot = nodeunit.testCase({

    setUp: function (test) {
        /* _ _ _
         0|_|x|_|
         1|_|_|_|
         2|_|x|_|
           0 1 2
         */
        bot = new Bot(1);
        bot.onStart(1, 1, [{x: 1, y: 0, t: 'p'}, {x: 1, y: 2, t: 'p'}], 2, 3);
        bot.board.players.playersPositions = playersPositions;

        test();
    },

    'test calcHeuristic': function (test) {
        bot.initOthersPlayers(bot.board);
        test.equal(bot.calcHeuristic(bot.player, bot.board), 1);
        test.done();
    },

    'test getPossibleMoves': function (test) {
        test.equal(bot.getPossibleMoves(bot.board, bot.player).length, 15);
        test.done();
    },

    'test getBestTurn': function (test) {
        bot.onStart(0, 0, [{x: 1, y: 0, t: 'p'}, {x: 1, y: 2, t: 'p'}], 2, 3);
        bot.board.players.playersPositions = playersPositions;

        test.deepEqual(bot.getBestTurn(), {x: 1, y: 1, type: 'P', rate: 0});
        test.done();
    },

    'getPossiblePosition - first - fullsizeboard': function (test) {
        bot = new Bot(0);
        bot.onStart(0, 0, [], 2);

        test.deepEqual(bot.getBestTurn(), {x: 4, y: 1, type: 'P', rate: 0});
        test.done();
    },

    'getPossiblePosition - second - fullsizeboard': function (test) {
        bot = new Bot(0);
        bot.onStart(1, 1, [], 2);
        test.deepEqual(bot.getBestTurn(), {x: 4, y: 7, type: 'P', rate: 0});
        test.done();
    },

    'getPossiblePosition - second - fullsizeboard - walls': function (test) {
        bot = new Bot(0);
        bot.satisfiedRate = -2;
        bot.onStart(0, 0, [], 2);

        var fences = bot.board.fences;
        /**
         * walls positions:
         *  _
         * |_
         * |x
         */
        fences.findWhere({x: 3, y: 6, type: 'H'}).set('state', 'busy');
        fences.findWhere({x: 4, y: 6, type: 'H'}).set('state', 'busy');

        fences.findWhere({x: 3, y: 7, type: 'H'}).set('state', 'busy');
        fences.findWhere({x: 4, y: 7, type: 'H'}).set('state', 'busy');

        fences.findWhere({x: 4, y: 7, type: 'V'}).set('state', 'busy');
        fences.findWhere({x: 4, y: 8, type: 'V'}).set('state', 'busy');

        var result = bot.getBestTurn();
        test.equal(result.x, 2);
        test.ok(result.y === 7 || result.y === 6);
        test.equal(result.type, 'H');
        test.equal(result.rate, -2);
        test.done();
    }

});
