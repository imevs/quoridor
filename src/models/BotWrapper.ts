import { BackboneModel } from "./BackboneModel";
import { SmartBot } from "../models/SmartBot";
import { MegaBot } from "../models/MegaBot";
import { Bot } from "../models/Bot";
import type { EventHandler } from "backbone";

export class BotWrapper extends BackboneModel<{
    botType: 'simple' | 'medium' | 'super';
    id: number;
}> {

    public currentPlayer!: number;
    private bot!: Bot;

    public initialize() {
        const type = this.get('botType');
        const id = this.get('id');
        this.currentPlayer = id;
        // if (window.Worker) {
        //     this.bot = new Worker('/models/BotWorker.js');
        //     this.bot.postMessage({
        //         eventName: 'create',
        //         type: type,
        //         id: id
        //     });
        // } else {
            if (type === 'simple') {
                this.bot = new Bot(id);
            } else if (type === 'medium') {
                this.bot = new SmartBot(id);
            } else if (type === 'super') {
                this.bot = new MegaBot(id);
            }
        // }
    }

    // @ts-ignore
    public on(name: string, callback: EventHandler): this {
        // if (window.Worker) {
        //     (this.bot as Worker).addEventListener('message', event => {
        //         if (name === event.data.eventName) {
        //             callback(event.data.params);
        //         }
        //     });
        // } else {
            this.bot.on(name, callback);
        // }
        return this;
    }

    public trigger = (name: string, ...param: any[]): this => {
        console.log("trigger", name, ...param);
        if (!this.bot) {
            BackboneModel.prototype.trigger.call(this, name, ...param);
        }
        // if (window.Worker) {
        //     (this.bot as Worker).postMessage({
        //         eventName: name,
        //         params: param,
        //     });
        // } else {
            this.bot.trigger(name, ...param);
        // }
        return this;
    }

    public terminate() {
        // (this.bot as Worker).terminate?.();
        this.trigger = function () { return this; }; // do not trigger any events
    }

}
