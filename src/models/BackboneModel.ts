import type { ObjectHash, _StringKey } from "backbone";

const { Model, Collection } = Backbone;

export class BackboneModel<T extends ObjectHash = any> extends Model<T> {
    public get<A extends _StringKey<T>>(attributeName: A): T[A] {
        const defs = this.defaults?.() ?? {};
        return super.get(attributeName)! ?? defs[attributeName]!;
    }
}

export class BackboneCollection<TModel extends BackboneModel = BackboneModel> extends Collection<TModel> {}

export type Position = { x: number; y: number; };
