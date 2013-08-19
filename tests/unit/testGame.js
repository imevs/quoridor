TestCase("Test game", {
    setUp: function() {
        this.board = new BoardModel({
            playersCount: 2
        });
        this.board.run(1);
        this.board.set('playerNumber', 1 - 1);
    },
    testPlayersPositionsBeforeGame: function() {
        var players = this.board.players;
        var pos1 = players.at(0).pick('x', 'y');
        var pos2 = players.at(1).pick('x', 'y');
        assertEquals(pos1, {x: 4, y: 0});
        assertEquals(pos2, {x: 4, y: 8});
    },
    testFirstTurnValid: function() {
        this.board.fields.trigger('moveplayer', 4, 1);
        this.board.trigger('maketurn');
        var players = this.board.players;
        var pos1 = players.at(0).pick('x', 'y');
        var pos2 = players.at(1).pick('x', 'y');
        assertEquals(pos1, {x: 4, y: 1});
        assertEquals(pos2, {x: 4, y: 8});
        assertEquals(players.getCurrentPlayer(), players.at(1));
    },
    testNeedConfirmForMovingPlayer: function() {
        this.board.fields.trigger('moveplayer', 4, 1);

        var players = this.board.players;
        var pos1 = players.at(0).pick('prev_x', 'prev_y');
        var pos2 = players.at(1).pick('prev_x', 'prev_y');

        assertEquals(pos1, {prev_x: 4, prev_y: 0});
        assertEquals(pos2, {prev_x: 4, prev_y: 8});
        assertEquals(players.getCurrentPlayer(), players.at(0));
    },
    testFirstTurnInvalid: function() {
        this.board.fields.trigger('moveplayer', 5, 1);
        var players = this.board.players;
        var pos1 = players.at(0).pick('x', 'y');
        var pos2 = players.at(1).pick('x', 'y');
        assertEquals(pos1, {x: 4, y: 0});
        assertEquals(pos2, {x: 4, y: 8});
        assertEquals(players.getCurrentPlayer(), players.at(0));
    },
    testFirstTurnSamePosition: function() {
        this.board.fields.trigger('moveplayer', 4, 0);
        var players = this.board.players;
        var pos1 = players.at(0).pick('x', 'y');
        var pos2 = players.at(1).pick('x', 'y');
        assertEquals(pos1, {x: 4, y: 0});
        assertEquals(pos2, {x: 4, y: 8});
        assertEquals(players.getCurrentPlayer(), players.at(0));
    },
    testFirstTurnOutOfBoard: function() {
        this.board.fields.trigger('moveplayer', 4, -1);
        var players = this.board.players;
        var pos1 = players.at(0).pick('x', 'y');
        var pos2 = players.at(1).pick('x', 'y');
        assertEquals(pos1, {x: 4, y: 0});
        assertEquals(pos2, {x: 4, y: 8});
        assertEquals(players.getCurrentPlayer(), players.at(0));
    }

});