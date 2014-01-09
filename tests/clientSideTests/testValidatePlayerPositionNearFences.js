new TestCase('Test testValidatePlayerPositionNearFences', {
    setUp: function () {
        this.board = new BoardModel({
            playersCount: 2
        });
    },
    'test Valid Position With One Player and Fence': new TestWithProvider({
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
        test: function (input, expected) {
            var player = this.board.players.at(0);
            player.set({x: 4, y: 1});
            this.board.fences.findWhere({x: 4, y: 1}).set('state', 'busy');
            this.board.fences.findWhere({x: 5, y: 1}).set('state', 'busy');
            var res = this.board.isValidPlayerPosition(player.pick('x', 'y'), input);
            assertEquals(res, expected);
        }
    }),
    'test Valid Position With Two Players and Horizontal Fence ': new TestWithProvider({
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
        test: function (input, expected) {
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
    'test Valid Position With Two Players and Vertical Fence': new TestWithProvider({
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
        test: function (input, expected) {
            var player1 = this.board.players.at(0);
            player1.set({x: 3, y: 1});
            var player2 = this.board.players.at(1);
            player2.set({x: 4, y: 1});

            this.board.fences.findWhere({x: 4, y: 0, type: 'V'}).set('state', 'busy');
            this.board.fences.findWhere({x: 4, y: 1, type: 'V'}).set('state', 'busy');
            var res = this.board.isValidPlayerPosition(player1.pick('x', 'y'), input);
            assertEquals(res, expected);
        }
    }),
    'test Valid Position With Two Players and Both Vertical And Horizontal Walls': function () {
        var player1 = this.board.players.at(0);
        player1.set({x: 1, y: 3});
        var player2 = this.board.players.at(1);
        player2.set({x: 2, y: 3});

        this.board.fences.findWhere({x: 2, y: 2, type: 'V'}).set('state', 'busy');
        this.board.fences.findWhere({x: 2, y: 3, type: 'V'}).set('state', 'busy');

        this.board.fences.findWhere({x: 1, y: 3, type: 'H'}).set('state', 'busy');
        this.board.fences.findWhere({x: 2, y: 3, type: 'H'}).set('state', 'busy');

        var res = this.board.isValidPlayerPosition(player1.pick('x', 'y'), { x: 2, y: 4 });
        assertFalse(res);
    },
    'test Valid Position With Two Players and Horizontal Wall near border': new TestWithProvider({
        data: [
            {input: {x: 0, y: 2}}
            //{input: {x: 1, y: 2}}
        ],
        test: function (input) {
            var player1 = this.board.players.at(0);
            player1.set({x: 0, y: 3});
            var player2 = this.board.players.at(1);
            player2.set({x: 1, y: 3});

            this.board.fences.findWhere({x: input.x, y: input.y, type: 'H'}).set('state', 'busy');
            this.board.fences.findWhere({x: 1, y: 2, type: 'H'}).set('state', 'busy');

            var res = this.board.isValidPlayerPosition(player2.pick('x', 'y'), { x: 0, y: 2 });
            assertFalse(res);
        }
    })
});