// import _ from "underscore";
import { BackboneCollection, BackboneModel, Position } from "../models/BackboneModel";

export class PlayerModel extends BackboneModel<Position & {
    fencesRemaining: number;
    prev_x: number;
    prev_y: number;
    type?: "bot";
    id?: string;
    state?: string;
    color: string;
    url: number;
}> {
    public defaults() {
        return {
            fencesRemaining: 0
        };
    };

    public initialize() {
        this.set('prev_x', this.get('x'));
        this.set('prev_y', this.get('y'));
    }
    public moveTo(x: number, y: number) {
        this.set({x: x, y: y});
    }
    public placeFence () {
        this.set('fencesRemaining', this.get('fencesRemaining') - 1);
    }
    public hasFences () {
        return this.get('fencesRemaining') > 0;
    }
    public reset() {
        this.set({id: '', state: ''});
    }
    public isBot() {
        return this.get('type') === 'bot';
    }
}

export class PlayersCollection extends BackboneCollection<PlayerModel> {
    model           = PlayerModel;
    fencesCount     = 20;

    public playersPositions: (Position & {
        color: string;
        name: string;
        isWin(x: number, y: number): boolean;
    })[] = [
        {x: 4, y: 0, color: '#d2322d', name: 'red', isWin: (_x, y) => { return y === 8; } },
        {x: 8, y: 4, color: '#3477B2', name: 'blue', isWin: x => { return x === 0; } },
        {x: 4, y: 8, color: 'green', name: 'green', isWin: (_x, y) => { return y === 0; } },
        {x: 0, y: 4, color: '#ed9c28', name: 'orange', isWin: x => { return x === 8; } }
    ];

    public initialize (players: { movedFences: number; fencesRemaining: number; url: number; }[]) {
        const me = this;
        players && players.forEach((player, i) => {
            player.url = i;
            if (player.movedFences !== undefined) {
                const fences = Math.round(me.fencesCount / players.length);
                player.fencesRemaining = fences - player.movedFences;
            }
        });

        if (players && players.length === 2 && me.playersPositions.length === 4) {
            me.playersPositions.splice(3, 1);
            me.playersPositions.splice(1, 1);
        }
    }

    public getPlayerNames() {
        return _(this.playersPositions).pluck('name');
    }

    public getNextActivePlayer (currentPlayer: number) {
        this.checkWin(currentPlayer);

        const current = this.at(currentPlayer);
        current.set({
            'prev_x': current.get('x'),
            'prev_y': current.get('y')
        });

        return (currentPlayer + 1) < this.length ? currentPlayer + 1 : 0;
    }

    public checkWin (playerIndex: number) {
        const pos = this.at(playerIndex).pick('x', 'y'),
            x = pos.x,
            y = pos.y;
        if (this.playersPositions[playerIndex]!.isWin(x!, y!)) {
            this.trigger('win', playerIndex);
            return true;
        }
        return false;
    }
    public createPlayers (playersCount: number) {
        const me = this;
        playersCount = +playersCount;
        if (playersCount === 2 && me.playersPositions.length === 4) {
            me.playersPositions.splice(3, 1);
            me.playersPositions.splice(1, 1);
        }
        const fences = Math.round(me.fencesCount / playersCount);
        _(playersCount).times(player => {
            const position = me.playersPositions[player]!;
            const model = new PlayerModel({
                url            : player,
                color          : position.color,
                x              : position.x,
                prev_x         : position.x,
                y              : position.y,
                prev_y         : position.y,
                fencesRemaining: fences
            });
            me.add(model);
        });
    }

    public initPlayerPositions() {
        const me = this;
        this.each((player, i) => {
            const position = me.playersPositions[i]!;
            const fences = Math.round(me.fencesCount / me.length);
            player.set({
                url            : i,
                x              : position.x,
                prev_x         : position.x,
                y              : position.y,
                prev_y         : position.y,
                fencesRemaining: fences
            });
        });
    }

    public isFieldBusy(pos: Position) {
        /* jshint maxcomplexity: 8 */
        const p0 = this.at(0);
        const p1 = this.at(1);
        if (this.length === 2) {
            return p0.get('x') === pos.x && p0.get('y') === pos.y ||
                p1.get('x') === pos.x && p1.get('y') === pos.y;
        }
        if (this.length === 4) {
            const p2 = this.at(2);
            const p3 = this.at(3);
            return p0.get('x') === pos.x && p0.get('y') === pos.y ||
                p1.get('x') === pos.x && p1.get('y') === pos.y ||
                p2.get('x') === pos.x && p2.get('y') === pos.y ||
                p3.get('x') === pos.x && p3.get('y') === pos.y;
        }
        return false;
    }

