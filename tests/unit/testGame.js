TestCase("Test game", {
    setUp: function() {
        this.board = new BoardModel({
            playersCount: 2
        });
    },
    testPlayersPositionsBeforeGame: function() {
        var pos1 = this.board.players.at(0).pick('x', 'y');
        var pos2 = this.board.players.at(1).pick('x', 'y');
        assertEquals(pos1, {x: 4, y: 0});
        assertEquals(pos2, {x: 4, y: 8});
    },
    testFirstTurn: function() {
        this.board.fields.trigger('moveplayer', 4, 1);
        var pos1 = this.board.players.at(0).pick('x', 'y');
        var pos2 = this.board.players.at(1).pick('x', 'y');
        assertEquals(pos1, {x: 4, y: 1});
        assertEquals(pos2, {x: 4, y: 8});
        assertEquals(this.board.players.getCurrentPlayer(), this.board.players.at(1));
    }

});