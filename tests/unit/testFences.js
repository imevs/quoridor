TestCase("Test fences", {
    _testFences2Players: function() {
        /** DOC += <div id="board"></div> */
        var quoridor = new Quoridor();
        var players = [new Player("Player 1"), new Player("Player 2")];
        quoridor.init('#board', new Information(), players);
        this.quoridor = quoridor;
        assertEquals(players[0].fencesRemaining, 10);
    },
    _testFences4Players: function() {
        /** DOC += <div id="board"></div> */
        var quoridor = new Quoridor();
        var players = [
            new Player("Player 1"),
            new Player("Player 2"),
            new Player("Player 3"),
            new Player("Player 4")
        ];
        quoridor.init('#board', new Information(), players);

        assertEquals(players[0].fencesRemaining, 5);
    }

});