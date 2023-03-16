import type { ObjectHash, _StringKey } from "backbone";
import { Model, Collection } from "backbone";

export class BackboneModel<T extends ObjectHash = any> extends Model<T> {
    public get<A extends _StringKey<T>>(attributeName: A): T[A] {
        const defs = this.defaults?.() ?? {};
        return super.get(attributeName)! ?? defs[attributeName]!;
    }
}

export class BackboneCollection<TModel extends BackboneModel = BackboneModel> extends Collection<TModel> {
    // @ts-ignore
    findWhere(properties: any): TModel | undefined {
        return super.findWhere(properties);
    }

}

export type Position = { x: number; y: number; };
