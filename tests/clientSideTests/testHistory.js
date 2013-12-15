new TestCase('Test History', {
    setUp: function () {
        this.board = new BoardModel({
            playersCount: 2
        });
        this.board.run(0, 0);
    },
    testNoHistoryOnGameStart: function () {
        assertEquals(2, this.board.history.getLength());
    },
    testHistoryCountAfterFirstTurn: function () {
        this.board.fields.trigger('moveplayer', 4, 1);
        this.board.trigger('maketurn');

        assertEquals(3, this.board.history.getLength());
    },
    testHistoryTextAfterFirstTurn: function () {
        this.board.fields.trigger('moveplayer', 4, 1);
        this.board.trigger('maketurn');

        assertEquals('e8', this.board.history.at(2));
    },
    testHistoryCountAfterFirstFenceMove: function () {
        var fence2 = this.board.fences.findWhere({x: 1, y: 0, type: 'H'});
        fence2.trigger('selected', fence2);

        this.board.trigger('maketurn');

        assertEquals(3, this.board.history.getLength());
    },
    testHistoryTextAfterFirstFenceMove: function () {
        var fence2 = this.board.fences.findWhere({x: 4, y: 4, type: 'H'});
        fence2.trigger('selected', fence2);

        this.board.trigger('maketurn');

        assertEquals('d4e4', this.board.history.at(2));
    }

});