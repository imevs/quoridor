import _ from "underscore";
import { BackboneModel } from "./BackboneModel";
import { BotWrapper } from "./BotWrapper";
import { FieldModel, FieldsCollection } from "./FieldModel";
import {
    FencePosition,
    FencesCollection,
    FenceModel
} from "./FenceModel";
import { PlayersCollection } from "./PlayerModel";
import { TimerModel } from "./TimerModel";
import { GameHistoryModel, TurnsCollection } from "./TurnModel";

export type PlayerNumber = -1 | 0 | 1 | 2 | 3;

export type BoardOptions = {
    debug?: boolean;
    roomId?: string;
    playersCount: number;
    botsCount: number;
    boardSize: number;
    currentPlayer: PlayerNumber | null;
    activePlayer: PlayerNumber;
};

export type InfoModel = BackboneModel<{
    playersPositions: ({ color: string; })[];
    currentPlayer?: number;
    activePlayer?: number;
    showCurrent: boolean;
    fences: { fencesRemaining: number; }[];
}>;

export abstract class BoardModel extends BackboneModel<BoardOptions> {
    public isPlayerMoved = false;
    public isFenceMoved = false;
    public auto = false;
    public bots: BotWrapper[] | undefined;
    public fences!: FencesCollection;
    public fields!: FieldsCollection;
    public players!: PlayersCollection;
    public history!: GameHistoryModel;
    public timerModel!: TimerModel;
    public infoModel!: InfoModel;

    public defaults() { return {
        botsCount: 0,
        boardSize: 9,
        playersCount: 2,
        currentPlayer: null,
        activePlayer: -1 as const,
    }; };

    public getActivePlayer() {
        return this.players.at(this.get('activePlayer')!);
    }

    public getActiveBot() {
        return _(this.bots).find(bot => {
            return bot.currentPlayer === this.get('activePlayer');
        });
    }

    public onSocketMoveFence(pos: FencePosition) { 
        const fence = this.fences.findWhere({
            type: pos.orientation,
            x   : pos.x,
            y   : pos.y
        });
        if (!fence) {
            return false;
        }
        this.auto = true;
        fence.trigger('selected', fence);
        this.auto = false;
        this.trigger('maketurn');
        return true;
    }
    public onSocketMovePlayer(pos: { x: number; y: number; timeout?: number; }) {
        if (pos.timeout) {
            this.isPlayerMoved = true;
        }
        this.auto = true;
        this.fields.trigger('moveplayer', pos.x, pos.y);
        this.auto = false;
        this.trigger('maketurn');
    }

    // Next methods are implemented in BoardValidation subclass >>
    // TODO: move validation in separate class
    abstract canSelectFences(): boolean;
    abstract notBreakSomePlayerPath(model: BackboneModel): boolean;
    abstract isValidCurrentPlayerPosition(x: number, y: number): boolean;
    // << BoardValidation

    public createModels() {
        this.fences = new FencesCollection();
        this.fields = new FieldsCollection();
        this.players = new PlayersCollection();
        this.timerModel = new TimerModel({
            playersCount: this.get('playersCount')
        });
        this.infoModel = new BackboneModel({
            playersPositions: this.players.playersPositions,
            fences: [],
            showCurrent: this.isOnlineGame() || this.get("botsCount") > 0,
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
            this.timerModel.next(this.get('activePlayer')!);
        }

        this.set('activePlayer', this.players.getNextActivePlayer(this.get('activePlayer')!));
    }

    public makeTurn() {
        const me = this;
        if (!(me.isPlayerMoved || me.isFenceMoved)) {
             return;
        }
        const active = me.getActivePlayer();
        const preBusy = me.fences.getMovedFence();
        const index = me.get('activePlayer');
        if (me.isFenceMoved) {
            me.getActivePlayer().placeFence();
            const preBusySibling = me.fences.getSibling(preBusy);
            if (preBusySibling) {
                me.history.add({
                    x: preBusy.get('x'),
                    y: preBusy.get('y'),
                    x2: preBusySibling.get('x'),
                    y2: preBusySibling.get('y'),
                    t: 'f'
                });    
            }
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

        if (!me.isOnlineGame()) {
            if (!me.getNextActiveBot(me.get('activePlayer')!)) {
                /**
                 * if local mode game then automatically change currentPlayer
                 */
                me.set('currentPlayer', me.get('activePlayer'));
            }
        }

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

        me.isPlayerMoved = false;
        me.isFenceMoved = false;
    }

    public getNextActiveBot(next: number): BotWrapper | undefined {
        return this.bots?.find(bot => {
            return bot.currentPlayer === next;
        });
    }

    public emitEventToBots(eventName: string, param: Record<string, string | number>) {
        const next = this.players.at(this.get('activePlayer')).get("url");
        this.bots?.forEach(bot => {
            if (next !== bot.currentPlayer) {
                bot.trigger(eventName, param);
            }
        });
        this.getNextActiveBot(next)?.trigger(eventName, param);
    }

    public isOnlineGame() {
        return false;
    }

    public onMovePlayer(x: number, y: number) {
        const me = this;
        console.log("onMovePlayer", x, y);
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
            currentPlayer: this.get('currentPlayer')!,
            activePlayer: this.get('activePlayer')!,
            fences: this.players.pluck('fencesRemaining')
        });
    }

    public onFenceSelected(model: FenceModel) {
        if (
            this.canSelectFences() &&
            this.fences.validateFenceAndSibling(model) &&
            this.notBreakSomePlayerPath(model)
        ) {
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

        this.fences.on({
            'selected': (model: FenceModel) => me.onFenceSelected(model),
            'highlight_current_and_sibling': (model: FenceModel) => {
                if (me.canSelectFences() &&
                    me.fences.validateFenceAndSibling(model) &&
                    me.notBreakSomePlayerPath(model)) {
                    me.fences.validateAndTriggerEventOnFenceAndSibling(model, 'markfence');
                }
            },
            'reset_current_and_sibling': (model: FenceModel) => {
                me.fences.triggerEventOnFenceAndSibling(model, 'unmarkfence');
            }
        });
    }

    public run(activePlayer: PlayerNumber, currentPlayer: PlayerNumber) {
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
        this.bots?.forEach(bot => {
            bot.terminate();
        });
        this.timerModel.stop();
    }

    public connectBots() {
        if (!this.get('botsCount')) {
            return;
        }
        const me = this;
        this.bots = [];

        const turns = this.history.get('turns')!.toJSON();

        _(this.get('botsCount')).times(i => {
            const botIndex = i + (this.get('playersCount') - this.get('botsCount'));

            const bot = new BotWrapper({
                id: botIndex,
                botType: 'medium'
            });
            bot.on('client_move_player', (pos) => me.onSocketMovePlayer(pos));
            bot.on('client_move_fence', (pos: FencePosition) => {
                if (this.onSocketMoveFence(pos) === false) {
                    const activeBot = this.getActiveBot();
                    if (activeBot) {
                        activeBot.trigger('server_turn_fail');
                    }
                }
            });
            bot.trigger('server_start', botIndex,
                this.get('activePlayer'), turns, this.get('playersCount'));

            this.bots!.push(bot);
        });
    }

    public initialize() {
        this.createModels();
        this.initEvents();
        this.initModels();
        this.updateInfo();
        this.afterInitialize();
    }

    public afterInitialize() {
        this.on('confirmturn', this.makeTurn);
        this.run(0, 0);
    }
}

