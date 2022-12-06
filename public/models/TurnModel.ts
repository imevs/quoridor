import _ from "underscore";
import { BackboneCollection, BackboneModel, Position } from "public/models/BackboneModel";

let boardSize = 8;

type TurnModelProps = Position & {
    x2?: number;
    y2?: number;
    t?: "f" | "p";
    debug?: boolean;
};

export class TurnModel extends BackboneModel<TurnModelProps> {

    public defaults = () => ({
        x: 0,
        y: 0,
    });
    public alpha = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k'];

    public intToChar(i: string | number ) {
        return this.alpha[+i]!;
    }

    public getX(x: string | number): string {
        if (this.get('debug')) {
            return x + ':';
        }
        return this.intToChar(x);
    }

    public getY(y: number): string {
        if (this.get('debug')) {
            return y + '';
        }
        return (boardSize - y) + "";
    }

    public toString() {
        var dy = this.get('y') === this.get('y2') ? 1 : 0;
        return this.get('t') === 'p'
            ? this.getX(this.get('x')) + this.getY(this.get('y')) + ''
            : this.getX(this.get('x')) + this.getY(this.get('y') + dy) +
            this.getX(this.get('x2')!) + this.getY(this.get('y2')! + dy) +  '';
    }

    public toJSON() {
        var result = { ...this.attributes };
        delete result.debug;
        return result;
    }

}

export class TurnsCollection extends BackboneCollection<TurnModel> {
    model = TurnModel;
    public initialize() {}
}

export class GameHistoryModel extends BackboneModel<{
    debug?: boolean;
    t?: "f" | "p";
    boardSize: number;
    playersCount: number;
    playerNames?: string[];
    turns: TurnsCollection;
}> {

    public defaults = () => ({
        turns: new TurnsCollection(),
        playerNames: [],
    });

    public playersPositions: Position[] = [];

    public getPlayerPositions() {
        const positions: { x?: number; y?: number; movedFences: number; }[] = [], self = this;

        var playersCount = this.get('playersCount');
        _(_.range(playersCount)).each(index => {
            var playerPositions = self.get('turns').filter((v, i) => {
                var b = (i - index) % playersCount === 0;
                return v.get('t') === 'p' && b;
            });
            var playerFences = self.get('turns').filter((v, i) => {
                var b = (i - index) % playersCount === 0;
                return v.get('t') === 'f' && b;
            });
            var playerInfo = _.last(playerPositions);
            if (playerInfo) {
                const info = playerInfo.pick('x', 'y');
                positions[index] = { ...info, movedFences: playerFences.length };
            }
        });
        return positions;
    }

    public getFencesPositions() {
        var filter = this.get('turns').filter(val => {
            return val.get('t') === 'f';
        });
        return filter.map(model => {
            const item = model.pick('x', 'x2', 'y', 'y2');
            return { ...item, t: item.x === item.x2 ? 'V' : (item.y === item.y2 ? 'H' : '') };
        });
    }

    public add(turnInfo: TurnModelProps) {
        turnInfo.debug = this.get('debug');
        var turn = new TurnModel(turnInfo);
        this.get('turns').add(turn);

        this.trigger('change');
    }

    public at(index: number) {
        var turnsLength = this.get('turns').length / this.get('playersCount');
        if (index > turnsLength) {
            return 'error';
        }
        var self = this;

        var result: string[] = [];
        var startIndex = index * this.get('playersCount');
        var playersCount = +self.get('playersCount');
        var turns = this.get('turns').filter((_value, index) => {
            return index >= startIndex && index < startIndex + playersCount;
        });
        _(turns).each(value => {
            result.push(value + '');
        });
        return result.join(' ');
    }

    public getLength() {
        return Math.ceil(this.get('turns').length / this.get('playersCount'));
    }

    public initPlayers() {
        var playersCount = this.get('playersCount');
        var self = this;
        if (playersCount === 2 && self.playersPositions.length !== 2) {
            self.playersPositions.splice(3, 1);
            self.playersPositions.splice(1, 1);
        }
        _(_.range(playersCount)).each(index => {
            var playersPosition = self.playersPositions[index]!;
            self.add({ ...playersPosition, t: 'p' });
        });
    }

    public initialize(params?: { boardSize: number; playersCount: number; }) {
        this.set({
            boardSize: params?.boardSize ?? 9,
            playersCount: params?.playersCount ?? 2,
        });

        boardSize = this.get('boardSize');
        this.playersPositions = [
            {x: 4, y: 0 },
            {x: 8, y: 4 },
            {x: 4, y: 8 },
            {x: 0, y: 4 }
        ];
    }
}
