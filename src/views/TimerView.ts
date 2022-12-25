// import _ from "underscore";

const { View } = Backbone;

export class TimerView extends View {

    template: string = "";

    initialize() {
        const me = this;
        this.$el = $('#timer');
        me.template = document.querySelector("#timer-tmpl")?.innerHTML ?? "";
        me.listenTo(me.model, 'change', me.render);
        me.render();
    }
    render() {
        const me = this;
        // @ts-ignore
        me.$el.html(_.template(me.template, me.model.toJSON(), { variable: 'data' }));
        me.$el.find('.move').click(() => {
            me.trigger('click');
        });
        return this;
    }
}