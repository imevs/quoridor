TestCase("MyTestCase", {
    setUp: function() {
        /** DOC += <div id="board"></div> */
        var quoridor = new Quoridor();
        var players = [
            new Player("Player 1", 4, "player_1", quoridor.startingFences),
            new Player("Player 2", 76, "player_2", quoridor.startingFences)
        ];
        quoridor.init('#board', new Information(), players);
        this.quoridor = quoridor;
    },

    testA: function () {
        assertEquals(this.quoridor.players.length, 2);
    },
    testGameBegin: function () {
        assertEquals(this.quoridor.players[0], this.quoridor.currentTurn);
        assertNotEquals(this.quoridor.players[1], this.quoridor.currentTurn);
    },
    testFirstTurn: function() {
        this.quoridor.switchPlayer();

        assertEquals(this.quoridor.players[1], this.quoridor.currentTurn);
        assertNotEquals(this.quoridor.players[0], this.quoridor.currentTurn);
    },
    testSecondTurn: function() {
        this.quoridor.switchPlayer();
        this.quoridor.switchPlayer();

        assertEquals(this.quoridor.players[0], this.quoridor.currentTurn);
        assertNotEquals(this.quoridor.players[1], this.quoridor.currentTurn);
    }

});