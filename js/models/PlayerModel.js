var PlayerModel = Backbone.Model.extend({

    isValidPosition: function (x, y) {
        var prevX = this.get('x'),
            prevY = this.get('y');
        return Math.abs(prevX - x) == 1 && prevY == y
            || Math.abs(prevY - y) == 1 && prevX == x;
    },

    moveTo: function (x, y) {
        if (this.isValidPosition(x, y)) {
            this.set({x: x, y: y});
        }
    },
    placeFence: function() {
        this.set('fencesRemaining', this.get('fencesRemaining') - 1);
    },
    hasFences: function() {
        return this.get('fencesRemaining') > 0;
    }

});

var PlayersCollection = Backbone.Collection.extend({
    currentPlayer   : 0,
    fencesCount     : 20,
    playersPositions: [
        {x: 4, y: 0, color: 'black'},
        {x: 4, y: 8, color: 'white'},
        {x: 0, y: 4, color: 'yellow'},
        {x: 8, y: 4, color: 'blue'}
    ],

    getCurrentPlayer: function () {
        return this.at(this.currentPlayer);
    },

    switchPlayer: function (player) {
        var c = _.isUndefined(player) ? this.currentPlayer + 1 : player - 1;
        this.currentPlayer = c < this.length ? c : 0;
        this.trigger('switchplayer', this.currentPlayer);
    },

    createPlayers: function (playersCount) {
        var me = this;
        _(playersCount).times(function (player) {
            var position = me.playersPositions[player];
            var fences = Math.round(me.fencesCount / playersCount);
            var model = new PlayerModel({
                x: position.x,
                y: position.y,
                color: position.color,
                fencesRemaining: fences
            });
            me.add(model);
        });
    }
});