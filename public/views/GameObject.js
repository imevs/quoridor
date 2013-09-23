var GameObject = Backbone.RaphaelView.extend({
    // object methods
}, {
    startX        : 20,
    startY        : 30,
    squareWidth   : 50,
    squareHeight  : 30,
    squareDistance: 10,
    getPaper      : function () {
        return GameObject.paper || (GameObject.paper = Raphael('holder', 600, 420));
    }
});