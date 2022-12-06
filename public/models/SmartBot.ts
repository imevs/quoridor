import _ from "underscore";
import { Bot } from "public/models/Bot";
import { FenceModel, FencesCollection } from "public/models/FenceModel";
import { PlayerModel, PlayersCollection } from "public/models/PlayerModel";
import { GameHistoryModel, TurnsCollection } from "public/models/TurnModel";
import { BoardValidation } from "public/models/BoardValidation";
import { Position } from "public/models/BackboneModel";

type PositionWithDeep = Position & { deep: number; };
type PlayerPosition = Position & { playerIndex: number; };

export class SmartBot extends Bot {

    public board!: BoardValidation;
    public player!: PlayerModel;
    public activePlayer!: number;
    public currentPlayer!: number;
    public playersCount!: number;
    public fencesRemaining: number = 0;

    onMovePlayer = (params: PlayerPosition) => {
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

    onMoveFence = (params: PlayerPosition & { type: "H" | "V"; }) => {
        var fence = this.board.fences.findWhere({
            x: params.x,
            y: params.y,
            type: params.type
        });
        var sibling: FenceModel = this.board.fences.getSibling(fence);
        (fence as FenceModel).set('state', 'busy');
        sibling.set('state', 'busy');

        if (this.currentPlayer === params.playerIndex) {
            this.fencesRemaining--;
        }
        if (this.isPlayerCanMakeTurn(params.playerIndex)) {
            this.turn();
        }
    }

    onStart(currentPlayer: number, _activePlayer: number, history: {}[], playersCount: number, boardSize: number) {
        this.newPositions = [];
        this.fencesPositions = [];
        this.currentPlayer = +currentPlayer;
        this.playersCount = +playersCount;

        var historyModel = new GameHistoryModel({
            turns: new TurnsCollection(),
            boardSize: boardSize || 9,
            playersCount: this.playersCount
        });
        if (history.length) {
            historyModel.get('turns').reset(history);
        } else {
            historyModel.initPlayers();
        }

        this.board = new BoardValidation({
            boardSize: historyModel.get('boardSize'),
            playersCount: historyModel.get('playersCount'),
            currentPlayer: this.currentPlayer,
            activePlayer: this.activePlayer
        });
        this.board.fences = new FencesCollection();
        this.board.fences.createFences(historyModel.get('boardSize'));
        this.board.players = new PlayersCollection(historyModel.getPlayerPositions());
        this.player = this.board.players.at(this.currentPlayer);

        var position = historyModel.getPlayerPositions()[this.currentPlayer];
        if (position) {
            this.fencesRemaining = Math.round(this.fencesCount / this.playersCount) - position.movedFences;
        }
    }

    getPossiblePosition() {
        //console.profile();
        var board = this.board.copy();
        var player = board.players.at(this.currentPlayer);
        var goalPath = this.findPathToGoal(player, board);
        var result = goalPath.pop()!;
        //console.profileEnd();
        return { x: result.x, y: result.y };
    }

    findPathToGoal(player: PlayerModel, board: BoardValidation) {
        var playerXY = player.pick('x', 'y');
        var indexPlayer = board.players.indexOf(player);

        /**
         * leave out of account another players positions
         */
        // var prevPositions: {}[] = [];
        board.players.each((p, i) => {
            // prevPositions.push(p.pick('x', 'y', 'prev_x', 'prev_y'));
            if (i !== indexPlayer) {
                p.set({x: -1, y: -1, prev_x: -1, prev_y: -1});
            }
        });

        var closed = this.processBoardForGoal(board, player);

        var goal = this.findGoal(closed, board.players.playersPositions[indexPlayer]!);
        var path = this.buildPath(goal, playerXY, board, closed, player);
        // board.players.each((p, i) => {
        //     p.set(prevPositions[i]!);
        // });

        return path;
    }

    processBoardForGoal(board: BoardValidation, player: PlayerModel): PositionWithDeep[] {
        var open = [], closed = [];
        var indexPlayer = board.players.indexOf(player);
        var currentCoordinate, newDeep = { value: 0};

        open.push({
            x: player.get('x'),
            y: player.get('y'),
            deep: 0
        });

        var busyFences = board.getBusyFences();
        var notVisitedPositions = board.generatePositions(board.get('boardSize'));
        delete notVisitedPositions[10 * player.get('x') + player.get('y')];
        var addNewCoordinates = board.getAddNewCoordinateFunc(notVisitedPositions, open, newDeep);
        var winPositionsCount = 0;

        while (open.length) {
            currentCoordinate = open.shift()! as PositionWithDeep;
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

    findGoal(closed: PositionWithDeep[], pawn: Position & { isWin(x: number, y: number): boolean; }) {
        var winPositions = _(closed).filter(item => {
            return pawn.isWin(item.x, item.y);
        }).sort((a, b) => {
            return a.deep - b.deep;
        });
        return winPositions[0];
    }

    buildPath(
        from: PositionWithDeep | undefined,
        to: { x?: number; y?: number; },
        board: BoardValidation,
        closed: PositionWithDeep[],
        player: PlayerModel
    ) {
        if (!from) {
            return []; // changed from false
        }
        var current = from;
        var path = [];

        var func = (pos: PositionWithDeep) => {
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