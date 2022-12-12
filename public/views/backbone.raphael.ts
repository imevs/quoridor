import { _Result, EventsHash, Model, View } from "backbone";
import _ from "underscore";

export type RaphaelEl = Element & Partial<{
    toFront(): void;
    toBack(): void;
    text(x: number, y: number, t: string | number | undefined): Required<RaphaelEl>;
    rect(x: number, y: number, x2: number, y2: number): Required<RaphaelEl>;
    ellipse(x: number, y: number, x2: number, y2: number): Required<RaphaelEl>;
    attr(o: Record<string, any>): Required<RaphaelEl>;
    attr(a: string, t: string | number): Required<RaphaelEl>;
    type: string;
    unbindAll(): void;
}>;

export class RaphaelView<TModel extends (Model) = Model, TElement extends RaphaelEl = HTMLElement> extends View<TModel, TElement> {

    delegated = false;

    setElement(element: TElement, delegate = false, undelegateEvents = false) {
        if (this.el && undelegateEvents) this.undelegateEvents();
        // el and $el will be the same, $el would have no special meaning...
        this.el = element;
        if (delegate !== false) this.delegateEvents();
        return this;
    }

    delegateEvents(events?: _Result<EventsHash> , undelegateEvents = false) {
        if (!(events || (events = _.result(this, 'events')))) return this;
        if (this.delegated) return this;
        this.delegated = true;
        const eventsObj = events as EventsHash;

        if(undelegateEvents) this.undelegateEvents();
        for (var eventName in events) {
            var method = eventsObj[eventName];
            if (!_.isFunction(method) && method !== undefined) {
                // @ts-ignore
                method = this[method];
            }
            if (!method) continue;

            method = _.bind(method as Function, this);
            //If it is one of the svg/vml events
            // @ts-ignore
            const event = this.el[eventName];
            if (event) {
                event(method);
            } // Custom events for RaphaelView object
            else {
                this.on(eventName, method);
            }
        }
        return this;
    }

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    undelegateEvents() {
        if(this.el.type) this.el.unbindAll?.();
        return this;
    }

}
