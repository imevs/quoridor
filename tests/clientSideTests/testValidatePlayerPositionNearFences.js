TestCase("Test testValidatePlayerPositionNearFences", {
    setUp: function() {
        this.board = new BoardModel({
            playersCount: 2
        });
    },
    "test Valid Position With One Player and Fence": new TestWithProvider({
        data: [
            {input: {x: 3, y: 0}, expected: false},
            {input: {x: 3, y: 1}, expected: true},
            {input: {x: 3, y: 2}, expected: false},
            {input: {x: 4, y: 0}, expected: true},
            {input: {x: 4, y: 1}, expected: false},
            {input: {x: 4, y: 2}, expected: false},
            {input: {x: 5, y: 0}, expected: false},
            {input: {x: 5, y: 1}, expected: true},
            {input: {x: 5, y: 2}, expected: false}
        ],
        test: function(input, expected) {
            var player = this.board.players.at(0);
            player.set({x: 4, y: 1});
            this.board.fences.findWhere({x: 4, y: 1}).set('state', 'busy');
            this.board.fences.findWhere({x: 5, y: 1}).set('state', 'busy');
            var res = this.board.isValidPlayerPosition(player.pick('x', 'y'), input);
            assertEquals(res, expected);
        }
    }),
    "test Valid Position With Two Players and Horizontal Fence ": new TestWithProvider({
        data: [
            {input: {x: 3, y: 0}, expected: true},
            {input: {x: 3, y: 1}, expected: true},
            {input: {x: 3, y: 2}, expected: false},
            {input: {x: 4, y: 0}, expected: false},
            {input: {x: 4, y: 1}, expected: false},
            {input: {x: 4, y: 2}, expected: false},
            {input: {x: 5, y: 0}, expected: true},
            {input: {x: 5, y: 1}, expected: true},
            {input: {x: 5, y: 2}, expected: false}
        ],
        test: function(input, expected) {
            var player1 = this.board.players.at(0);
            player1.set({x: 4, y: 0});
            var player2 = this.board.players.at(1);
            player2.set({x: 4, y: 1});

            this.board.fences.findWhere({x: 4, y: 1, type: 'H'}).set('state', 'busy');
            this.board.fences.findWhere({x: 5, y: 1, type: 'H'}).set('state', 'busy');
            var res = this.board.isValidPlayerPosition(player1.pick('x', 'y'), input);
            assertEquals(res, expected);
        }
    }),
    "test Valid Position With Two Players and Vertical Fence": new TestWithProvider({
        data: [
            {input: {x: 3, y: 0}, expected: true},
            {input: {x: 3, y: 1}, expected: false},
            {input: {x: 3, y: 2}, expected: true},

            {input: {x: 4, y: 0}, expected: true},
            {input: {x: 4, y: 1}, expected: false},
            {input: {x: 4, y: 2}, expected: true},

            {input: {x: 5, y: 0}, expected: false},
            {input: {x: 5, y: 1}, expected: false},
            {input: {x: 5, y: 2}, expected: false}
        ],
        test: function(input, expected) {
            var player1 = this.board.players.at(0);
            player1.set({x: 3, y: 1});
            var player2 = this.board.players.at(1);
            player2.set({x: 4, y: 1});

            this.board.fences.findWhere({x: 4, y: 0, type: 'V'}).set('state', 'busy');
            this.board.fences.findWhere({x: 4, y: 1, type: 'V'}).set('state', 'busy');
            var res = this.board.isValidPlayerPosition(player1.pick('x', 'y'), input);
            assertEquals(res, expected);
        }
    })

});