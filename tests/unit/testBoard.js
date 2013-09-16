TestCase("Test Board", {
    setUp: function() {
        this.board = new BoardModel({
            playersCount: 2
        });
    },
    testCreateBoardCreateModels: function() {
        this.board = new BoardModel({});
        assertNotUndefined(this.board.fields);
        assertNotUndefined(this.board.players);
        assertNotUndefined(this.board.fences);
        assertNotUndefined(this.board.infoModel);
    },
    testCreateBoardInitModels: function() {
        this.board = new BoardModel({
            playersCount: 4,
            boardSize: 9
        });
        assertEquals(this.board.fields.length, 9 * 9);
        assertEquals(this.board.fences.length, 2 * 9 * (9 - 1));
        assertEquals(this.board.players.length, 4);
    },
    testCreateBoardGetPlayers2: function() {
        assertEquals(this.board.players.length, 2);
    },
    testGetCurrentPlayer: function() {
        assertEquals(this.board.getActivePlayer(), this.board.players.at(0));
        assertNotEquals(this.board.getActivePlayer(), this.board.players.at(1));
    },
    testSwitchPlayer: function() {
        this.board.switchActivePlayer();
        assertEquals(this.board.getActivePlayer(), this.board.players.at(1));
    },
    testDoubleSwitchPlayer: function() {
        this.board.switchActivePlayer();
        this.board.switchActivePlayer();
        assertEquals(this.board.getActivePlayer(), this.board.players.at(0));
        assertNotEquals(this.board.getActivePlayer(), this.board.players.at(1));
    }

});