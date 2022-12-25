import { RaphaelEl, RaphaelView } from "./backbone.raphael";
import { BackboneModel } from "../models/BackboneModel";

export const ViewOptions = {
    // object methods
    paper: undefined as (undefined | RaphaelEl),
    startX        : 0,
    startY        : 100,
    squareWidth   : 50,
    squareHeight  : 30,
    squareDistance: 10,
    borderDepth   : 20,
    getPaper      (): Required<RaphaelEl> {
        return ViewOptions.paper ?? (ViewOptions.paper = new (window as any).Raphael('holder', 580, 540));
    }
};

export class GameObject<TModel extends (BackboneModel) = BackboneModel> extends RaphaelView<TModel, RaphaelEl> {
    template = "";
}