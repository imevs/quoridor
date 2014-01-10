/* global MegaBot, SmartBot, Bot */

window.BotWrapper = Backbone.Model.extend({

    initialize: function () {
        var type = this.get('botType');
        var id = this.get('id');
        this.currentPlayer = id;
        if (window.Worker) {
            this.bot = new Worker('/models/BotWorker.js');
            this.bot.postMessage({
                eventName: 'create',
                type: type,
                id: id
            });
        } else {
            if (type === 'simple') {
                this.bot = new Bot(id);
            } else if (type === 'medium') {
                this.bot = new SmartBot(id);
            } else if (type === 'super') {
                this.bot = new MegaBot(id);
            }
        }
    },

    on: function (name, callback, scope) {
        var me = this;
        if (window.Worker) {
            this.bot.addEventListener('message', function (event) {
                if (name === event.data.eventName) {
                    callback.apply(scope || me, event.data.params);
                }
            });
        } else {
            this.bot.on.apply(this.bot, arguments);
        }
    },

    trigger: function () {
        if (!this.bot) {
            Backbone.Model.prototype.trigger.apply(this, arguments);
            return;
        }
        if (window.Worker) {
            this.bot.postMessage({
                eventName: arguments[0],
                params: Array.prototype.slice.call(arguments, 1)
            });
        } else {
            this.bot.trigger.apply(this.bot, arguments);
        }
    },

    terminate: function () {
        if (this.bot.terminate) {
            this.bot.terminate();
        }
        this.trigger = function () {}; // do not trigger any events
    }

});