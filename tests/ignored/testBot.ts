import { assert } from "chai";
import _ from 'underscore';
import { Bot } from '../../src/models/Bot';

describe('simple bot', function () {

    var gameHistory: { x: number; y: number; t: string; }[];

    var bot: Bot;

    beforeEach(function () {
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
        bot.setDelay = (callback: any) => { callback(); return 0; };
        bot.random = () => 0;
    });

    it('create bot', function () {
        assert.equal(bot.id, 1);
    });

    it('start first', function () {
        bot.startGame(0, 0, gameHistory, 2);

        assert.equal(bot.fencesRemaining, 10);
        assert.equal(bot.x, 4);
        assert.equal(bot.y, 2);
        assert.equal(bot.newPositions.length, 4);
    });

    it('start second', function () {
        bot.onStart(1, 0, gameHistory, 2, 9);

        assert.equal(bot.fencesRemaining, 10);
        assert.equal(bot.x, 5);
        assert.equal(bot.y, 1);
        assert.equal(bot.newPositions.length, 0);
    });

    it('start 2players game', function () {
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

        bot.onStart(1, 0, gameHistory, 2, 9);

        assert.equal(bot.fencesRemaining, 10);
        assert.equal(bot.x, 3);
        assert.equal(bot.y, 2);
    });

    it('start 4players game', function () {
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

        bot.onStart(3, 0, gameHistory, 4, 9);

        assert.equal(bot.fencesRemaining, 5);
        assert.equal(bot.x, 3);
        assert.equal(bot.y, 2);
    });

    it('first:getJumpPositions', function () {
        bot.onStart(0, 1, gameHistory, 2, 9);

        assert.deepEqual(bot.getJumpPositions(), [
            { x: 5, y: 2 },
            { x: 3, y: 2 },
            { x: 4, y: 3 },
            { x: 4, y: 1 }
        ]);
    });

    it('second:getJumpPositions', function () {
        bot.onStart(1, 0, gameHistory, 2, 9);

        assert.deepEqual(bot.getJumpPositions(), [
            { x: 6, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 2 },
            { x: 5, y: 0 }
        ]);
    });

    it('getJumpPositions', function () {
        bot.onStart(1, 0, gameHistory, 2, 9);

        assert.equal(bot.getJumpPositions().length, 4);
        assert.deepEqual(bot.getJumpPositions(), [
            { x: 6, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 2 },
            { x: 5, y: 0 }
        ]);
    });

    it('test getPossiblePosition', function () {
        bot._newPositions = [
            { x: 6, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 2 },
            { x: 5, y: 0 }
        ];
        bot.getPossiblePosition();
        assert.equal(bot.newPositions.length, 3);
    });

    it('canMovePlayer - true', function () {
        bot._newPositions = [
            { x: 6, y: 1 },
            { x: 4, y: 1 },
            { x: 5, y: 2 },
            { x: 5, y: 0 }
        ];
        assert.ok(bot.canMovePlayer());
    });

    it('canMovePlayer - false', function () {
        bot._newPositions = [];
        assert.ok(!bot.canMovePlayer());
    });

    it('can`t Move Player after getPossiblePosition', function () {
        bot._newPositions = [
            { x: 6, y: 1 }
        ];

        assert.ok(bot.canMovePlayer());
        bot.getPossiblePosition();
        assert.ok(!bot.canMovePlayer());
    });

    it('canMoveFence - ok', function () {
        bot.onStart(1, 0, gameHistory, 2, 9);
        assert.ok(bot.canMoveFence());
    });

    it('canMoveFence - notOk', function () {
        bot.onStart(1, 0, gameHistory, 2, 9);
        bot.fencesRemaining = 0;
        assert.ok(!bot.canMoveFence());
    });

    it('isCurrent - ok', function () {
        bot.onStart(0, 1, gameHistory, 2, 9);
        assert.ok(!bot.isPlayerCanMakeTurn(0));
        assert.ok(bot.isPlayerCanMakeTurn(1));
    });

    it('isCurrent - not ok', function () {
        bot.onStart(1, 0, gameHistory, 2, 9);
        assert.ok(bot.isPlayerCanMakeTurn(0));
        assert.ok(!bot.isPlayerCanMakeTurn(1));
    });

    it('getNextActivePlayer - two players game', function () {
        bot.onStart(0, 1, gameHistory, 2, 9);
        assert.equal(bot.getNextActivePlayer(0), 1);
        assert.equal(bot.getNextActivePlayer(1), 0);
    });

    it('getNextActivePlayer - four players game', function () {
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

        bot.onStart(0, 1, gameHistory, 4, 9);
        assert.equal(bot.getNextActivePlayer(0), 1);
        assert.equal(bot.getNextActivePlayer(1), 2);
        assert.equal(bot.getNextActivePlayer(2), 3);
        assert.equal(bot.getNextActivePlayer(3), 0);
    });

    it('movePlayer if no fences', function (test) {
        bot.onStart(0, 1, gameHistory, 2, 9);
        bot.fencesRemaining = 0;

        bot.on('client_move_player', function (params) {
            assert.ok(!!params);
            assert.equal(bot.attemptsCount, 1);
            test();
        });

        bot.onMovePlayer({
            playerIndex: 1, x: 0, y: 0,
        });
    });

    it('test moveFence', function (test) {
        bot.onStart(0, 1, gameHistory, 2, 9);
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
            playerIndex: 1, x: 0, y: 0,
        });
    });

    it('attemptsCount - 1', function () {
        bot.onStart(0, 1, gameHistory, 2, 9);
        bot.getJumpPositions = function () {
            return [];
        };

        bot.onMovePlayer({playerIndex: 1, x: 0, y: 0,});

        assert.equal(bot.attemptsCount, 1);
    });

    it('attemptsCount - 2', function () {
        bot.onStart(0, 1, gameHistory, 2, 9);
        bot.getJumpPositions = function () {
            return [];
        };

        bot.onMovePlayer({playerIndex: 1, x: 0, y: 0,});
        bot.makeTurn();

        assert.equal(bot.attemptsCount, 2);
    });

    it('check fences count after start', function () {
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
        bot.onStart(0, 1, gameHistory, 2, 9);
        assert.equal(bot.fencesRemaining, 8);

        bot.onStart(1, 0, gameHistory, 2, 9);
        assert.equal(bot.fencesRemaining, 9);

        assert.equal(bot.fencesPositions.length, 0);
    });

    it('test fencesPositions', function () {
        bot.onStart(0, 1, gameHistory, 2, 9);
        bot.getJumpPositions = function () {
            return []; // no possible player positions
        };

        bot.onMovePlayer({playerIndex: 1, x: 0, y: 0 });
        bot.onMovePlayer({playerIndex: 1, x: 0, y: 0 });

        assert.equal(bot.fencesPositions.length, 2);
    });

    it('test fencesPositions 1', function () {
        bot.onStart(0, 1, gameHistory, 2, 9);
        bot.getJumpPositions = function () {
            return []; // no possible player positions
        };

        bot.onMovePlayer({playerIndex: 0, x: 0, y: 0 });
        bot.onMovePlayer({playerIndex: 1, x: 0, y: 0 });

        assert.equal(bot.fencesPositions.length, 1);
    });

    it('test fencesPositions 2', function () {
        bot.onStart(0, 1, gameHistory, 2, 9);
        bot.getJumpPositions = function () {
            return []; // no possible player positions
        };

        bot.onMoveFence({playerIndex: 1, type: "H", x: 0, y: 0});
        bot.onMoveFence({playerIndex: 1, type: "H", x: 0, y: 0});

        assert.equal(bot.fencesPositions.length, 2);
    });

    it('test fencesPositions 3', function () {
        bot.onStart(0, 1, gameHistory, 2, 9);
        bot.getJumpPositions = function () {
            return []; // no possible player positions
        };

        bot.onMoveFence({playerIndex: 0, type: "H", x: 0, y: 0});
        bot.onMoveFence({playerIndex: 1, type: "H", x: 0, y: 0});

        assert.equal(bot.fencesPositions.length, 1);
    });

});