    public isBetween(n1: number, n2: number, n3: number) {
        let min, max;
        if (n1 > n2) {
            min = n2;
            max = n1;
        } else {
            min = n1;
            max = n2;
        }
        return min < n3 && n3 < max;
    }

    public isFieldBehindOtherPlayer(pos1: Position, pos2: Position) {
        const me = this;
        const playerX = pos1.x, playerY = pos1.y, x = pos2.x, y = pos2.y;

        const distanceBetweenPositions = playerX === x && Math.abs(playerY - y)
            || playerY === y && Math.abs(playerX - x) || 0;

        if (distanceBetweenPositions !== 2) {
            return false;
        }
        const callback1 = (item: PlayerModel) => {
            return y === item.get('prev_y') && me.isBetween(playerX, x, item.get('prev_x'));
        };
        const callback2 = (item: PlayerModel) => {
            return x === item.get('prev_x') && me.isBetween(playerY, y, item.get('prev_y'));
        };
        return this.getCountByCondition(playerY === y ? callback1 : callback2) === 1;
    }

    public getCountByCondition(callback: (item: PlayerModel) => boolean) {
        let busyFieldsBetweenPositionLength = 0;
        for (let i = 0, len = this.length; i < len; i++) {
            if (callback(this.at(i))) {
                busyFieldsBetweenPositionLength++;
            }
        }
        return busyFieldsBetweenPositionLength;
    }

    public isFieldNearOtherPlayer(pos1: Position, pos2: Position) {
        const isDiagonal = Math.abs(pos1.x - pos2.x) === 1 && Math.abs(pos1.y - pos2.y) === 1;
        if (!isDiagonal) {
            return false;
        }
        return !!(this.hasTwoVerticalSibling(pos1, pos2) || this.hasTwoHorizontalSiblings(pos1, pos2));
    }

    /**
     *   s2
     * x s1 x
     *   p
     *
     *  s1,s2 - siblings
     *  x - possible position
     *  p - player
     */
    public hasTwoVerticalSibling(pos1: Position, pos2: Position) {
        const playerX = pos1.x, playerY = pos1.y, y = pos2.y;
        const diffY = playerY - y; // 1 or -1
        return this.isPrevFieldBusy({ x: playerX, y: playerY - diffY})
            && this.isPrevFieldBusy({ x: playerX, y: playerY - diffY * 2 });
    }

    /**
     *     x
     *  s2 s1 p
     *     x
     *
     *  s1,s2 - siblings
     *  x - possible position
     *  p - player
     */
    public hasTwoHorizontalSiblings(pos1: Position, pos2: Position) {
        const playerX = pos1.x, playerY = pos1.y, x = pos2.x;
        const diffX = playerX - x; //1 or -1
        return this.isPrevFieldBusy({x: playerX - diffX, y: playerY })
            && this.isPrevFieldBusy({x: playerX - diffX * 2, y: playerY});
    }

    public isPrevFieldBusy(pos: Position) {
        /* jshint maxcomplexity: 8 */
        const p0 = this.at(0);
        const p1 = this.at(1);
        const nameX = 'prev_x' as const;
        const nameY = 'prev_y' as const;
        if (this.length === 2) {
            return p0.get(nameX) === pos.x && p0.get(nameY) === pos.y ||
                p1.get(nameX) === pos.x && p1.get(nameY) === pos.y;
        }
        if (this.length === 4) {
            const p2 = this.at(2);
            const p3 = this.at(3);
            return p0.get(nameX) === pos.x && p0.get(nameY) === pos.y ||
                p1.get(nameX) === pos.x && p1.get(nameY) === pos.y ||
                p2.get(nameX) === pos.x && p2.get(nameY) === pos.y ||
                p3.get(nameX) === pos.x && p3.get(nameY) === pos.y;
        }
        return false;
    }

    public updatePlayersPositions() {
        this.each(item => {
            if (item.get('x') !== item.get('prev_x') ||
                item.get('y') !== item.get('prev_y')) {
                item.set({
                    x: item.get('prev_x'),
                    y: item.get('prev_y')
                });
            }
        });
    }

}