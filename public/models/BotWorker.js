/* global MegaBot, postMessage, addEventListener, importScripts */
importScripts('../libs/underscore.js');
importScripts('../libs/backbone.js');
importScripts('../utils.js');
importScripts('bot.js');
importScripts('smartBot.js');
importScripts('megaBot.js');
importScripts('TurnModel.js');
importScripts('FenceModel.js');
importScripts('BoardValidation.js');
importScripts('PlayerModel.js');

var bot;

addEventListener('message', function (event) {
    if (event.data.eventName === 'server_start') {
        bot = new MegaBot(event.data.params[0]);

        bot.on('client_move_player', function () {
            postMessage({
                eventName: 'client_move_player',
                params: Array.prototype.slice.call(arguments, 0)
            });
        });
        bot.on('client_move_fence', function () {
            postMessage({
                eventName: 'client_move_fence',
                params: Array.prototype.slice.call(arguments, 0)
            });
        });
    }
    var params = [event.data.eventName].concat(event.data.params);
    bot.trigger.apply(bot, params);
});