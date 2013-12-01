var nodeunit = require('nodeunit');
var _ = require('underscore');
var Bot = require('../../server/models/smartBot.js');
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
            {x: 1, y: 0, id: 0},
            {x: 1, y: 2, id: 1}
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

    'processBoardForGoal': function (test) {
        var board = bot.board.copy();
        var player = board.players.at(1);

        var closed = bot.processBoardForGoal(board, player);

        test.deepEqual(closed, [
            { x: 1, y: 2, deep: 0 },
            { x: 0, y: 2, deep: 1 },
            { x: 2, y: 2, deep: 1 },
            { x: 1, y: 1, deep: 1 },
            { x: 0, y: 1, deep: 2 },
            { x: 2, y: 1, deep: 2 },
            { x: 0, y: 0, deep: 3 },
            { x: 2, y: 0, deep: 3 }
        ]);

        test.done();
    },

    'findGoal': function (test) {
        var board = bot.board.copy();
        var player = board.players.at(1);
        var pawn = bot.board.players.playersPositions[1];
        var closed = bot.processBoardForGoal(board, player);

        var goal = bot.findGoal(closed, pawn);

        test.deepEqual(goal, {x: 0, y: 0, deep: 3});

        test.done();
    },

    'buildPath': function (test) {
        var board = bot.board.copy();
        var player = board.players.at(1);
        var pawn = bot.board.players.playersPositions[1];
        var closed = bot.processBoardForGoal(board, player);
        var goal = bot.findGoal(closed, pawn);

        var path = bot.buildPath(goal, bot.board.players.at(1).pick('x', 'y'),
            board, closed, player);

        test.deepEqual(path, [
            { x: 0, y: 0, deep: 3 },
            { x: 0, y: 1, deep: 2 },
            { x: 0, y: 2, deep: 1 }
        ]);

        test.done();
    },

    'findPathToGoal': function (test) {
        test.deepEqual(bot.findPathToGoal(bot.board.players.at(1)), [
            { x: 0, y: 0, deep: 3 },
            { x: 0, y: 1, deep: 2 },
            { x: 0, y: 2, deep: 1 }
        ]);
        test.done();
    },

    'getPossiblePosition - first': function (test) {
        bot = new Bot(0, board);
        test.deepEqual(bot.getPossiblePosition(), {x: 0, y: 0});
        test.done();
    },

    'getPossiblePosition - second': function (test) {
        test.deepEqual(bot.getPossiblePosition(), {x: 0, y: 2});
        test.done();
    }

});
