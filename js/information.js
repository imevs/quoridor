var Information = function () {
    var me = this;

    me.init = function(playersCount) {
        me.panel = $('<div id="info" />');
        me.currentTurn = $('<div id="currentTurn" />');
        me.fencesRemaining = $.map(new Array(playersCount), function(v, i) {
            return $('<div id="FencesRemainingPlayer' + i +  '" />');
        });
    };

    me.updateInformation = function (currentPlayerName, players) {
        var me = this;
        me.currentTurn.text(currentPlayerName);
        $.each(players, function(i, v) {
            me.fencesRemaining[i].text(v.fencesRemaining);
        });
    };

    me.getPanel = function () {
        me.panel.append(me.currentTurn);
        $.each(me.fencesRemaining, function(i, v) {
            me.panel.append(v);
        });
        return me.panel;
    }
};