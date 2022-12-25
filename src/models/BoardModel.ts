// import _ from "underscore";
import { BackboneModel } from "./BackboneModel";
import { BotWrapper } from "./BotWrapper";
import { FieldModel, FieldsCollection } from "./FieldModel";
import {
    FenceHModel,
    FencePosition,
    FencesCollection,
    FenceVModel
} from "./FenceModel";
import { PlayersCollection } from "./PlayerModel";
import { TimerModel } from "./TimerModel";
import { GameHistoryModel, TurnsCollection } from "./TurnModel";

export class BoardModel extends BackboneModel {
    public isPlayerMoved = false;
    public isFenceMoved = false;
    public auto = false;
    public bots: BotWrapper[] = [];
    public fences!: FencesCollection;
    public fields!: FieldsCollection;
    public players!: PlayersCollection;
    public history!: GameHistoryModel;
    public timerModel!: TimerModel;
    public infoModel!: BackboneModel<{ 
        playersPositions: ({ color: string; })[];
        currentPlayer?: number;
        activePlayer?: number;
        fences?: { fencesRemaining: number; }[];
     }>;

    public defaults() { return {
        botsCount: 0,
        boardSize: 9,
        playersCount: 2,
        currentPlayer: null,
        activePlayer: null
    }; };

    public getActivePlayer() {
        return this.players.at(this.get('activePlayer'));
    }

    public getActiveBot() {
        return _(this.bots).find(bot => {
            return bot.currentPlayer === this.get('currentPlayer');
        });
    }

    // Next methods are implemented in BoardSocketEvents >>
    public remoteEvents(_num: number): void {}
    public onSocketMovePlayer = (_model: { x: number; y: number; timeout?: number; }) => {}
    public onSocketMoveFence(_pos: FencePosition): boolean { return true; }
    // << BoardSocketEvents

    // Next methods are implemented in BoardValidation subclass >>
    public canSelectFences(): boolean { return true; }
    public notBreakSomePlayerPath(_model: BackboneModel): boolean { return true; }
    public isValidCurrentPlayerPosition(_x: number, _y: number): boolean { return true; }
    // << BoardValidation

    public createModels() {
        this.fences = new FencesCollection();
        this.fields = new FieldsCollection();
        this.players = new PlayersCollection();
        this.timerModel = new TimerModel({
            playersCount: this.get('playersCount')
        });
        this.infoModel = new BackboneModel({
            playersPositions: this.players.playersPositions
        });
        this.history = new GameHistoryModel({
            turns: new TurnsCollection(),
            debug: this.get('debug'),
            boardSize: this.get('boardSize'),
            playersCount: this.get('playersCount')
        });
    }

    public initModels() {
        const me = this;
        const count = me.get('playersCount');
        if (count !== 2 && count !== 4) {
            me.set('playersCount', 2);
        }
        me.set('botsCount', Math.min(me.get('playersCount'), me.get('botsCount')));
        me.fields.createFields(me.get('boardSize'));
        me.fences.createFences(me.get('boardSize'));
        me.players.createPlayers(me.get('playersCount'));

        this.history.set('playerNames', this.players.getPlayerNames());
        this.timerModel.set('playerNames', this.players.getPlayerNames());
    }

    public switchActivePlayer() {
        if (this.history.get('turns').length > this.get('playersCount')) {
            this.timerModel.next(this.get('activePlayer'));
        }

        this.set('activePlayer', this.players.getNextActivePlayer(this.get('activePlayer')));
    }

    public makeTurn() {
        /* jshint maxcomplexity:9 */
        const me = this;
        // if (!(me.isPlayerMoved || me.isFenceMoved)) {
        //     return;
        // }
        const active = me.getActivePlayer();
        const preBusy = me.fences.getMovedFence();
        const index = me.get('activePlayer');
        if (me.isFenceMoved) {
            me.getActivePlayer().placeFence();
            const preBusySibling = me.fences.getSibling(preBusy);
            me.history.add({
                x: preBusy.get('x'),
                y: preBusy.get('y'),
                x2: preBusySibling.get('x'),
                y2: preBusySibling.get('y'),
                t: 'f'
            });
            me.fences.setBusy();
        }
        if (me.isPlayerMoved) {
            me.history.add({
                x: active.get('x'),
                y: active.get('y'),
                t: 'p'
            });
        }
        me.switchActivePlayer();
        me.players.each(player => {
            player.trigger('resetstate');
        });
        me.getActivePlayer().trigger('setcurrent');

        // if (!me.isOnlineGame()) {
        //     if (!me.getNextActiveBot(me.get('activePlayer'))) {
        /**
         * if local mode game then automatic change currentPlayer
         */
        // me.set('currentPlayer', me.get('activePlayer'));
        // }

        if (me.isFenceMoved) {
            me.emitEventToBots('server_move_fence', {
                x: preBusy.get('x'),
                y: preBusy.get('y'),
                type: preBusy.get('orientation'),
                playerIndex: index
            });
        }
        if (me.isPlayerMoved) {
            me.emitEventToBots('server_move_player', {
                x: active.get('x'),
                y: active.get('y'),
                playerIndex: index
            });
        }
        // }

        me.isPlayerMoved = false;
        me.isFenceMoved = false;
    }

