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
    },

    'test place fence on the board': function() {
        var fence1 = this.board.fences.findWhere({x: 4, y: 0, type: 'H'});
        var fence2 = this.board.fences.findWhere({x: 3, y: 0, type: 'H'});

        fence1.trigger('selected');

        assertTrue(this.board.fences.isBusy(fence1));
        assertTrue(this.board.fences.isBusy(fence2));
        assertFalse(this.board.fences.validateAndTriggerEventOnFenceAndSibling(fence1));
    },

    'test Try To place crossed Fence - Not allowed': function() {
        var fence1 = this.board.fences.findWhere({x: 4, y: 1, type: 'V'});
        var fence2 = this.board.fences.findWhere({x: 5, y: 0, type: 'H'});

        fence1.trigger('selected');
        fence2.trigger('selected');

        assertTrue(this.board.fences.isBusy(fence1));
        assertFalse(this.board.fences.isBusy(fence2));
    },

    'test Try To place crossed Fence - Allowed (left)': function() {
        var fence1 = this.board.fences.findWhere({x: 4, y: 1, type: 'V'});
        var fence2 = this.board.fences.findWhere({x: 4, y: 0, type: 'H'});

        fence1.trigger('selected');
        fence2.trigger('selected');

        assertTrue(this.board.fences.isBusy(fence1));
        assertTrue(this.board.fences.isBusy(fence2));
    },

    'test Try To place crossed Fence - Allowed (right)': function() {
        var fence1 = this.board.fences.findWhere({x: 4, y: 1, type: 'V'});
        var fence2 = this.board.fences.findWhere({x: 6, y: 0, type: 'H'});

        fence1.trigger('selected');
        fence2.trigger('selected');

        assertTrue(this.board.fences.isBusy(fence1));
        assertTrue(this.board.fences.isBusy(fence2));
    },

    'test Place Fence on the line': function() {
        this.board = new BoardModel({
            boardSize   : 3
        });
        var fence1 = this.board.fences.findWhere({x: 0, y: 0, type: 'H'});
        var fence2 = this.board.fences.findWhere({x: 1, y: 0, type: 'H'});
        var fence3 = this.board.fences.findWhere({x: 2, y: 0, type: 'H'});

        fence2.trigger('selected');

        assertTrue(this.board.fences.isBusy(fence1));
        assertTrue(this.board.fences.isBusy(fence2));

        assertFalse(this.board.fences.isBusy(fence3));
        assertFalse(this.board.fences.validateAndTriggerEventOnFenceAndSibling(fence3));
    },

    'test Place Fence on the line - check pass': function() {
        this.board = new BoardModel({
            boardSize   : 4
        });
        var fence1 = this.board.fences.findWhere({x: 0, y: 0, type: 'H'});
        var fence2 = this.board.fences.findWhere({x: 1, y: 0, type: 'H'});
        var fence3 = this.board.fences.findWhere({x: 2, y: 0, type: 'H'});
        var fence4 = this.board.fences.findWhere({x: 3, y: 0, type: 'H'});

        fence2.trigger('selected');

        assertTrue(this.board.fences.isBusy(fence1));
        assertTrue(this.board.fences.isBusy(fence2));

        assertFalse(this.board.fences.isBusy(fence3));
        assertFalse(this.board.fences.isBusy(fence4));
        assertFalse(this.board.fences.validateAndTriggerEventOnFenceAndSibling(fence3));
        assertFalse(this.board.fences.validateAndTriggerEventOnFenceAndSibling(fence4));
    },

    'test Place Fence on the line - check pass - ok': function() {
        this.board = new BoardModel({
            boardSize   : 5
        });
        var fence1 = this.board.fences.findWhere({x: 0, y: 0, type: 'H'});
        var fence2 = this.board.fences.findWhere({x: 1, y: 0, type: 'H'});
        var fence3 = this.board.fences.findWhere({x: 2, y: 0, type: 'H'});
        var fence4 = this.board.fences.findWhere({x: 3, y: 0, type: 'H'});
        var fence5 = this.board.fences.findWhere({x: 4, y: 0, type: 'H'});

        fence2.trigger('selected');

        assertTrue(this.board.fences.isBusy(fence1));
        assertTrue(this.board.fences.isBusy(fence2));

        assertFalse(this.board.fences.isBusy(fence3));
        assertFalse(this.board.fences.isBusy(fence4));
        assertFalse(this.board.fences.isBusy(fence5));

        assertFalse(this.board.fences.validateAndTriggerEventOnFenceAndSibling(fence3));

        assertTrue(this.board.fences.validateAndTriggerEventOnFenceAndSibling(fence4));
        assertTrue(this.board.fences.validateAndTriggerEventOnFenceAndSibling(fence5));
    }


});