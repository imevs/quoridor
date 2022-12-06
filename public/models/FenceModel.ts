import _ from "underscore";
import {
    BackboneCollection,
    BackboneModel,
    Position,
} from "public/models/BackboneModel";
import { iter } from "public/models/utils";

export type FencePosition = Position & { orientation: "H" | "V"; };
export type FenceModelProps = FencePosition & {
    color: string;
    prevcolor: string;
    state: string;
};

export class FenceModel extends BackboneModel<FenceModelProps> {

    defaults = () => ({
        color: '#c75',
        state: ''
    });

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
}

export class FenceHModel extends FenceModel {
    public defaults = () => ({
        type: 'H' as const,
        color: '#c75',
        state: ''
    });
    public getAdjacentFencePosition() {
        return {
            x: this.get('x') - 1,
            y: this.get('y')
        };
    }
}

export class FenceVModel extends FenceModel {
    public defaults = () => ({
        type: 'V' as const,
        color: '#c75',
        state: ''
    });

    public getAdjacentFencePosition() {
        return {
            x: this.get('x'),
            y: this.get('y') - 1
        };
    }
}

export class FencesCollection extends BackboneCollection<FenceHModel | FenceVModel> {

    // @ts-ignore TODO, recheck types
    public model(attrs: FenceModelProps, options: {}): FenceHModel | FenceVModel {
        return attrs.orientation === 'H'
            ? new FenceHModel(attrs, options)
            : new FenceVModel(attrs, options);
    }

    public initialize() {
        this.on('premarkasselected', this.clearBusy, this);
    }
    public createFences(boardSize: number, fences: FencePosition[] = []) {
        var me = this;
        iter([boardSize, boardSize - 1], (i, j) => {
            me.add({x: i, y: j, type: 'H'});
        });
        iter([boardSize - 1, boardSize], (i, j) => {
            me.add({x: i, y: j, type: 'V'});
        });

        fences.forEach(fence => {
            var find: FenceModel = me.findWhere({
                x: fence.x,
                y: fence.y,
                type: fence.orientation
            });
            var sibling: FenceModel = me.getSibling(find as FenceHModel | FenceVModel);
            find.set('state', 'busy');
            sibling.set('state', 'busy');
        });
    }
    public clearBusy() {
        _(this.where({
            state: 'prebusy'
        })).each(fence => {
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
    public getMovedFence(): FenceHModel | FenceVModel {
        var fences = this.getPreBusy();
        return _.chain(fences)
            .sortBy(function (i) { return i.get('x'); })
            .sortBy(function (i) { return i.get('y'); })
            .last().value() as FenceHModel | FenceVModel;
    }
    public getSibling(item: FenceHModel | FenceVModel) {
        var siblingPosition = item && item.getAdjacentFencePosition();
        return siblingPosition && this.findWhere({
            x   : siblingPosition.x,
            y   : siblingPosition.y,
            type: item.get('orientation')
        });
    }
    public triggerEventOnFenceAndSibling(item: FenceHModel | FenceVModel, event: string) {
        var sibling = this.getSibling(item);
        if (sibling && event) {
            sibling.trigger(event);
            item.trigger(event);
        }
    }
    public validateFenceAndSibling(item?: FenceHModel | FenceVModel) {
        if (!item) {
            return false;
        }
        if (this.isBusy(item)) {
            return false;
        }
        if (!this.isFencePlaceable(item)) {
            return false;
        }
        var sibling = this.getSibling(item);

        return !!(sibling && !this.isBusy(sibling));
    }
    public validateAndTriggerEventOnFenceAndSibling(item: FenceHModel | FenceVModel, event: string) {
        var shouldTriggerEvent = this.validateFenceAndSibling(item);
        if (shouldTriggerEvent && event) {
            item.trigger('pre' + event);
            item.trigger(event);
            var sibling = this.getSibling(item);
            sibling.trigger(event);
        }
        return shouldTriggerEvent;
    }
    public isBusy(item: FenceModel) {
        return item.get('state') === 'busy';
    }
    public isFencePlaceable(item: FenceModel) {
        var type, i: "x" | "y", j: "x" | "y";
        if (item.get('orientation') === 'V') {
            type = 'H';
            i = 'y';
            j = 'x';
        } else {
            type = 'V';
            i = 'x';
            j = 'y';
        }
        var attrs = { state: 'busy', type: type, x: 0, y: 0 };
        attrs[i] = item.get(i) - 1;
        var prevLine = this.where(attrs);
        var f1 = _(prevLine).find(model => {
            return model.get(j) === item.get(j);
        });
        var f2 = _(prevLine).find(model => {
            return model.get(j) === item.get(j) + 1;
        });
        return !(f1 && f2);
    }

}
