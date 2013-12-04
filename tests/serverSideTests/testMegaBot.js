var nodeunit = require('nodeunit');
var Bot = require('../../server/models/megaBot.js');
var Room = require('../../server/models/room.js');
var PlayersCollection = require('../../public/models/PlayerModel.js');

var bot, board;

exports.bot = nodeunit.testCase({

    setUp: function (test) {
        /* _ _ _
         0|_|x|_|
         1|_|_|_|
         2|_|x|_|
           0 1 2
         */
        board = Room.createRoom({
            playersCount: 2,
            boardSize   : 3
        });
        board.players = new PlayersCollection([
            {x: 1, y: 0, id: 0, fencesRemaining: 3},
            {x: 1, y: 2, id: 1, fencesRemaining: 3}
        ]);
        board.players.playersPositions = [
            {x: 1, y: 0, color: 'red', isWin: function (x, y) {
                return y === 2;
            } },
            {x: 1, y: 2, color: 'yellow', isWin: function (x, y) {
                return y === 0;
            } }
        ];

        bot = new Bot(1, board);

        test();
    },

    tearDown: function (test) {
        test();
    },

/*    calcHeuristic: function (test) {
        test.equal(bot.calcHeuristic(), 0);

        test.done();
    },

    'selectMoves': function (test) {
        test.equal(bot.selectMoves().length, 15);
        test.done();
    },

    'getBestTurn': function (test) {
        bot = new Bot(0, board);
        test.deepEqual(bot.getBestTurn(), {x: 1, y: 1, type: 'P', rate: 0});
        test.done();
    },*/

    'getPossiblePosition - first - fullsizeboard': function (test) {
        board = Room.createRoom({playersCount: 2, boardSize: 9});
        board.players.at(0).set('id', 0);
        board.players.at(1).set('id', 1);
        bot = new Bot(0, board);

        test.deepEqual(bot.getBestTurn(), {x: 4, y: 1, type: 'P', rate: 0});
        test.done();
    },

    'getPossiblePosition - second - fullsizeboard': function (test) {
        board = Room.createRoom({playersCount: 2, boardSize: 9});
        board.players.at(0).set('id', 0);
        board.players.at(1).set('id', 1);
        bot = new Bot(1, board);
        test.deepEqual(bot.getBestTurn(), {x: 4, y: 7, type: 'P', rate: 0});
        test.done();
    }


});