    public getNextActiveBot(next: string): BotWrapper | undefined {
        return this.bots.find(bot => {
            return bot.currentPlayer === next;
        });
    }

    public emitEventToBots(eventName: string, param: any) {
        // FIXME - recheck
        const next = this.players.at(this.get('activePlayer')).get("id")!;
        this.bots.forEach(bot => {
            if (next !== bot.currentPlayer) {
                bot.trigger(eventName, param);
            }
        });
        const nextBot = this.getNextActiveBot(next);
        if (nextBot) {
            nextBot.trigger(eventName, param);
        }
    }

    public isOnlineGame() {
        return this.get('roomId');
    }

    public onMovePlayer(x: number, y: number) {
        const me = this;
        if (me.isValidCurrentPlayerPosition(x, y)) {
            const current = me.getActivePlayer();
            current.moveTo(x, y);
            me.fences.clearBusy();
            me.isFenceMoved = false;
            me.isPlayerMoved = true;
        } else {
            const activeBot = me.getActiveBot();
            if (activeBot) {
                activeBot.trigger('server_turn_fail');
            }
        }
    }

    public updateInfo() {
        this.infoModel.set({
            currentPlayer: this.get('currentPlayer'),
            activePlayer: this.get('activePlayer'),
            fences: this.players.pluck('fencesRemaining')
        });
    }

    public onFenceSelected(model: FenceHModel | FenceVModel) {
        if (this.canSelectFences() &&
            this.fences.validateFenceAndSibling(model) &&
            this.notBreakSomePlayerPath(model)) {

            this.fences.clearBusy();
            this.fences.validateAndTriggerEventOnFenceAndSibling(model, 'movefence');

            this.players.updatePlayersPositions();
            this.isPlayerMoved = false;
            this.isFenceMoved = true;
        } else {
            const activeBot = this.getActiveBot();
            if (activeBot) {
                activeBot.trigger('server_turn_fail');
            }
        }
    }

    public initEvents() {
        const me = this;

        me.on('maketurn', this.makeTurn);

        this.fields.on('moveplayer', me.onMovePlayer, this);
        this.fields.on('beforeselectfield', (x, y, model: FieldModel) => {
            if (me.isValidCurrentPlayerPosition(x, y)) {
                model.selectField();
            }
        });
        this.on('change:activePlayer', this.updateInfo, this);
        this.on('change:currentPlayer', this.updateInfo, this);

        this.players.on('win', player => {
            const names = me.players.getPlayerNames();
            const message = names[player] + ' player ' + 'is winner. Do you want to start new game?';
            if (window.confirm(message)) {
                document.location.reload();
            } else {
                me.stop();
            }
        });
        this.fences.on({
            'selected': (model: FenceHModel | FenceVModel) => me.onFenceSelected(model),
            'highlight_current_and_sibling': (model: FenceHModel | FenceVModel) => {
                if (me.canSelectFences() &&
                    me.fences.validateFenceAndSibling(model) &&
                    me.notBreakSomePlayerPath(model)) {
                    me.fences.validateAndTriggerEventOnFenceAndSibling(model, 'markfence');
                }
            },
            'reset_current_and_sibling': (model: FenceHModel | FenceVModel) => {
                me.fences.triggerEventOnFenceAndSibling(model, 'unmarkfence');
            }
        });
    }

    public run(activePlayer: number, currentPlayer: number) {
        this.set({
            activePlayer: activePlayer,
            currentPlayer: currentPlayer,
        });
        if (!this.isOnlineGame()) {
            this.history.initPlayers();
        }
        this.connectBots();
    }

    public stop() {
        this.bots.forEach(bot => {
            bot.terminate();
        });
        this.timerModel.stop();
    }

    public connectBots() {
        if (this.get('botsCount') === undefined) {
            return;
        }
        const me = this;

        const turns = this.history.get('turns')!.toJSON();

        _(this.get('botsCount')).times(i => {
            const botIndex = i + (this.get('playersCount') - this.get('botsCount'));

            const bot = new BotWrapper({
                id: botIndex,
                botType: 'super'
            });
            bot.on('client_move_player', me.onSocketMovePlayer);
            bot.on('client_move_fence', (pos: FencePosition) => {
                if (me.onSocketMoveFence(pos) === false) {
                    const activeBot = this.getActiveBot();
                    if (activeBot) {
                        activeBot.trigger('server_turn_fail');
                    }
                }
            });
            bot.trigger('server_start', botIndex,
                this.get('activePlayer'), turns, this.get('playersCount'));

            this.bots.push(bot);
        });
    }

    public initialize() {
        this.set({
            'playersCount': +this.get('playersCount'),
            'boardSize': +this.get('boardSize')
        });
        this.createModels();
        this.initEvents();
        this.initModels();
        if (this.isOnlineGame()) {
            this.remoteEvents(this.get('currentPlayer'));
        } else {
            this.on('confirmturn', this.makeTurn);
            this.run(0, 0);
        }
    }
}

