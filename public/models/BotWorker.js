/* global MegaBot, SmartBot, Bot, postMessage, addEventListener, importScripts */
importScripts('../libs/lodash.underscore.js');
importScripts('../libs/backbone.js');
importScripts('../libs/async.js');
importScripts('../utils.js');
importScripts('Bot.js');
importScripts('SmartBot.js');
importScripts('MegaBot.js');
importScripts('TurnModel.js');
importScripts('FenceModel.js');
importScripts('BoardValidation.js');
importScripts('PlayerModel.js');

Backbone.Model.prototype.set = function (key, val) {
    var attrs, attr;
    if (typeof key === 'object') {
        attrs = key;
    } else {
        (attrs = {})[key] = val;
    }

    for (attr in attrs)  {
        if  (attrs.hasOwnProperty(attr)) {
            this.attributes[attr] = attrs[attr];
        }
    }
};
var bot;

addEventListener('message', function (event) {
    if (event.data.eventName === 'create') {
        var id = event.data.id;
        var type = event.data.type || 'medium';

        if (type === 'simple') {
            bot = new Bot(id);
        } else if (type === 'medium') {
            bot = new SmartBot(id);
        } else if (type === 'super') {
            bot = new MegaBot(id);
        }

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
    } else {
        var params = [event.data.eventName].concat(event.data.params);
        bot.trigger.apply(bot, params);
    }
});