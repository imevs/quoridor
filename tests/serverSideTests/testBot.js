var nodeunit = require('nodeunit');
var _ = require('underscore');
var Bot = require('../../public/models/bot.js');
var gameHistory;

var bot, originSettimeout;

exports.bot = nodeunit.testCase({

    setUp: function (test) {
        bot = new Bot(1);
        gameHistory = [
            {
                x: 4,
                y: 2,
                t: 'p'
            },
            {
                x: 5,
                y: 1,
                t: 'p'
            }
        ];

        originSettimeout = global.setTimeout;
        global.setTimeout = function (callback) {
            callback();
        };

        test();
    },

    tearDown: function (test) {
        global.setTimeout = originSettimeout;

        test();
    },

    'create bot': function (test) {
        test.equal(bot.id, 1);

        test.done();
    },

    'start first': function (test) {
        global.setTimeout = function () {};

        bot.startGame(0, 0, gameHistory, 2);

        test.equal(bot.fencesRemaining, 10);
        test.equal(bot.x, 4);
        test.equal(bot.y, 2);
        test.equal(bot.newPositions.length, 4);
        test.done();
    },

    'start second': function (test) {
        bot.onStart(1, 0, gameHistory, 2);

        test.equal(bot.fencesRemaining, 10);
        test.equal(bot.x, 5);
        test.equal(bot.y, 1);
        test.equal(bot.newPositions.length, 0);
        test.done();
    },

    'start 2players game': function (test) {
        var gameHistory = [
            {
                x: 4,
                y: 2,
                t: 'p'
            },
            {
                x: 5,
                y: 1,
                t: 'p'
            },
            {
                x: 2,
                y: 3,
                t: 'p'
            },
            {
                x: 3,
                y: 2,
                t: 'p'
            }
        ];

        bot.onStart(1, 0, gameHistory, 2);

        test.equal(bot.fencesRemaining, 10);
        test.equal(bot.x, 3);
        test.equal(bot.y, 2);
        test.done();
    },

    'start 4players game': function (test) {
        bot = new Bot(1);
        var gameHistory = [
            {
                x: 4,
                y: 2,
                t: 'p'
            },
            {
                x: 5,
                y: 1,
                t: 'p'
            },
            {
                x: 2,
                y: 3,
                t: 'p'
            },
            {
                x: 3,
                y: 2,
                t: 'p'
            }
        ];

        bot.onStart(3, 0, gameHistory, 4);

        test.equal(bot.fencesRemaining, 5);
        test.equal(bot.x, 3);
        test.equal(bot.y, 2);
        test.done();
    },

    'first:getJumpPositions': function (test) {
        bot.onStart(0, 1, gameHistory, 2);

        test.deepEqual(bot.getJumpPositions(), [
            { x: 5, y: 2 },
            { x: 3, y: 2 },
            { x: 4, y: 3 },
            { x: 4, y: 1 }
        ]);
        test.done();
    },

    'second:getJumpPositions': function (test) {
        bot.onStart(1, 0, gameHistory, 2);

        test.deepEqual(bot.getJumpPositions(), [
            { x: 6, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 2 },
            { x: 5, y: 0 }
        ]);
        test.done();
    },

    'getJumpPositions': function (test) {
        bot.onStart(1, 0, gameHistory, 2);

        test.equal(bot.getJumpPositions().length, 4);
        test.deepEqual(bot.getJumpPositions(), [
            { x: 6, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 2 },
            { x: 5, y: 0 }
        ]);
        test.done();
    },

    'test getPossiblePosition': function (test) {
        bot.newPositions = [
            { x: 6, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 2 },
            { x: 5, y: 0 }
        ];
        var result = bot.getPossiblePosition();
        test.ok(!_().contains(result));
        test.equal(bot.newPositions.length, 3);
        test.done();
    },

    'canMovePlayer - true': function (test) {
        bot.newPositions = [
            { x: 6, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 2 },
            { x: 5, y: 0 }
        ];
        test.ok(bot.canMovePlayer());

        test.done();
    },

    'canMovePlayer - false': function (test) {
        bot.newPositions = [];
        test.ok(!bot.canMovePlayer());

        test.done();
    },

    'can`t Move Player after getPossiblePosition': function (test) {
        bot.newPositions = [
            { x: 6, y: 1 }
        ];

        test.ok(bot.canMovePlayer());
        bot.getPossiblePosition();
        test.ok(!bot.canMovePlayer());

        test.done();
    },

    'canMoveFence - ok': function (test) {
        bot.onStart(1, 0, gameHistory, 2);
        test.ok(bot.canMoveFence());
        test.done();
    },

    'canMoveFence - notOk': function (test) {
        bot.onStart(1, 0, gameHistory, 2);
        bot.fencesRemaining = 0;
        test.ok(!bot.canMoveFence());
        test.done();
    },

    'isCurrent - ok': function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        test.ok(!bot.isPlayerCanMakeTurn(0));
        test.ok(bot.isPlayerCanMakeTurn(1));
        test.done();
    },

    'isCurrent - not ok': function (test) {
        bot.onStart(1, 0, gameHistory, 2);
        test.ok(bot.isPlayerCanMakeTurn(0));
        test.ok(!bot.isPlayerCanMakeTurn(1));
        test.done();
    },

    'getNextActivePlayer - two players game': function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        test.equal(bot.getNextActivePlayer(0), 1);
        test.equal(bot.getNextActivePlayer(1), 0);
        test.done();
    },

    'getNextActivePlayer - four players game': function (test) {
        bot = new Bot(1);
        var gameHistory = [
            {
                x: 4,
                y: 2,
                t: 'p'
            },
            {
                x: 5,
                y: 1,
                t: 'p'
            },
            {
                x: 2,
                y: 3,
                t: 'p'
            },
            {
                x: 3,
                y: 2,
                t: 'p'
            }
        ];

        bot.onStart(0, 1, gameHistory, 4);
        test.equal(bot.getNextActivePlayer(0), 1);
        test.equal(bot.getNextActivePlayer(1), 2);
        test.equal(bot.getNextActivePlayer(2), 3);
        test.equal(bot.getNextActivePlayer(3), 0);
        test.done();
    },

    'movePlayer if no fences': function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.fencesRemaining = 0;

        bot.on('client_move_player', function (params) {
            test.ok(!!params);
            test.equal(bot.attemptsCount, 1);
            test.done();
        });

        bot.onMovePlayer({
            playerIndex: 1
        });
    },

    'test moveFence': function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.getJumpPositions = function () {
            return [];
        };
        test.ok(!bot.canMovePlayer());
        test.ok(bot.canMoveFence());

        bot.on('client_move_fence', function (params) {
            test.ok(!!params);
            test.equal(bot.attemptsCount, 1);
            test.done();
        });

        bot.onMovePlayer({
            playerIndex: 1
        });
    },

    'attemptsCount - 1': function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.getJumpPositions = function () {
            return [];
        };

        bot.onMovePlayer({playerIndex: 1});

        test.equal(bot.attemptsCount, 1);
        test.done();
    },

    'attemptsCount - 2': function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.getJumpPositions = function () {
            return [];
        };

        bot.onMovePlayer({playerIndex: 1});
        bot.makeTurn();

        test.equal(bot.attemptsCount, 2);

        test.done();
    },

    'check fences count after start': function (test) {
        var gameHistory = [
            {
                x: 4,
                y: 2,
                t: 'p'
            },
            {
                x: 5,
                y: 1,
                t: 'p'
            },
            {
                x : 4,
                x2: 5,
                y : 7,
                y2: 7,
                t : 'f'
            },
            {
                x : 4,
                x2: 5,
                y : 7,
                y2: 7,
                t : 'f'
            },
            {
                x : 4,
                x2: 5,
                y : 7,
                y2: 7,
                t : 'f'
            }
        ];
        bot.onStart(0, 1, gameHistory, 2);
        test.equals(bot.fencesRemaining, 8);

        bot.onStart(1, 0, gameHistory, 2);
        test.equals(bot.fencesRemaining, 9);

        test.equals(bot.fencesPositions.length, 0);

        test.done();
    },

    'test fencesPositions': function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.getJumpPositions = function () {
            return []; // no possible player positions
        };

        bot.onMovePlayer({playerIndex: 1});
        bot.onMovePlayer({playerIndex: 1});

        test.equals(bot.fencesPositions.length, 2);

        test.done();
    },

    'test fencesPositions 1': function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.getJumpPositions = function () {
            return []; // no possible player positions
        };

        bot.onMovePlayer({playerIndex: 0});
        bot.onMovePlayer({playerIndex: 1});

        test.equals(bot.fencesPositions.length, 1);

        test.done();
    },

    'test fencesPositions 2': function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.getJumpPositions = function () {
            return []; // no possible player positions
        };

        bot.onMoveFence({playerIndex: 1});
        bot.onMoveFence({playerIndex: 1});

        test.equals(bot.fencesPositions.length, 2);

        test.done();
    },

    'test fencesPositions 3': function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.getJumpPositions = function () {
            return []; // no possible player positions
        };

        bot.onMoveFence({playerIndex: 0});
        bot.onMoveFence({playerIndex: 1});

        test.equals(bot.fencesPositions.length, 1);

        test.done();
    }

});
