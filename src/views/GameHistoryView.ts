// import _ from "underscore";
import { GameHistoryModel } from "../models/TurnModel";
import { BackboneModel } from "../models/BackboneModel";

const { View } = Backbone;

export class GameHistoryView<TModel extends (BackboneModel) = GameHistoryModel> extends View<TModel> {
     template!: string;

    initialize() {
        const me = this;
        this.$el = $('#history');
        me.template = document.querySelector("#history-tmpl")?.innerHTML ?? "";
        me.listenTo(me.model, 'change', me.render);
        me.render();
    }
    render() {
        const data = this.model.toJSON();
        data.turns = data.turns.models;
        // @ts-ignore
        this.$el.html(_.template(this.template, data, { variable: 'data' }));
        return this;
    }
}