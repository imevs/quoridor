TestCase("Test Finish game", {
    setUp: function() {
        this.board = new BoardModel({
            playersCount: 2
        });
        this.board.run(1);
        this.board.set('playerNumber', 1 - 1);
    },

    testWin: function() {
        var isWin = false;
        window.confirm = function() {};
        this.board.players.at(0).set({x: 5, y: 7});
        this.board.players.at(0).set({prev_x: 5, prev_y: 7});
        this.board.players.on('win', function() { isWin = true;});
        this.board.fields.trigger('moveplayer', 5, 8);
        this.board.trigger('turn');
        assertTrue(isWin);
    },

    testResetGame: function () {
        window.confirm = function () {
            return true;
        };
        var player = this.board.players.at(0);
        player.set({x: 5, y: 7});
        this.board.players.at(0).set({prev_x: 5, prev_y: 7});
        this.board.fields.trigger('moveplayer', 5, 8);
        this.board.trigger('turn');
        assertEquals(player.pick('x', 'y'), {x: 4, y: 0 });
    },

    testNotResetGame: function () {
        window.confirm = function () {
            return false;
        };
        var player = this.board.players.at(0);
        player.set({x: 5, y: 7});
        this.board.players.at(0).set({prev_x: 5, prev_y: 7});
        this.board.fields.trigger('moveplayer', 5, 8);
        this.board.trigger('turn');
        assertEquals(player.pick('x', 'y'), {x: 5, y: 8 });
    }
});
