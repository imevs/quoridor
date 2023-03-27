import _ from "underscore";
import { BackboneCollection, BackboneModel, Position } from "../models/BackboneModel";

let boardSize = 9;

export type TurnModelProps = Position & {
    x2?: number;
    y2?: number;
    t: "f" | "p";
    debug?: boolean;
};

export class TurnModel extends BackboneModel<TurnModelProps> {

    public defaults() { return {
        x: 0,
        y: 0,
    }; }
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
        const dy = this.get('y') === this.get('y2') ? 1 : 0;
        return this.get('t') === 'p'
            ? this.getX(this.get('x')) + this.getY(this.get('y')) + ''
            : this.getX(this.get('x')) + this.getY(this.get('y') + dy) +
            this.getX(this.get('x2')!) + this.getY(this.get('y2')! + dy) +  '';
    }

    public toJSON(): TurnModelProps {
        const result = { ...this.attributes } as TurnModelProps;
        delete result.debug;
        return result;
    }

}

export class TurnsCollection extends BackboneCollection<TurnModel> {
    model = TurnModel;

    public toJSON() {
        return this.map(function(model){ return model.toJSON(); });
    }

    public reset(models?: Array<TurnModelProps | TurnModel>, options?: Backbone.Silenceable): TurnModel[] {
        return super.reset(models, options);
    }
}

export class GameHistoryModel extends BackboneModel<{
    debug?: boolean;
    boardSize: number;
    playersCount: number;
    playerNames?: string[];
    turns: TurnsCollection;
}> {

    public defaults() { return {
        playerNames: [],
    }; }

    public playersPositions!: Position[];

    public getPlayerPositions() {
        const positions: { x?: number; y?: number; movedFences: number; }[] = [], self = this;

        const playersCount = this.get('playersCount');
        _(_.range(playersCount)).each(index => {
            const playerPositions = self.get('turns').filter((v, i) => {
                const b = (i - index) % playersCount === 0;
                return v.get('t') === 'p' && b;
            });
            const playerFences = self.get('turns').filter((v, i) => {
                const b = (i - index) % playersCount === 0;
                return v.get('t') === 'f' && b;
            });
            const playerInfo = _.last(playerPositions);
            if (playerInfo) {
                const info = playerInfo.pick('x', 'y');
                positions[index] = { ...info, movedFences: playerFences.length };
            }
        });
        return positions;
    }

    public getFencesPositions() {
        const filter = this.get('turns').filter(val => {
            return val.get('t') === 'f';
        });
        return filter.map(model => {
            const item = model.pick('x', 'x2', 'y', 'y2');
            return { ...item, t: item.x === item.x2 ? 'V' : (item.y === item.y2 ? 'H' : '') };
        });
    }

    public add(turnInfo: TurnModelProps) {
        turnInfo.debug = this.get('debug');
        const turn = new TurnModel(turnInfo);
        this.get('turns').add(turn);

        this.trigger('change');
    }

    public at(index: number) {
        const turnsLength = this.get('turns').length / this.get('playersCount');
        if (index > turnsLength) {
            return 'error';
        }
        const self = this;

        const result: string[] = [];
        const startIndex = index * this.get('playersCount');
        const playersCount = self.get('playersCount');
        const turns = this.get('turns').filter((_value, index) => {
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
        const playersCount = this.get('playersCount');
        const self = this;
        if (playersCount === 2 && self.playersPositions.length !== 2) {
            self.playersPositions.splice(3, 1);
            self.playersPositions.splice(1, 1);
        }
        _(_.range(playersCount)).each(index => {
            const playersPosition = self.playersPositions[index]!;
            self.add({ ...playersPosition, t: 'p' });
        });
    }

    public initialize(params?: { boardSize: number; playersCount: number; }) {
        this.set({
            turns: new TurnsCollection(),
            boardSize: params?.boardSize ?? 9,
            playersCount: params?.playersCount ?? 2,
        });
        this.playersPositions = [
            {x: 4, y: 0 },
            {x: 8, y: 4 },
            {x: 4, y: 8 },
            {x: 0, y: 4 }
        ];
    }
}
