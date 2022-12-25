// import _ from "underscore";
import { PlayerModel, PlayersCollection } from "./PlayerModel";
import {
    FenceModel,
    FenceModelProps,
    FencesCollection,
} from "./FenceModel";
import { iter } from "./utils";
import { BoardModel } from "./BoardModel";
import { Position } from "./BackboneModel";

export class BoardValidation extends BoardModel {

    public isBetween(n1: number, n2: number, n3: number) {
        let min, max;
        if (n1 > n2) {
            min = n2;
            max = n1;
        } else {
            min = n1;
            max = n2;
        }
        return min <= n3 && n3 < max;
    }

    public intToChar(i: number) {
        if (this.get('debug')) {
            return i + '';
        }
        const a = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k'];
        return a[i];
    }

    public intToInt(i: number) {
        if (this.get('debug')) {
            return i + '';
        }
        return this.get('boardSize') - i;
    }
    /**
     *   f
     * x s x
     *   p
     *
     *  s - sibling
     *  f - sibling
     *  x - possible position
     *  p - player
     */
    public isOtherPlayerAndFenceBehindHimVertical(pos1: Position, pos2: Position, busyFences: FenceModelProps[]) {
        const playerX = pos1.x, playerY = pos1.y, y = pos2.y;
        const wallY = y - (playerY < y ? 0 : 1);
        const sibling1 = this.players.isFieldBusy({x: playerX, y: y});
        const result = sibling1 && (wallY === -1 || wallY === 8 || _(busyFences).findWhere({
            x: playerX,
            y: wallY,
            orientation: 'H'
        }));

        return !!result;
    }

    /**
     *    x
     *  f s p
     *    x
     *
     *  s - sibling
     *  f - sibling
     *  x - possible position
     *  p - player
     */
    public isOtherPlayerAndFenceBehindHimHorizontal(pos1: Position, pos2: Position, busyFences: FenceModelProps[]) {
        const playerX = pos1.x, playerY = pos1.y, x = pos2.x;
        const sibling1 = this.players.isFieldBusy({ x: x, y: playerY });
        const wallX = x - (playerX < x ? 0 : 1);
        const result = sibling1 && (wallX === -1 || wallX === 8 || _(busyFences).findWhere({
            x: wallX,
            y: playerY,
            orientation: 'V'
        }));

        return !!result;
    }

    public isOtherPlayerAndFenceBehindHim(pos1: Position, pos2: Position, busyFences: FenceModelProps[]) {
        const playerX = pos1.x, playerY = pos1.y, x = pos2.x, y = pos2.y;

        const isDiagonalSibling = Math.abs(playerX - x) === 1 && Math.abs(playerY - y) === 1;

        if (!isDiagonalSibling) {
            return false;
        }
        return this.isOtherPlayerAndFenceBehindHimVertical(pos1, pos2, busyFences)
            || this.isOtherPlayerAndFenceBehindHimHorizontal(pos1, pos2, busyFences);
    }

    public noFenceBetweenPositions(pos1: Position, pos2: Position, busyFences: FenceModelProps[]) {
        const me = this, playerX = pos1.x, playerY = pos1.y, x = pos2.x, y = pos2.y;
        let callback: (fence: FenceModelProps) => boolean;

        if (playerX === x) {
            callback = (fence: FenceModelProps) => {
                return fence.x === x && fence.orientation === 'H' && me.isBetween(playerY, y, fence.y);
            };
        } else if (playerY === y) {
            callback = (fence: FenceModelProps) => {
                return fence.y === y && fence.orientation === 'V' && me.isBetween(playerX, x, fence.x);
            };
        } else {
            const minY = Math.min(playerY, y);
            const minX = Math.min(playerX, x);
            callback = (fence: FenceModelProps) => {
                return (fence.orientation === 'V' && fence.x === minX && (fence.y === y))
                    || (fence.orientation === 'H' && fence.y === minY && (fence.x === x));
            };
        }
        return !busyFences.some(callback);
    }

    public isNearestPosition(currentPos: Position, pos: Position) {
        const prevX = currentPos.x, prevY = currentPos.y;
        return Math.abs(prevX - pos.x) === 1 && prevY === pos.y
            || Math.abs(prevY - pos.y) === 1 && prevX === pos.x;
    }

