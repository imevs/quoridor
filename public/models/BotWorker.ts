import { Bot } from "public/models/Bot";
import { SmartBot } from "public/models/SmartBot";
import { MegaBot } from "public/models/MegaBot";
import { BackboneModel } from "public/models/BackboneModel";

// importScripts('../libs/lodash.underscore.js');
// importScripts('../libs/backbone.js');
// importScripts('../libs/async.js');
// importScripts('../utils.js');
// importScripts('Bot.js');
// importScripts('SmartBot.js');
// importScripts('MegaBot.js');
// importScripts('TurnModel.js');
// importScripts('FenceModel.js');
// importScripts('BoardValidation.js');
// importScripts('PlayerModel.js');

let bot: BackboneModel;

addEventListener('message', event => {
    if (event.data.eventName === 'create') {
        const id = event.data.id;
        const type = event.data.type || 'medium';

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
        bot.trigger(event.data.eventName, event.data.params);
    }
});