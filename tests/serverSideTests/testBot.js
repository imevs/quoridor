var nodeunit = require('nodeunit');
var Backbone = require('backbone');
var _ = require('underscore');
var sinon = require('sinon');
var Game = require('../../server/models/game.js');
var Bot = require('../../server/models/bot.js');
var history;

var bot, game, originSettimeout;

exports['bot'] = nodeunit.testCase({

    setUp   : function (test) {
        bot = new Bot(1, 2);
        history = [
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
        global.setTimeout = function(callback) {
            callback();
        };

        test();
    },

    tearDown: function(test) {
        global.setTimeout = originSettimeout;

        test();
    },

    'create bot': function(test) {
        test.equal(bot.id, 1);

        test.done();
    },

    'start first': function(test) {
        global.setTimeout = function(callback) {};

        bot.onStart(0, 0, history);

        test.equal(bot.fencesRemaining, 10);
        test.equal(bot.x, 4);
        test.equal(bot.y, 2);
        test.equal(bot.newPositions.length, 4);
        test.done();
    },

    'start second': function(test) {
        bot.onStart(1, 0, history);

        test.equal(bot.fencesRemaining, 10);
        test.equal(bot.x, 5);
        test.equal(bot.y, 1);
        test.equal(bot.newPositions.length, 0);
        test.done();
    },

    'start 2players game': function(test) {
        history = [
            {
                x: 4,
                y: 2,
                t: 'p'
            },
            {
                x: 5,
                y: 1,
                t: 'p'
            }, {
                x: 2,
                y: 3,
                t: 'p'
            }, {
                x: 3,
                y: 2,
                t: 'p'
            }];

        bot.onStart(1, 0, history);

        test.equal(bot.fencesRemaining, 10);
        test.equal(bot.x, 3);
        test.equal(bot.y, 2);
        test.done();
    },

    'start 4players game': function(test) {
        bot = new Bot(1, 4);
        history = [
            {
                x: 4,
                y: 2,
                t: 'p'
            },
            {
                x: 5,
                y: 1,
                t: 'p'
            }, {
                x: 2,
                y: 3,
                t: 'p'
            }, {
                x: 3,
                y: 2,
                t: 'p'
            }];

        bot.onStart(3, 0, history);

        test.equal(bot.fencesRemaining, 5);
        test.equal(bot.x, 3);
        test.equal(bot.y, 2);
        test.done();
    },

    'first:getPositions': function(test) {
        bot.onStart(0, 1, history);

        test.deepEqual(bot.getPositions(), [
            { x: 5, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 1 }
        ]);
        test.done();
    },

    'second:getPositions': function(test) {
        bot.onStart(1, 0, history);

        test.deepEqual(bot.getPositions(), [
            { x: 6, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 0 }
        ]);
        test.done();
    },

    'getPositions': function(test) {
        bot.onStart(1, 0, history);

        test.equal(bot.getPositions().length, 4);
        test.deepEqual(bot.getPositions(), [
            { x: 6, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 0 }
        ]);
        test.done();
    },

    'getPossiblePosition': function(test) {
        bot.newPositions = [{ x: 6, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 0 }];
        var result = bot.getPossiblePosition();
        test.ok(!_().contains(result));
        test.equal(bot.newPositions.length, 3);
        test.done();
    },

    'canMovePlayer - true': function(test) {
        bot.newPositions = [{ x: 6, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 0 }];
        test.ok(bot.canMovePlayer());

        test.done();
    },

    'canMovePlayer - false': function(test) {
        bot.newPositions = [];
        test.ok(!bot.canMovePlayer());

        test.done();
    },

    'can`t Move Player after getPossiblePosition': function(test) {
        bot.newPositions = [{ x: 6, y: 1 }];

        test.ok(bot.canMovePlayer());
        bot.getPossiblePosition();
        test.ok(!bot.canMovePlayer());

        test.done();
    },

    'canMoveFence - ok': function(test) {
        bot.onStart(1, 0, history);
        test.ok(bot.canMoveFence());
        test.done();
    },

    'canMoveFence - notOk': function(test) {
        bot.onStart(1, 0, history);
        bot.fencesRemaining = 0;
        test.ok(!bot.canMoveFence());
        test.done();
    },

    'isCurrent - ok': function(test) {
        bot.onStart(0, 1, history);
        test.ok(!bot.isPlayerCanMakeTurn(0));
        test.ok(bot.isPlayerCanMakeTurn(1));
        test.done();
    },

    'isCurrent - not ok': function(test) {
        bot.onStart(1, 0, history);
        test.ok(bot.isPlayerCanMakeTurn(0));
        test.ok(!bot.isPlayerCanMakeTurn(1));
        test.done();
    },

    'getNextActivePlayer - two players game': function(test) {
        bot.onStart(0, 1, history);
        test.equal(bot.getNextActivePlayer(0), 1);
        test.equal(bot.getNextActivePlayer(1), 0);
        test.done();
    },

    'getNextActivePlayer - four players game': function(test) {
        bot = new Bot(1, 4);
        history = [
        {
            x: 4,
            y: 2,
            t: 'p'
        },
        {
            x: 5,
            y: 1,
            t: 'p'
        }, {
            x: 2,
            y: 3,
            t: 'p'
        }, {
            x: 3,
            y: 2,
            t: 'p'
        }];

        bot.onStart(0, 1, history);
        test.equal(bot.getNextActivePlayer(0), 1);
        test.equal(bot.getNextActivePlayer(1), 2);
        test.equal(bot.getNextActivePlayer(2), 3);
        test.equal(bot.getNextActivePlayer(3), 0);
        test.done();
    },

    'movePlayer if no fences': function(test) {
        bot.onStart(0, 1, history);
        bot.fencesRemaining = 0;

        bot.on('client_move_player', function(params) {
            test.ok(!!params);
            test.equal(bot.attemptsCount, 1);
            test.done();
        });

        bot.onMovePlayer({
            playerIndex: 1
        });
    },

    'test moveFence': function(test) {
        bot.onStart(0, 1, history);
        bot.getPositions = function() { return []};
        test.ok(!bot.canMovePlayer());
        test.ok(bot.canMoveFence());

        bot.on('client_move_fence', function(params) {
            test.ok(!!params);
            test.equal(bot.attemptsCount, 1);
            test.done();
        });

        bot.onMovePlayer({
            playerIndex: 1
        });
    },

    'attemptsCount - 1': function(test) {
        bot.onStart(0, 1, history);
        bot.getPositions = function() { return []};

        bot.onMovePlayer({playerIndex: 1});

        test.equal(bot.attemptsCount, 1);
        test.done();
    },

    'attemptsCount - 2': function(test) {
        bot.onStart(0, 1, history);
        bot.getPositions = function() { return []};

        bot.onMovePlayer({playerIndex: 1});
        bot.makeTurn();

        test.equal(bot.attemptsCount, 2);

        test.done();
    },

    'check fences count after start': function(test) {
        history = [
            {
                x: 4,
                y: 2,
                t: 'p'
            }, {
                x: 5,
                y: 1,
                t: 'p'
            }, {
                x: 4,
                x2: 5,
                y: 7,
                y2: 7,
                t: 'f'
            }, {
                x: 4,
                x2: 5,
                y: 7,
                y2: 7,
                t: 'f'
            }, {
                x: 4,
                x2: 5,
                y: 7,
                y2: 7,
                t: 'f'
            }
        ];
        bot.onStart(0, 1, history);
        test.equals(bot.fencesRemaining, 8);

        bot.onStart(1, 0, history);
        test.equals(bot.fencesRemaining, 9);

        test.equals(bot.fencesPositions.length, 0);

        test.done();
    },

    'test fencesPositions': function(test) {
        bot.onStart(0, 1, history);
        bot.getPositions = function() { return []};

        bot.onMovePlayer({playerIndex: 1});
        bot.onMovePlayer({playerIndex: 1});

        test.equals(bot.fencesPositions.length, 2);

        test.done();
    }

});
