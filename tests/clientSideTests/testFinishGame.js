new TestCase('Test Finish game', {
    setUp: function () {
        this.board = new BoardModel({
            playersCount: 2
        });
        this.board.run(0);
    },

    testWin: function () {
        var isWin = false;
        window.confirm = function () {};
        document.location.reload = function () {};
        this.board.players.at(0).set({x: 5, y: 7});
        this.board.players.at(0).set({prev_x: 5, prev_y: 7});
        this.board.players.on('win', function () {
            isWin = true;
        });
        this.board.fields.trigger('moveplayer', 5, 8);
        this.board.trigger('maketurn');
        assertTrue(isWin);
    },

    // TODO
    _testResetGame: function () {
        window.confirm = function () {
            return true;
        };
        var player = this.board.players.at(0);
        player.set({x: 5, y: 7});
        this.board.players.at(0).set({prev_x: 5, prev_y: 7});
        this.board.fields.trigger('moveplayer', 5, 8);
        this.board.trigger('maketurn');
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
        this.board.trigger('maketurn');
        assertEquals(player.pick('x', 'y'), {x: 5, y: 8 });
    }
});
