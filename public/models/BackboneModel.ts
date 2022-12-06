import { Model, Collection, ObjectHash, _StringKey } from "backbone";

export class BackboneModel<T extends ObjectHash = any> extends Model<T> {
    public get<A extends _StringKey<T>>(attributeName: A): T[A] {
        return super.get(attributeName)!;
    }
}

export class BackboneCollection<TModel extends BackboneModel = BackboneModel> extends Collection<TModel> {}

export type Position = { x: number; y: number; };