    public isValidPlayerPosition(currentPos: Position, newPos: Position, busyFences: FenceModelProps[]) {
        return this.isBetween(0, this.get('boardSize'), newPos.x)
            && this.isBetween(0, this.get('boardSize'), newPos.y)
            && !this.players.isFieldBusy(newPos)
            && this.noFenceBetweenPositions(currentPos, newPos, busyFences)
            && (
                this.isNearestPosition(currentPos, newPos) ||
                this.players.isFieldBehindOtherPlayer(currentPos, newPos) ||
                this.players.isFieldNearOtherPlayer(currentPos, newPos) ||
                this.isOtherPlayerAndFenceBehindHim(currentPos, newPos, busyFences)
            );
    }

    public isCurrentPlayerTurn() {
        const current = this.get('currentPlayer');
        const active = this.get('activePlayer');
        return this.auto || (current === active && !!this.getActivePlayer() && !this.getActiveBot());
    }

    public isValidCurrentPlayerPosition(x: number, y: number) {
        const activePlayer = this.getActivePlayer();

        if (!this.isCurrentPlayerTurn()) {
            return false;
        }
        const busyFences = this.getBusyFences();
        const currentPos = {x: activePlayer.get('prev_x'), y: activePlayer.get('prev_y')};
        return this.isValidPlayerPosition(currentPos, {x: x, y: y}, busyFences);
    }

    public canSelectFences() {
        const activePlayer = this.getActivePlayer();
        return activePlayer && activePlayer.hasFences() && this.isCurrentPlayerTurn();
    }

    public getNearestPositions(pawn: Position) {
        return [
            {x: pawn.x - 1, y: pawn.y - 1},
            {x: pawn.x - 1, y: pawn.y},
            {x: pawn.x - 1, y: pawn.y + 1},

            {x: pawn.x + 1, y: pawn.y - 1},
            {x: pawn.x + 1, y: pawn.y},
            {x: pawn.x + 1, y: pawn.y + 1},

            {x: pawn.x, y: pawn.y - 1},
            {x: pawn.x, y: pawn.y + 1}
        ];
    }

    /**
     * todo: add memoization
     * @param pawn
     */
    public getPossiblePositions(pawn: Position) {
        return [
            {x: pawn.x - 1, y: pawn.y - 1},
            {x: pawn.x - 1, y: pawn.y},
            {x: pawn.x - 1, y: pawn.y + 1},

            {x: pawn.x + 1, y: pawn.y - 1},
            {x: pawn.x + 1, y: pawn.y},
            {x: pawn.x + 1, y: pawn.y + 1},

            {x: pawn.x, y: pawn.y - 1},
            {x: pawn.x, y: pawn.y + 1},

            {x: pawn.x - 2, y: pawn.y},
            {x: pawn.x + 2, y: pawn.y},
            {x: pawn.x, y: pawn.y - 2},
            {x: pawn.x, y: pawn.y + 2}
        ];
    }

    public getBusyFences(): FenceModelProps[] {
        const board = this.copy();
        return board.fences
            .filter(item => item.get('state') === 'busy')
            .map(f => f.toJSON() as FenceModelProps);
    }

    public getValidPositions(pawn: Position, busyFences: FenceModelProps[]) {
        const positions = this.getPossiblePositions(pawn);
        return _(positions).filter(pos => {
            return this.isValidPlayerPosition(pawn, pos, busyFences);
        });
    }

    public generatePositions(boardSize: number): Record<number, number> {
        const notVisitedPositions: Record<number, number> = {};
        iter([boardSize, boardSize], (i, j) => {
            notVisitedPositions[10 * i + j] = 1;
        });
        return notVisitedPositions;
    }

    public getAddNewCoordinateFunc(notVisitedPositions: Record<number, number>, open: {}[], newDeep?: { value: number; }) {
        return (validMoveCoordinate: Position) => {
            const hash = validMoveCoordinate.x * 10 + validMoveCoordinate.y;
            if (notVisitedPositions[hash]) {
                open.push({
                    x: validMoveCoordinate.x,
                    y: validMoveCoordinate.y,
                    deep: newDeep?.value ?? 0
                });
                delete notVisitedPositions[hash];
            }
        };
    }

