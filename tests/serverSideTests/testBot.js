var nodeunit = require('nodeunit');
var Backbone = require('backbone');
var sinon = require('sinon');
var Bot = require('../../server/models/bot.js');

var bot;
exports['bot'] = nodeunit.testCase({

    setUp   : function (test) {
        bot = new Bot(1);
        test();
    },

    'create bot': function(test) {
        test.equal(bot.id, 1);

        test.done();
    }

});
