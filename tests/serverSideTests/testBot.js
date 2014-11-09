var assert = this.chai ? chai.assert : require('chai').assert;
var _ = this._ || require('underscore');
var Bot = this.Bot || require('../../public/models/Bot.js');

describe('simple bot', function () {

    var gameHistory;

    var bot, originSettimeout;

    beforeEach(function (test) {
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
    });

    afterEach(function (test) {
        global.setTimeout = originSettimeout;

        test();
    });

    it('create bot', function (test) {
        assert.equal(bot.id, 1);

        test();
    });

    it('start first', function (test) {
        global.setTimeout = function () {};

        bot.startGame(0, 0, gameHistory, 2);

        assert.equal(bot.fencesRemaining, 10);
        assert.equal(bot.x, 4);
        assert.equal(bot.y, 2);
        assert.equal(bot.newPositions.length, 4);
        test();
    });

    it('start second', function (test) {
        bot.onStart(1, 0, gameHistory, 2);

        assert.equal(bot.fencesRemaining, 10);
        assert.equal(bot.x, 5);
        assert.equal(bot.y, 1);
        assert.equal(bot.newPositions.length, 0);
        test();
    });

    it('start 2players game', function (test) {
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

        assert.equal(bot.fencesRemaining, 10);
        assert.equal(bot.x, 3);
        assert.equal(bot.y, 2);
        test();
    });

    it('start 4players game', function (test) {
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

        assert.equal(bot.fencesRemaining, 5);
        assert.equal(bot.x, 3);
        assert.equal(bot.y, 2);
        test();
    });

    it('first:getJumpPositions', function (test) {
        bot.onStart(0, 1, gameHistory, 2);

        assert.deepEqual(bot.getJumpPositions(), [
            { x: 5, y: 2 },
            { x: 3, y: 2 },
            { x: 4, y: 3 },
            { x: 4, y: 1 }
        ]);
        test();
    });

    it('second:getJumpPositions', function (test) {
        bot.onStart(1, 0, gameHistory, 2);

        assert.deepEqual(bot.getJumpPositions(), [
            { x: 6, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 2 },
            { x: 5, y: 0 }
        ]);
        test();
    });

    it('getJumpPositions', function (test) {
        bot.onStart(1, 0, gameHistory, 2);

        assert.equal(bot.getJumpPositions().length, 4);
        assert.deepEqual(bot.getJumpPositions(), [
            { x: 6, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 2 },
            { x: 5, y: 0 }
        ]);
        test();
    });

    it('test getPossiblePosition', function (test) {
        bot.newPositions = [
            { x: 6, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 2 },
            { x: 5, y: 0 }
        ];
        var result = bot.getPossiblePosition();
        assert.ok(!_().contains(result));
        assert.equal(bot.newPositions.length, 3);
        test();
    });

    it('canMovePlayer - true', function (test) {
        bot.newPositions = [
            { x: 6, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 2 },
            { x: 5, y: 0 }
        ];
        assert.ok(bot.canMovePlayer());

        test();
    });

    it('canMovePlayer - false', function (test) {
        bot.newPositions = [];
        assert.ok(!bot.canMovePlayer());

        test();
    });

    it('can`t Move Player after getPossiblePosition', function (test) {
        bot.newPositions = [
            { x: 6, y: 1 }
        ];

        assert.ok(bot.canMovePlayer());
        bot.getPossiblePosition();
        assert.ok(!bot.canMovePlayer());

        test();
    });

    it('canMoveFence - ok', function (test) {
        bot.onStart(1, 0, gameHistory, 2);
        assert.ok(bot.canMoveFence());
        test();
    });

    it('canMoveFence - notOk', function (test) {
        bot.onStart(1, 0, gameHistory, 2);
        bot.fencesRemaining = 0;
        assert.ok(!bot.canMoveFence());
        test();
    });

    it('isCurrent - ok', function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        assert.ok(!bot.isPlayerCanMakeTurn(0));
        assert.ok(bot.isPlayerCanMakeTurn(1));
        test();
    });

    it('isCurrent - not ok', function (test) {
        bot.onStart(1, 0, gameHistory, 2);
        assert.ok(bot.isPlayerCanMakeTurn(0));
        assert.ok(!bot.isPlayerCanMakeTurn(1));
        test();
    });

    it('getNextActivePlayer - two players game', function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        assert.equal(bot.getNextActivePlayer(0), 1);
        assert.equal(bot.getNextActivePlayer(1), 0);
        test();
    });

    it('getNextActivePlayer - four players game', function (test) {
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
        assert.equal(bot.getNextActivePlayer(0), 1);
        assert.equal(bot.getNextActivePlayer(1), 2);
        assert.equal(bot.getNextActivePlayer(2), 3);
        assert.equal(bot.getNextActivePlayer(3), 0);
        test();
    });

    it('movePlayer if no fences', function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.fencesRemaining = 0;

        bot.on('client_move_player', function (params) {
            assert.ok(!!params);
            assert.equal(bot.attemptsCount, 1);
            test();
        });

        bot.onMovePlayer({
            playerIndex: 1
        });
    });

    it('test moveFence', function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.getJumpPositions = function () {
            return [];
        };
        assert.ok(!bot.canMovePlayer());
        assert.ok(bot.canMoveFence());

        bot.on('client_move_fence', function (params) {
            assert.ok(!!params);
            assert.equal(bot.attemptsCount, 1);
            test();
        });

        bot.onMovePlayer({
            playerIndex: 1
        });
    });

    it('attemptsCount - 1', function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.getJumpPositions = function () {
            return [];
        };

        bot.onMovePlayer({playerIndex: 1});

        assert.equal(bot.attemptsCount, 1);
        test();
    });

    it('attemptsCount - 2', function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.getJumpPositions = function () {
            return [];
        };

        bot.onMovePlayer({playerIndex: 1});
        bot.makeTurn();

        assert.equal(bot.attemptsCount, 2);

        test();
    });

    it('check fences count after start', function (test) {
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
        assert.equal(bot.fencesRemaining, 8);

        bot.onStart(1, 0, gameHistory, 2);
        assert.equal(bot.fencesRemaining, 9);

        assert.equal(bot.fencesPositions.length, 0);

        test();
    });

    it('test fencesPositions', function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.getJumpPositions = function () {
            return []; // no possible player positions
        };

        bot.onMovePlayer({playerIndex: 1});
        bot.onMovePlayer({playerIndex: 1});

        assert.equal(bot.fencesPositions.length, 2);

        test();
    });

    it('test fencesPositions 1', function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.getJumpPositions = function () {
            return []; // no possible player positions
        };

        bot.onMovePlayer({playerIndex: 0});
        bot.onMovePlayer({playerIndex: 1});

        assert.equal(bot.fencesPositions.length, 1);

        test();
    });

    it('test fencesPositions 2', function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.getJumpPositions = function () {
            return []; // no possible player positions
        };

        bot.onMoveFence({playerIndex: 1});
        bot.onMoveFence({playerIndex: 1});

        assert.equal(bot.fencesPositions.length, 2);

        test();
    });

    it('test fencesPositions 3', function (test) {
        bot.onStart(0, 1, gameHistory, 2);
        bot.getJumpPositions = function () {
            return []; // no possible player positions
        };

        bot.onMoveFence({playerIndex: 0});
        bot.onMoveFence({playerIndex: 1});

        assert.equal(bot.fencesPositions.length, 1);

        test();
    });

});
