var nodeunit = require('nodeunit');
var Backbone = require('backbone');
var sinon = require('sinon');
var Game = require('../../server/models/game.js');
var Bot = require('../../server/models/bot.js');
var TurnModel = require('../../public/models/TurnModel.js');
var history;

/*
Backbone.sync = function() {};

function extend(Child, Parent) {
    Child.prototype = Parent.prototype;
}

var emitter = require('events').EventEmitter;
var playerSocket = function (id) {
    this.id = id;
};
extend(playerSocket, emitter);

global.setTimeout = function() {};
*/

var bot, game, io;

exports['bot'] = nodeunit.testCase({

    setUp   : function (test) {
        bot = new Bot(1);
        history = new TurnModel();
        history.add({
            x: 4,
            y: 2,
            t: 'p'
        });
        history.add({
            x: 5,
            y: 1,
            t: 'p'
        });

        test();
    },

    'create bot': function(test) {
        test.equal(bot.id, 1);

        test.done();
    },

    'start first': function(test) {
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

    'first:getPositions': function(test) {
        bot.onStart(0, 0, history);

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
    }



});
