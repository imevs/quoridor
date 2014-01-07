/* global Backbone, Raphael */
var GameObject = Backbone.RaphaelView.extend({
    // object methods
}, {
    startX        : 20,
    startY        : 30,
    squareWidth   : 50,
    squareHeight  : 30,
    squareDistance: 10,
    borderDepth   : 20,
    getPaper      : function () {
        return GameObject.paper || (GameObject.paper = new Raphael('holder', 600, 420));
    }
});