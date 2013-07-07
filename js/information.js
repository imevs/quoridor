var Information = function () {
    var me = this;
    me.panel = $('<div id="info" />');
    me.currentTurn = $('<div id="currentTurn" />');
    me.fencesRemaining = [];
    me.fencesRemaining[0] = $('<div id="player1FencesRemaining" />');
    me.fencesRemaining[1] = $('<div id="player2FencesRemaining" />');
    me.getPanel = function () {
        me.panel.append(me.currentTurn);
        me.panel.append(me.fencesRemaining[0]);
        me.panel.append(me.fencesRemaining[1]);
        return me.panel;
    }
};