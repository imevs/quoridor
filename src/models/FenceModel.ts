import _ from "underscore";
import {
    BackboneCollection,
    BackboneModel,
    Position,
} from "../models/BackboneModel";
import { iter } from "../models/utils";

export type FencePosition = Position & { orientation: "H" | "V"; };
export type FenceModelProps = FencePosition & {
    color: string;
    prevcolor?: string;
    state?: string;
};

export class FenceModel extends BackboneModel<FenceModelProps> {

    public defaults() { return {
        color: '#c75',
        orientation: "H" as const,
    }; }

    public initialize() {
        this.on({
            'movefence': () => {
                this.set('state', 'prebusy');
            },
            'markfence': () => {
                if (!this.get('state')) {
                    this.set('state', 'highlight');
                }
            },
            'unmarkfence': () => {
                if (this.get('state') === 'highlight') {
                    this.set('state', '');
                }
            },
            'change:state': this.onChangeState
        });
    }

    public onChangeState() {
        if (this.get('state') === 'prebusy') {
            this.set({
                color: 'black',
                prevcolor: 'black'
            });
        }
        if (this.get('state') === '') {
            this.set({
                color: this.defaults().color,
                prevcolor: ''
            });
        }
        if (this.get('state') === 'highlight') {
            this.set({
                color: 'black',
                prevcolor: this.get('color')
            });
        }
    }

    public getAdjacentFencePosition() {
        if (this.get('orientation') === 'H') {
            return {
                x: this.get('x') - 1,
                y: this.get('y')
            };    
        } else {
            return {
                x: this.get('x'),
                y: this.get('y') - 1
            };    
        }
    }
}

export class FencesCollection extends BackboneCollection<FenceModel> {

    public model = FenceModel;

    public initialize() {
        this.on('premarkasselected', this.clearBusy, this);
    }
    public createFences(boardSize: number, fences: FencePosition[] = []) {
        const me = this;
        iter([boardSize, boardSize - 1], (i, j) => {
            me.add({x: i, y: j, orientation: 'H'});
        });
        iter([boardSize - 1, boardSize], (i, j) => {
            me.add({x: i, y: j, orientation: 'V'});
        });

        fences.forEach(fence => {
            const find = me.findWhere({
                x: fence.x,
                y: fence.y,
                orientation: fence.orientation
            });
            const sibling = me.getSibling(find);
            find?.set('state', 'busy');
            sibling?.set('state', 'busy');
        });
    }
    public clearBusy() {
        _(this.where({ state: 'prebusy'})).each(fence => {
            fence.set({state: ''});
        });
    }
    public getPreBusy(): FenceModel[] {
        return this.where({state: 'prebusy'});
    }
    public setBusy() {
        this.getPreBusy().forEach(fence => {
            fence.set({state: 'busy'});
        });
    }
    public getMovedFence(): FenceModel {
        const fences = this.getPreBusy();
        return _.chain(fences)
            .sortBy(i => i.get('x'))
            .sortBy(i => i.get('y'))
            .last().value()!;
    }
    public getSibling(item: FenceModel | undefined): FenceModel | undefined {
        const siblingPosition = item && item.getAdjacentFencePosition();
        return siblingPosition && this.findWhere({
            x   : siblingPosition.x,
            y   : siblingPosition.y,
            orientation: item.get('orientation')
        });
    }
    public triggerEventOnFenceAndSibling(item: FenceModel, event: string) {
        const sibling = this.getSibling(item);
        if (sibling && event) {
            sibling.trigger(event);
            item.trigger(event);
        }
    }
    public validateFenceAndSibling(item?: FenceModel) {
        if (!item) {
            return false;
        }
        if (this.isBusy(item)) {
            return false;
        }
        if (!this.isFencePlaceable(item)) {
            return false;
        }
        const sibling = this.getSibling(item);

        return !!(sibling && !this.isBusy(sibling));
    }
    public validateAndTriggerEventOnFenceAndSibling(item: FenceModel, event: string) {
        const shouldTriggerEvent = this.validateFenceAndSibling(item);
        if (shouldTriggerEvent && event) {
            item.trigger('pre' + event);
            item.trigger(event);
            const sibling = this.getSibling(item);
            sibling?.trigger(event);
        }
        return shouldTriggerEvent;
    }
    public isBusy(item: FenceModel) {
        return item.get('state') === 'busy';
    }
    public isFencePlaceable(item: FenceModel) {
        let type, i: "x" | "y", j: "x" | "y";
        if (item.get('orientation') === 'V') {
            type = 'H';
            i = 'y';
            j = 'x';
        } else {
            type = 'V';
            i = 'x';
            j = 'y';
        }
        const attrs = { state: 'busy', orientation: type, x: 0, y: 0 };
        attrs[i] = item.get(i) - 1;
        const prevLine = this.where(attrs);
        const f1 = _(prevLine).find(model => {
            return model.get(j) === item.get(j);
        });
        const f2 = _(prevLine).find(model => {
            return model.get(j) === item.get(j) + 1;
        });
        return !(f1 && f2);
    }

}
