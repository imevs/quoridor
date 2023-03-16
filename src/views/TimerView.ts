import _ from "underscore";
import { View } from "backbone";

export class TimerView extends View {

    template!: string;

    initialize() {
        const me = this;
        this.$el = $('#timer');
        me.template = document.querySelector("#timer-tmpl")?.innerHTML ?? "";
        me.listenTo(me.model, 'change', me.render);
        me.render();
    }
    render() {
        const me = this;
        me.$el.html(_.template(me.template, { variable: 'data' })(me.model.toJSON()));
        me.$el.find('.move').click(() => {
            me.trigger('click');
        });
        return this;
    }
}