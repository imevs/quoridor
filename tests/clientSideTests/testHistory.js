TestCase("Test History", {
    setUp: function() {
        this.board = new BoardModel({
            playersCount: 2
        });
        this.board.run(0, 0);
    },
    testNoHistoryOnGameStart: function() {
        assertEquals(0, this.board.historyModel.getLength());
    },
    testHistoryCountAfterFirstTurn: function() {
        this.board.fields.trigger('moveplayer', 4, 1);
        this.board.trigger('maketurn');

        assertEquals(1, this.board.historyModel.getLength());
    },
    testHistoryTextAfterFirstTurn: function() {
        this.board.fields.trigger('moveplayer', 4, 1);
        this.board.trigger('maketurn');

        assertEquals('e8', this.board.historyModel.at(0));
    },
    testHistoryCountAfterFirstFenceMove: function() {
        var fence2 = this.board.fences.findWhere({x: 1, y: 0, type: 'H'});
        fence2.trigger('selected', fence2);

        this.board.trigger('maketurn');

        assertEquals(1, this.board.historyModel.getLength());
    },
    testHistoryTextAfterFirstFenceMove: function() {
        var fence2 = this.board.fences.findWhere({x: 4, y: 4, type: 'H'});
        fence2.trigger('selected', fence2);

        this.board.trigger('maketurn');

        assertEquals('d5c5', this.board.historyModel.at(0));
    }

});