    public doesFenceBreakPlayerPath(pawn: PlayerModel, coordinate: FenceModel) {
        const open = [pawn.pick('x', 'y')], closed = [];
        const board = this.copy();
        const indexPlayer = this.players.indexOf(pawn);
        const player = board.players.at(indexPlayer);
        const fence = board.fences.findWhere(coordinate.pick('x', 'y', 'orientation'));
        const sibling = board.fences.getSibling(fence);
        if (!sibling) {
            return 'invalid';
        }
        fence.set('state', 'busy');
        sibling.set('state', 'busy');

        const busyFences = board.getBusyFences();
        const notVisitedPositions = board.generatePositions(board.get('boardSize'));
        delete notVisitedPositions[10 * player.get('x') + player.get('y')];
        const addNewCoordinates = board.getAddNewCoordinateFunc(notVisitedPositions, open);

        while (open.length) {
            const currentCoordinate = open.pop()! as Position;
            if (this.players.playersPositions[indexPlayer]!.isWin(currentCoordinate.x, currentCoordinate.y)) {
                return false;
            }
            closed.push(currentCoordinate);
            player.set({
                x: currentCoordinate.x,
                y: currentCoordinate.y,
                prev_x: currentCoordinate.x,
                prev_y: currentCoordinate.y
            });
            board.getValidPositions(currentCoordinate, busyFences).forEach(addNewCoordinates);
        }
        return true;
    }

    public notBreakSomePlayerPath(wall: FenceModel) {
        return !this.breakSomePlayerPath(wall);
    }

    public isWallNearBorder(wall: Partial<FenceModelProps>) {
        const boardSize = this.get('boardSize');
        return wall.x === 0 || wall.x === boardSize
            || wall.y === 0 || wall.y === boardSize;
    }

    public hasWallsOrPawnsNear(wall: Partial<FenceModelProps>) {
        const busyFences = this.getBusyFences().map((item: FenceModelProps) => {
            return item.orientation + item.x + item.y;
        });
        const nearestWalls = this.getNearestWalls(wall).map(item => {
            return item.type + item.x + item.y;
        });
        const result = !!_.intersection(busyFences, nearestWalls).length;
        return result;
    }

    public _getNearestWalls(wall: Partial<FenceModelProps>) {
        if (wall.x === undefined || wall.y === undefined) {
            return [];
        }
        return wall.orientation === 'H' ? [
            {x: wall.x - 1, y: wall.y, type: 'H'},
            {x: wall.x + 1, y: wall.y, type: 'H'},

            {x: wall.x - 1, y: wall.y, type: 'V'},
            {x: wall.x - 1, y: wall.y + 1, type: 'V'},
            {x: wall.x, y: wall.y, type: 'V'},
            {x: wall.x, y: wall.y + 1, type: 'V'}
        ] : [
            {x: wall.x, y: wall.y - 1, type: 'V'},
            {x: wall.x, y: wall.y + 1, type: 'V'},

            {x: wall.x, y: wall.y - 1, type: 'H'},
            {x: wall.x + 1, y: wall.y - 1, type: 'H'},

            {x: wall.x, y: wall.y, type: 'H'},
            {x: wall.x + 1, y: wall.y, type: 'H'}
        ];
    }

    public getNearestWalls(wall: Partial<FenceModelProps>) {
        const fence = this.fences.findWhere(wall);
        const sibling = this.fences.getSibling(fence);
        if (!sibling) {
            return [];
        }
        const siblingWall = sibling.pick('x', 'y', 'orientation');
        const all = _(this._getNearestWalls(wall).concat(this._getNearestWalls(siblingWall)));
        const all2 = all.without(all.findWhere(wall)!, all.findWhere(siblingWall)!);
        const unique = _.uniq(all2, a => {
            return a.type + a.x + a.y;
        });
        return _(unique).filter(item => {
            return this.isBetween(0, this.get('boardSize'), item.x) ||
                this.isBetween(0, this.get('boardSize'), item.y);
        });
    }

    public breakSomePlayerPath(wall: FenceModel) {
        const me = this;
        return this.hasWallsOrPawnsNear(wall.pick('x', 'y', 'orientation')) &&
            me.players.some(player => {
                return me.doesFenceBreakPlayerPath(player, wall) === true;
            });
    }

    public copy() {
        const board = new BoardValidation({
            boardSize: this.get('boardSize'),
            playersCount: this.get('playersCount'),
            currentPlayer: this.get('currentPlayer'),
            activePlayer: this.get('activePlayer')
        });
        board.fences = new FencesCollection(this.fences.toJSON(), { model: FenceModel });
        board.players = new PlayersCollection(this.players.toJSON(), { model: PlayerModel });
        board.players.playersPositions = this.players.playersPositions;

        return board;
    }
}
