import { View } from "backbone";
import _ from "underscore";
import { GameHistoryModel } from "public/models/TurnModel";
import { BackboneModel } from "public/models/BackboneModel";

export class GameHistoryView<TModel extends (BackboneModel) = GameHistoryModel> extends View<TModel> {
     template = "";

    initialize() {
        var me = this;
        this.$el = $('#history');
        require(['text!templates/history.html'], function (tmpl: string) {
            me.template = tmpl;
            me.listenTo(me.model, 'change', me.render);
            me.render();
        });
    }
    render() {
        var data = this.model.toJSON();
        data.turns = data.turns.models;
        // @ts-ignore
        this.$el.html(_.template(this.template, data, { variable: 'data' }));
        return this;
    }
}