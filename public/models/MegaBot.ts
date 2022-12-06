import _ from "underscore";
import { SmartBot } from "public/models/SmartBot";
import { iter } from "public/models/utils";
import { PlayerModel } from "public/models/PlayerModel";
import async from "async";
import { BoardValidation } from "public/models/BoardValidation";
import { Position } from "public/models/BackboneModel";

type Move = Position & { type: "H" | "V" | "P"; };
type Rate = Move & { rate: number; };

type CallArgs = {moves: Move[], player: PlayerModel, board: BoardValidation, rates: Rate[]};
type Callback = (err: string | null, data: CallArgs) => void;
export class MegaBot extends SmartBot {

    possibleWallsMoves: Move[] = [];
    satisfiedRate = 1;

    public doTurn() {
        var self = this;
        self.getBestTurn(turn => {
            var eventInfo = {
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
        var board = this.board.copy();
        var player = board.players.at(this.currentPlayer);
        var moves = this.getPossibleMoves(board, player);
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

            var minRate = _(_(rates).pluck('rate')).min();
            var types = {'H': 0, 'V': 1, 'P': 2 };
            var filtered = _(rates).filter(move => {
                return move.rate === minRate;
            });
            var minRatedMoves = filtered.sort((a, b) => {
                return types[b.type] - types[a.type];
            });
            callback(minRatedMoves[_.random(0, minRatedMoves.length - 1)]!);
        });
    }

    public getRatesForPlayersMoves = ({ moves, player, board, rates }: CallArgs, callback: Callback) => {
        var result: Rate[] = [];
        _(moves).each(move => {
            if (move.type === 'P') {
                var prevPosition = player.pick('x', 'y', 'prev_x', 'prev_y');
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
        var self = this;
        var satisfiedCount = 0, result: Rate[] = [];

        if (!this.canMoveFence()) {
            callback(null, { moves, player, board, rates });
            return;
        }
        async.some(moves, (item: Move, callback: (res: boolean) => void) => {
            var move = {x: item.x, y: item.y, type: item.type, rate: 0 };
            if (move.type === 'P') {
                callback(false);
                return false;
            }
            var fence = board.fences.findWhere(move);

            if (!board.fences.validateFenceAndSibling(fence)) {
                self.removePossibleWallsMove(move);
            } else if (!board.breakSomePlayerPath(fence)) {
                var sibling = board.fences.getSibling(fence);

                var prevStateFence = fence.get('state');
                var prevStateSibling = sibling.get('state');

                fence.set({state: 'busy'});
                sibling.set({state: 'busy'});

                move.rate = self.calcHeuristic(player, board);
                result.push(move);

                fence.set({state: prevStateFence});
                sibling.set({state: prevStateSibling});

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
        var otherPlayersPaths: number[] = [];
        var currentPlayerPathLength = 0;
        board.players.each((player, index) => {
            if (this.currentPlayer === index) {
                currentPlayerPathLength = this.getCountStepsToGoal(player, board) + 1;
            } else {
                otherPlayersPaths.push(this.getCountStepsToGoal(player, board));
            }
        });
        var othersMinPathLength = _(otherPlayersPaths).min();
        return currentPlayerPathLength - othersMinPathLength;
    }

    public getCountStepsToGoal(player: PlayerModel, board: BoardValidation): number {
        var indexPlayer = board.players.indexOf(player);

        /**
         * leave out of account another players positions
         */
        var prevPositions: {}[] = [];
        board.players.each((p, i) => {
            prevPositions.push(p.pick('x', 'y', 'prev_x', 'prev_y'));
            if (i !== indexPlayer) {
                p.set({x: -1, y: -1, prev_x: -1, prev_y: -1});
            }
        });

        var closed = this.processBoardForGoal(board, player);

        var goal = this.findGoal(closed, board.players.playersPositions[indexPlayer]!);
        board.players.forEach((p, i) => { p.set(prevPositions[i]!); });

        return goal ? goal.deep : 9999;
    }

    public initPossibleMoves() {
        this.possibleWallsMoves = this.possibleWallsMoves || this.selectWallsMoves();
    }

    public getPossibleMoves(board: BoardValidation, player: PlayerModel): Move[] {
        this.initPossibleMoves();
        var playerPositions = board.getValidPositions(player.pick('x', 'y') as Position, []).map(playerPosition => {
            return { ...playerPosition, type: "P" } as Move;
        });
        return player.hasFences()
            ? playerPositions.concat(this.possibleWallsMoves) : playerPositions;
    }

    public removePossibleWallsMove(move: Move) {
        var item = _(this.possibleWallsMoves).findWhere(move)!;
        var index = _(this.possibleWallsMoves).indexOf(item);
        if (index !== -1) {
            this.possibleWallsMoves.splice(index, 1);
        }
    }

    public selectWallsMoves() {
        var positions: Move[] = [];
        var boardSize = this.board.get('boardSize');

        iter([boardSize, boardSize - 1], (i, j) => {
            positions.push({x: i, y: j, type: 'H'});
        });
        iter([boardSize, boardSize - 1], (i, j) => {
            positions.push({x: i, y: j, type: 'V'});
        });

        return positions;
    }

}
