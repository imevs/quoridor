import { BackboneCollection, BackboneModel, Position } from "public/models/BackboneModel";
import { iter } from "./utils";

export class FieldModel extends BackboneModel<Position> {

    /**
     * TODO: check if is used
     * @param playersPositions
     */
    getColor(playersPositions: { color: string; isWin(x: number, y: number): boolean; }[]) {
        var color = '';
        playersPositions.some(pos => {
            if ((this.get('x') === 0 || this.get('x') === 8) &&
                (this.get('y') === 0 || this.get('y') === 8)) {
                return false;
            }
            var win = pos.isWin(this.get('x'), this.get('y'));
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
        var field = this.findWhere({x: x, y: y});
        field.trigger('selectfield');
    }
    createFields(boardSize: number) {
        var me = this;
        iter([boardSize, boardSize], (i: number, j: number) => {
            me.add({x: i, y: j});
        });
    }
}
