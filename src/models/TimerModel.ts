import { BackboneModel } from "../models/BackboneModel";

export class TimerModel extends BackboneModel {

    public defaults() { return {
        playerNames: [],
        timePrev: 0,
        allTime: 0,
        times: [0, 0, 0, 0],
        time: 0
    }; }

    public isStopped = false;
    public interval = 0;

    public next(current: number) {
        if (this.isStopped) {
            return;
        }
        const timer = this;
        this.get('times')[current] = this.get('times')[current] + this.get('time');
        timer.set('allTime', timer.get('allTime') + this.get('time'));
        timer.set('timePrev', timer.get('time'));
        timer.set('time', 0);
        clearInterval(this.interval);
        timer.interval = setInterval(() => {
            timer.set('time', timer.get('time') + 1);
        }, 1000);
    }

    public reset() {
        this.set('timePrev', this.get('time'));
        this.set('time', 0);
        this.set('allTime', 0);
        this.set('times', [0, 0, 0, 0]);
    }

    public stop() {
        this.isStopped = true;
        clearInterval(this.interval);
    }

}