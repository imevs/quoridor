import { BackboneCollection, BackboneModel, Position } from "../models/BackboneModel";
import { iter } from "./utils";

export class FieldModel extends BackboneModel<Position & { color: string; }> {

    /**
     * TODO: check if is used
     * @param playersPositions
     */
    getColor(playersPositions: { color: string; isWin(x: number, y: number): boolean; }[]) {
        let color = '';
        playersPositions.some(pos => {
            if ((this.get('x') === 0 || this.get('x') === 8) &&
                (this.get('y') === 0 || this.get('y') === 8)) {
                return false;
            }
            const win = pos.isWin(this.get('x'), this.get('y'));
            if (win) {
                color = pos.color;
            }
            return win;
        });
        return color;
    }
}

export class FieldsCollection extends BackboneCollection<FieldModel> {
    model = FieldModel;
    selectField(x: number, y: number) {
        const field = this.findWhere({x: x, y: y});
        field.trigger('selectfield');
    }
    createFields(boardSize: number) {
        const me = this;
        iter([boardSize, boardSize], (i: number, j: number) => {
            me.add({x: i, y: j});
        });
    }
}
