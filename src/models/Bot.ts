import _ from "underscore";

import { BackboneModel, Position } from "./BackboneModel";
import { PlayerNumber } from "./BoardModel";
import {GameHistoryModel, TurnModelProps, TurnsCollection} from "../models/TurnModel";

type PlayerPosition = Position & { playerIndex: number; };

export class Bot extends BackboneModel {
    x!: number;
    y!: number;
    id: number;
    _playerId?: number;
    fencesRemaining = 0;
    attemptsCount = 0;
    _currentPlayer?: PlayerNumber;
    _playersCount?: number;
    fencesCount = 20;
    _fencesPositions?: { x: number; y: number; type: "H" | "V"; }[];
    _newPositions?: { x: number; y: number; }[];

    get playerId() {
        return this._playerId ?? null;
    }

    get currentPlayer() {
        return this._currentPlayer ?? null;
    }

    get playersCount() {
        return this._playersCount ?? null;
    }

    get fencesPositions() {
        return this._fencesPositions ?? [];
    }

    get newPositions() {
        return this._newPositions ?? [];
    }


    constructor(id: number) {
        super();
        this.id = id;
        this._playerId = id;
        this.initEvents();
    }

    public startGame(currentPlayer: PlayerNumber, activePlayer: PlayerNumber, history: TurnModelProps[], playersCount: number)  {
        this.onStart(currentPlayer, activePlayer, history, playersCount, 9);
        if (currentPlayer === activePlayer) {
            this.turn();
        }
    }

    public setDelay = setTimeout;
    public random: (min: number, max: number) => number = _.random;

    public onStart(currentPlayer: PlayerNumber, _activePlayer: PlayerNumber, history: TurnModelProps[], playersCount: number, boardSize: number) {
        this._playersCount = playersCount;
        const turns = new TurnsCollection();
        const historyModel = new GameHistoryModel({
            turns: turns,
            boardSize: boardSize,
            playersCount: playersCount
        });
        turns.reset(history);
        const playerPositions = historyModel.getPlayerPositions();
        const position = playerPositions[currentPlayer];
        if (position) {
            this.x = position.x ?? 0;
            this.y = position.y ?? 0;
            this._newPositions = [];
            this._fencesPositions = [];
            this._currentPlayer = currentPlayer;
            this.fencesRemaining = Math.round(this.fencesCount / playersCount) - position.movedFences;
        }
    }

    public getNextActivePlayer(currentPlayer: number) {
        currentPlayer++;
        return currentPlayer < (this.playersCount ?? 0) ? currentPlayer : 0;
    }

    private initEvents() {
        this.on('server_move_player', this.onMovePlayer, this);
        this.on('server_move_fence', this.onMoveFence, this);
        this.on('server_start', this.startGame, this);
        this.on('server_turn_fail', this.makeTurn, this);
    }

    public isPlayerCanMakeTurn(playerIndex: number) {
        return this.currentPlayer === this.getNextActivePlayer(playerIndex);
    }

    public onMovePlayer(params: PlayerPosition) {
        if (this.currentPlayer === params.playerIndex) {
            this.x = params.x;
            this.y = params.y;
        }
        if (this.isPlayerCanMakeTurn(params.playerIndex)) {
            this.turn();
        }
    }

    public onMoveFence(params: PlayerPosition & { type: "H" | "V"; }) {
        if (this.currentPlayer === params.playerIndex) {
            this.fencesRemaining--;
        }
        if (this.isPlayerCanMakeTurn(params.playerIndex)) {
            this.turn();
        }
    }

    protected turn() {
        this.attemptsCount = 0;
        this._newPositions = this.getJumpPositions();
        this.makeTurn();
    }

    public makeTurn() {
        this.attemptsCount++;
        if (this.attemptsCount > 50) {
            console.warn('bot can`t make a turn');
            return;
        }
        this.setDelay.call(window, () => this.doTurn(), 1000);
    }

    private getFencePosition(): Position & { type: "H" | "V"; } {
        const y = this.random(0, 8);
        const x = this.random(0, 8);
        const type = this.random(0, 1) ? 'H' as const : 'V' as const;
        const res = {y: y, x: x, type: type};
        if (_(this.fencesPositions).contains(res)) {
            return this.getFencePosition();
        }
        this.fencesPositions.push(res);
        return res;
    }

    protected doTurn() {
        const bot = this;
        const random = this.random(0, 1);
        if (bot.canMovePlayer() && (random || !bot.canMoveFence())) {
            let playerPosition = bot.getPossiblePosition();
            if (playerPosition) {
                bot.trigger('client_move_player', playerPosition);
            }
            return;
        }

        if (bot.canMoveFence()) {
            const res = this.getFencePosition();
            const eventInfo = {
                x          : res.x,
                y          : res.y,
                type       : res.type,
                playerIndex: bot.id
            };

            bot.trigger('client_move_fence', eventInfo);
            return;
        }
        console.warn('something going wrong');
    }

    public getJumpPositions() {
        return [
            {
                x: this.x + 1,
                y: this.y
            },
            {
                x: this.x - 1,
                y: this.y
            },
            {
                x: this.x,
                y: this.y + 1
            },
            {
                x: this.x,
                y: this.y - 1
            }
        ];
    }

    public canMoveFence() {
        return this.fencesRemaining > 0;
    }

    public canMovePlayer() {
        return this.newPositions && this.newPositions.length > 0;
    }

    public getPossiblePosition() {
        const random = this.random(0, this.newPositions.length - 1);
        const position = this.newPositions[random];
        this.newPositions.splice(random, 1);
        return position;
    }

}