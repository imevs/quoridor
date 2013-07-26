TestCase("Test fences", {

    setUp: function() {
        this.board = new BoardModel({
            playersCount: 2
        });
    },

    testCountFencesForTwoPlayers: function() {
        assertEquals(10, this.board.players.at(0).get('fencesRemaining'));
        assertEquals(10, this.board.players.at(1).get('fencesRemaining'));
    },

    testCountFencesForFourPlayers: function() {
        this.board = new BoardModel({
            playersCount: 4
        });
        assertEquals(5, this.board.players.at(0).get('fencesRemaining'));
        assertEquals(5, this.board.players.at(1).get('fencesRemaining'));
        assertEquals(5, this.board.players.at(2).get('fencesRemaining'));
        assertEquals(5, this.board.players.at(3).get('fencesRemaining'));
    },

    testCountFencesAfterTurn: function() {
        var fence = this.board.fences.findWhere({x: 4, y: 1, type: 'V'});
        fence.trigger('selected');
        assertTrue(this.board.fences.isBusy(fence));
        assertEquals(9, this.board.players.at(0).get('fencesRemaining'));
    },

    testTryPlaceFenceOnSamePositionTwiceSameType: function() {
        this.board.fences.findWhere({x: 4, y: 1, type: 'V'}).trigger('selected');
        this.board.fences.findWhere({x: 4, y: 1, type: 'V'}).trigger('selected');
        assertEquals(9, this.board.players.at(0).get('fencesRemaining'));
        assertEquals(10, this.board.players.at(1).get('fencesRemaining'));
    },

    testTryPlaceFenceOnSamePositionTwiceDifferentType: function() {
        this.board.fences.findWhere({x: 4, y: 1, type: 'V'}).trigger('selected');
        this.board.fences.findWhere({x: 4, y: 1, type: 'H'}).trigger('selected');
        assertEquals(9, this.board.players.at(0).get('fencesRemaining'));
        assertEquals(9, this.board.players.at(1).get('fencesRemaining'));
    },

    testHasFencesTrue: function() {
        assertTrue(this.board.players.at(0).hasFences());
    },

    testHasFencesFalse: function() {
        _([5, 2]).iter(function(i, j) {
            this.board.fences.findWhere({x: i, y: j * 2 + 1, type: 'V'}).trigger('selected');
        }, this);
        _([4, 3]).iter(function(i, j) {
            this.board.fences.findWhere({x: i * 2 + 1, y: j + 4, type: 'H'}).trigger('selected');
        }, this);

        assertEquals(0, this.board.players.at(0).get('fencesRemaining'));
        assertEquals(0, this.board.players.at(1).get('fencesRemaining'));
        assertFalse(this.board.players.at(0).hasFences());
        assertFalse(this.board.players.at(1).hasFences());
    }


});