import { BackboneModel, Position } from "./BackboneModel";
import _ from "underscore";
import { GameHistoryModel, TurnsCollection } from "public/models/TurnModel";

type PlayerPosition = Position & { playerIndex: number; };

export class Bot extends BackboneModel {
    x!: number;
    y!: number;
    id = 0;
    playerId = 0;
    fencesRemaining = 0;
    attemptsCount = 0;
    currentPlayer = 0;
    playersCount = 0;
    fencesCount = 20;
    fencesPositions: {}[] = [];
    newPositions: {}[] = [];

    constructor(id: number) {
        super();
        this.id = id;

        this.playerId = id;
        this.initEvents();
    }

    public startGame = (currentPlayer: number, activePlayer: number) => {
        this.onStart(currentPlayer, activePlayer, [], 0, 9);
        if (currentPlayer === activePlayer) {
            this.turn();
        }
    }

    public onStart(currentPlayer: number, _activePlayer: number, history: {}[], playersCount: number, boardSize: number) {
        this.playersCount = +playersCount;
        var historyModel = new GameHistoryModel({
            turns: new TurnsCollection(),
            boardSize: boardSize,
            playersCount: this.playersCount
        });
        historyModel.get('turns')!.reset(history);
        var playerPositions = historyModel.getPlayerPositions();
        var position = playerPositions[currentPlayer];
        if (position) {
            this.x = position.x ?? 0;
            this.y = position.y ?? 0;
            this.newPositions = [];
            this.fencesPositions = [];
            this.currentPlayer = currentPlayer;
            this.fencesRemaining = Math.round(this.fencesCount / this.playersCount) - position.movedFences;
        }
    }

    public getNextActivePlayer(currentPlayer: number) {
        currentPlayer++;
        return currentPlayer < this.playersCount ? currentPlayer : 0;
    }

    public initEvents() {
        this.on('server_move_player', this.onMovePlayer);
        this.on('server_move_fence', this.onMoveFence);
        this.on('server_start', this.startGame);
        this.on('server_turn_fail', this.makeTurn);
    }

    public isPlayerCanMakeTurn(playerIndex: number) {
        return this.currentPlayer === this.getNextActivePlayer(playerIndex);
    }

    public onMovePlayer = (params: PlayerPosition) => {
        if (this.currentPlayer === params.playerIndex) {
            this.x = params.x;
            this.y = params.y;
        }
        if (this.isPlayerCanMakeTurn(params.playerIndex)) {
            this.turn();
        }
    }

    public onMoveFence = (params: PlayerPosition & { type: "H" | "V"; }) => {
        if (this.currentPlayer === params.playerIndex) {
            this.fencesRemaining--;
        }
        if (this.isPlayerCanMakeTurn(params.playerIndex)) {
            this.turn();
        }
    }

    public turn() {
        this.attemptsCount = 0;
        this.newPositions = this.getJumpPositions();
        this.makeTurn();
    }

    public makeTurn = () => {
        var bot = this;
        this.attemptsCount++;
        if (this.attemptsCount > 50) {
            console.log('bot can`t make a turn');
            return;
        }
        setTimeout(_(bot.doTurn).bind(bot), 1000);
    }

    public getFencePosition(): Position & { type: "H" | "V"; } {
        var y = _.random(0, 8);
        var x = _.random(0, 8);
        var type = _.random(0, 1) ? 'H' as const : 'V' as const;
        var res = {y: y, x: x, type: type};
        if (_(this.fencesPositions).contains(res)) {
            return this.getFencePosition();
        }
        this.fencesPositions.push(res);
        return res;
    }

    public doTurn() {
        var bot = this;
        var random = _.random(0, 1);
        var playerPosition;
        if (bot.canMovePlayer() && (random || !bot.canMoveFence())) {
            playerPosition = bot.getPossiblePosition();
            if (playerPosition) {
                bot.trigger('client_move_player', playerPosition);
            }
            return;
        }

        if (bot.canMoveFence()) {
            var res = this.getFencePosition();
            var eventInfo = {
                x          : res.x,
                y          : res.y,
                type       : res.type,
                playerIndex: bot.id
            };

            bot.trigger('client_move_fence', eventInfo);
            return;
        }
        console.log('something going wrong');
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
        return this.newPositions.length > 0;
    }

    public getPossiblePosition() {
        var random = _.random(0, this.newPositions.length - 1);
        var position = this.newPositions[random];
        this.newPositions.splice(random, 1);
        return position;
    }

}