var BoardModel = Backbone.Model.extend({
    fences          : new FencesCollection(),
    fields          : new FieldsCollection(),
    players         : new PlayersCollection(),
    infoModel       : new Backbone.Model(),
    boardSize       : 9,
    playersCount    : 4,

    initModels   : function () {
        var me = this, boardSize = this.boardSize;

        _([boardSize, boardSize]).iter(function (i, j) {
            me.fields.add(new FieldModel({x: i, y: j, color: '#f00'}));
        });
        _([boardSize, boardSize - 1]).iter(function (i, j) {
            me.fences.add(new FenceHModel({x: i, y: j, color: 'blue'}));
        });
        _([boardSize - 1, boardSize]).iter(function (i, j) {
            me.fences.add(new FenceVModel({x: i, y: j, color: 'blue'}));
        });
        this.players.createPlayers(this.playersCount);
    },
    initEvents: function () {
        var me = this;

        this.fields.on('moveplayer', function (x, y) {
            me.players.getCurrentPlayer().moveTo(x, y);
            me.players.switchPlayer();
        });
        this.fields.on('selectfield', function (x, y) {
            var current = me.players.getCurrentPlayer();
            if (current.isValidPosition(x, y)) {
                this.trigger('valid_position', x, y);
            }
        });
        this.players.on('change switchplayer', function() {
            me.infoModel.set({
                currentplayer: this.currentPlayer + 1,
                fences: this.pluck('fencesRemaining')
            });
        });
        this.fences.on('selected', function(fence) {
            if (me.players.getCurrentPlayer().hasFences()) {
                me.players.getCurrentPlayer().placeFence();
                me.players.switchPlayer();
            }
        });
    },
    run: function() {
        this.players.switchPlayer(1);
    },
    initialize: function () {
        this.initEvents();
        this.initModels();
    }
});