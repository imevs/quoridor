import _ from "underscore";
import { Bot } from "../models/Bot";
import { FencesCollection } from "../models/FenceModel";
import { PlayerModel, PlayersCollection } from "../models/PlayerModel";
import {GameHistoryModel, TurnModelProps, TurnsCollection} from "../models/TurnModel";
import { BoardValidation } from "../models/BoardValidation";
import { PlayerNumber } from "../models/BoardModel";
import { Position } from "../models/BackboneModel";

type PositionWithDeep = Position & { deep: number; };
type PlayerPosition = Position & { playerIndex: number; };

export class SmartBot extends Bot {

    public board!: BoardValidation;
    public player!: PlayerModel;
    public activePlayer!: PlayerNumber;
    public fencesRemaining: number = 0;

    public onMovePlayer(params: PlayerPosition) {
        this.board.players.at(params.playerIndex).set({
            x: params.x,
            y: params.y,
            prev_x: params.x,
            prev_y: params.y
        });

        if (this.isPlayerCanMakeTurn(params.playerIndex)) {
            this.turn();
        }
    }

    public onMoveFence(params: PlayerPosition & { type: "H" | "V"; }) {
        const fence = this.board.fences.findWhere({
            x: params.x,
            y: params.y,
            type: params.type
        });
        const sibling = this.board.fences.getSibling(fence);
        fence?.set('state', 'busy');
        sibling?.set('state', 'busy');

        if (this.currentPlayer === params.playerIndex) {
            this.fencesRemaining--;
        }
        if (this.isPlayerCanMakeTurn(params.playerIndex)) {
            this.turn();
        }
    }

    public onStart(currentPlayer: PlayerNumber, _activePlayer: PlayerNumber, history: TurnModelProps[], playersCount: number, boardSize: number) {
        this._newPositions = [];
        this._fencesPositions = [];
        this._currentPlayer = currentPlayer;
        this._playersCount = playersCount;

        const historyModel = new GameHistoryModel({
            turns: new TurnsCollection(),
            boardSize: boardSize,
            playersCount: playersCount
        });
        if (history.length) {
            historyModel.get('turns').reset(history);
        } else {
            historyModel.initPlayers();
        }

        this.board = new BoardValidation({
            boardSize: historyModel.get('boardSize'),
            playersCount: historyModel.get('playersCount'),
            currentPlayer: this.currentPlayer!,
            activePlayer: this.activePlayer!,
            botsCount: 0
        });
        this.board.fences = new FencesCollection();
        this.board.fences.createFences(historyModel.get('boardSize'));
        this.board.players = new PlayersCollection(historyModel.getPlayerPositions(), { model: PlayerModel });
        this.player = this.board.players.at(currentPlayer);

        const position = historyModel.getPlayerPositions()[currentPlayer];
        if (position) {
            this.fencesRemaining = Math.round(this.fencesCount / playersCount) - position.movedFences;
        }
    }

    public getPossiblePosition() {
        //console.profile();
        const board = this.board.copy();
        if (this.currentPlayer === null) {
            console.error("this.currentPlayer is null");
        }
        const player = board.players.at(this.currentPlayer!);
        const goalPath = this.findPathToGoal(player, board);
        const result = goalPath.pop()!;
        //console.profileEnd();
        return { x: result.x, y: result.y };
    }

    public findPathToGoal(player: PlayerModel, board: BoardValidation) {
        const playerXY = player.pick('x', 'y');
        const indexPlayer = board.players.indexOf(player);

        /**
         * leave out of account another players positions
         */
        // const prevPositions: {}[] = [];
        board.players.each((p, i) => {
            // prevPositions.push(p.pick('x', 'y', 'prev_x', 'prev_y'));
            if (i !== indexPlayer) {
                p.set({x: -1, y: -1, prev_x: -1, prev_y: -1});
            }
        });

        const closed = this.processBoardForGoal(board, player);

        const goal = this.findGoal(closed, board.players.playersPositions[indexPlayer]!);
        const path = this.buildPath(goal, playerXY, board, closed, player);
        // board.players.each((p, i) => {
        //     p.set(prevPositions[i]!);
        // });

        return path;
    }

    public processBoardForGoal(board: BoardValidation, player: PlayerModel): PositionWithDeep[] {
        const open = [{
            x: player.get('x'),
            y: player.get('y'),
            deep: 0
        }], closed = [];
        const indexPlayer = board.players.indexOf(player);
        let currentCoordinate;
        const newDeep = { value: 0};

        const busyFences = board.getBusyFences();
        const notVisitedPositions = board.generatePositions(board.get('boardSize'));
        delete notVisitedPositions[10 * player.get('x') + player.get('y')];
        const addNewCoordinates = board.getAddNewCoordinateFunc(notVisitedPositions, open, newDeep);
        let winPositionsCount = 0;

        while (open.length) {
            currentCoordinate = open.shift()!;
            newDeep.value = currentCoordinate.deep + 1;
            closed.push({
                x: currentCoordinate.x,
                y: currentCoordinate.y,
                deep: currentCoordinate.deep
            });
            if (board.players.playersPositions[indexPlayer]!.isWin(currentCoordinate.x, currentCoordinate.y)) {
                winPositionsCount++;
            }
            if (winPositionsCount >= board.get('boardSize')) {
                return closed;
            }
            player.set({
                x: currentCoordinate.x,
                y: currentCoordinate.y,
                prev_x: currentCoordinate.x,
                prev_y: currentCoordinate.y
            });
            _(board.getValidPositions(currentCoordinate, busyFences)).each(addNewCoordinates);
        }
        return closed;
    }

    public findGoal(closed: PositionWithDeep[], pawn: Position & { isWin(x: number, y: number): boolean; }) {
        const winPositions = _(closed).filter(item => {
            return pawn.isWin(item.x, item.y);
        }).sort((a, b) => {
            return a.deep - b.deep;
        });
        return winPositions[0];
    }

    public buildPath(
        from: PositionWithDeep | undefined,
        to: { x?: number; y?: number; },
        board: BoardValidation,
        closed: PositionWithDeep[],
        player: PlayerModel
    ) {
        if (!from) {
            return []; // changed from false
        }
        let current = from;
        const path = [];

        const func = (pos: PositionWithDeep) => {
            return (pos.deep === current.deep - 1) &&
                _(board.getNearestPositions(current)).findWhere({x: pos.x, y: pos.y}) !== undefined;
        };
        while (current.x !== to.x || current.y !== to.y) {
            player.set({
                x: current.x,
                y: current.y,
                prev_x: current.x,
                prev_y: current.y
            });
            path.push(current);
            current = _(closed).detect(func)!;
            if (!current) {
                console.log('cannot build path');
                return [];
            }
        }
        return path;
    }

}