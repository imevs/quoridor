// import _ from "underscore";
import { SmartBot } from "../models/SmartBot";
import { iter } from "../models/utils";
import { PlayerModel } from "../models/PlayerModel";
// import async from "async";
import { BoardValidation } from "../models/BoardValidation";
import { Position } from "../models/BackboneModel";

type Move = Position & { type: "H" | "V" | "P"; };
type Rate = Move & { rate: number; };

type CallArgs = {moves: Move[], player: PlayerModel, board: BoardValidation, rates: Rate[]};
type Callback = (err: string | null, data: CallArgs) => void;
export class MegaBot extends SmartBot {

    possibleWallsMoves: Move[] = [];
    satisfiedRate = 1;

    public doTurn() {
        const self = this;
        self.getBestTurn(turn => {
            const eventInfo = {
                x: turn.x,
                y: turn.y,
                type: turn.type,
                playerIndex: this.id
            };
            if (turn.type === 'P') {
                self.trigger('client_move_player', eventInfo);
            } else {
                self.trigger('client_move_fence', eventInfo);
            }
        });
    }

    public getBestTurn(callback: (res: Move) => void) {
        const board = this.board.copy();
        const player = board.players.at(this.currentPlayer);
        const moves = this.getPossibleMoves(board, player);
        async.waterfall<CallArgs, string | null>([
            (callback1: Callback) => {
                callback1(null, { moves: moves, player: player, board: board, rates: [] });
            },
            this.getRatesForPlayersMoves,
            this.getRatesForWallsMoves,
        ], (_err, result) => {
            const rates = result?.rates.sort((move1, move2) => {
                return move1.rate - move2.rate;
            });

            const minRate = _(_(rates).pluck('rate')).min();
            const types = {'H': 0, 'V': 1, 'P': 2 };
            const filtered = _(rates).filter(move => {
                return move.rate === minRate;
            });
            const minRatedMoves = filtered.sort((a, b) => {
                return types[b.type] - types[a.type];
            });
            callback(minRatedMoves[_.random(0, minRatedMoves.length - 1)]!);
        });
    }

    public getRatesForPlayersMoves = ({ moves, player, board, rates }: CallArgs, callback: Callback) => {
        const result: Rate[] = [];
        _(moves).each(move => {
            if (move.type === 'P') {
                const prevPosition = player.pick('x', 'y', 'prev_x', 'prev_y');
                player.set({
                    x: move.x,
                    y: move.y,
                    prev_x: move.x,
                    prev_y: move.y
                });
                player.set(prevPosition);
                result.push({ ...move, rate: this.calcHeuristic(player, board) });
            }
        });
        callback(null, { moves: moves, player: player, board: board, rates: rates.concat(result) });
    }

    public getRatesForWallsMoves = ({ moves, player, board, rates }: CallArgs, callback: Callback) => {
        const self = this;
        let satisfiedCount = 0;
        const result: Rate[] = [];

        if (!this.canMoveFence()) {
            callback(null, { moves, player, board, rates });
            return;
        }
        async.some(moves, (item: Move, callback: (res: boolean) => void) => {
            const move = {x: item.x, y: item.y, type: item.type, rate: 0 };
            if (move.type === 'P') {
                callback(false);
                return false;
            }
            const fence = board.fences.findWhere(move);

            if (!board.fences.validateFenceAndSibling(fence)) {
                self.removePossibleWallsMove(move);
            } else if (!board.breakSomePlayerPath(fence)) {
                const sibling = board.fences.getSibling(fence);

                const prevStateFence = fence.get('state');
                const prevStateSibling = sibling?.get('state');

                fence.set({state: 'busy'});
                sibling?.set({state: 'busy'});

                move.rate = self.calcHeuristic(player, board);
                result.push(move);

                fence.set({state: prevStateFence});
                sibling?.set({state: prevStateSibling});

                if (move.rate <= self.satisfiedRate) {
                    satisfiedCount++;
                }
            }
            callback(satisfiedCount >= 2);
            return satisfiedCount >= 2;
        }, () => {
            self.satisfiedRate = 0;
            callback(null, { moves, player, board, rates: rates.concat(result) });
        });
    }

    public calcHeuristic(_player: PlayerModel, board: BoardValidation) {
        const otherPlayersPaths: number[] = [];
        let currentPlayerPathLength = 0;
        board.players.each((player, index) => {
            if (this.currentPlayer === index) {
                currentPlayerPathLength = this.getCountStepsToGoal(player, board) + 1;
            } else {
                otherPlayersPaths.push(this.getCountStepsToGoal(player, board));
            }
        });
        const othersMinPathLength = _(otherPlayersPaths).min();
        return currentPlayerPathLength - othersMinPathLength;
    }

    public getCountStepsToGoal(player: PlayerModel, board: BoardValidation): number {
        const indexPlayer = board.players.indexOf(player);

        /**
         * leave out of account another players positions
         */
        const prevPositions: {}[] = [];
        board.players.each((p, i) => {
            prevPositions.push(p.pick('x', 'y', 'prev_x', 'prev_y'));
            if (i !== indexPlayer) {
                p.set({x: -1, y: -1, prev_x: -1, prev_y: -1});
            }
        });

        const closed = this.processBoardForGoal(board, player);

        const goal = this.findGoal(closed, board.players.playersPositions[indexPlayer]!);
        board.players.forEach((p, i) => { p.set(prevPositions[i]!); });

        return goal ? goal.deep : 9999;
    }

    public initPossibleMoves() {
        this.possibleWallsMoves = this.possibleWallsMoves || this.selectWallsMoves();
    }

    public getPossibleMoves(board: BoardValidation, player: PlayerModel): Move[] {
        this.initPossibleMoves();
        const playerPositions = board.getValidPositions(player.pick('x', 'y') as Position, []).map(playerPosition => {
            return { ...playerPosition, type: "P" } as Move;
        });
        return player.hasFences()
            ? playerPositions.concat(this.possibleWallsMoves) : playerPositions;
    }

    public removePossibleWallsMove(move: Move) {
        const item = _(this.possibleWallsMoves).findWhere(move)!;
        const index = _(this.possibleWallsMoves).indexOf(item);
        if (index !== -1) {
            this.possibleWallsMoves.splice(index, 1);
        }
    }

    public selectWallsMoves() {
        const positions: Move[] = [];
        const boardSize = this.board.get('boardSize');

        iter([boardSize, boardSize - 1], (i, j) => {
            positions.push({x: i, y: j, type: 'H'});
        });
        iter([boardSize, boardSize - 1], (i, j) => {
            positions.push({x: i, y: j, type: 'V'});
        });

        return positions;
    }

}
