TestCase("Test Validate Player Position", {
    setUp: function() {
        this.board = new BoardModel({
            playersCount: 4
        });
    },
    "test Valid Position With One Player At The Top": new TestWithProvider({
        data: [
            {input: {x: 4, y: 1}},
            {input: {x: 5, y: 0}},
            {input: {x: 3, y: 0}}
        ],
        test: function(input, expected) {
            var player = new PlayerModel({x: 4, y: 0});
            var res = this.board.isValidPlayerPosition(player, input.x, input.y);
            assertTrue(res);
        }
    }),
    "test InValid Position With One Player At The Top": new TestWithProvider({
        data: [
            {input: {x: 5, y: 1}},
            {input: {x: 3, y: 1}},
            {input: {x: 4, y: -1}},
            {input: {x: 4, y: 0}}
        ],
        test: function(input, expected) {
            var player = new PlayerModel({x: 4, y: 0});
            var res = this.board.isValidPlayerPosition(player, input.x, input.y);
            assertFalse(res);
        }
    }),
    "test Valid Position With One Player At The Bottom": new TestWithProvider({
        data: [
            {input: {x: 4, y: 7}},
            {input: {x: 5, y: 8}},
            {input: {x: 3, y: 8}}
        ],
        test: function(input, expected) {
            var player = new PlayerModel({x: 4, y: 8});
            var res = this.board.isValidPlayerPosition(player, input.x, input.y);
            assertTrue(res);
        }
    }),
    "test InValid Position With One Player At The Bottom": new TestWithProvider({
        data: [
            {input: {x: 3, y: 7}},
            {input: {x: 5, y: 7}},
            {input: {x: 4, y: 8}},
            {input: {x: 4, y: 9}}
        ],
        test: function(input, expected) {
            var player = new PlayerModel({x: 4, y: 8});
            var res = this.board.isValidPlayerPosition(player, input.x, input.y);
            assertFalse(res);
        }
    }),
    "test Valid Position With Two Players (current player - Left)": new TestWithProvider({
        data: [
            {input: {x: 4, y: 3},expected: true},
            {input: {x: 4, y: 5},expected: true},
            {input: {x: 6, y: 4},expected: true},
            {input: {x: 3, y: 4},expected: true},
            {input: {x: 5, y: 3},expected: false},
            {input: {x: 5, y: 4},expected: false},
            {input: {x: 5, y: 5},expected: false}
        ],
        test: function(input, expected) {
            var player1 = this.board.players.at(0).set({x: 4, y: 4});
            var player2 = this.board.players.at(1).set({x: 5, y: 4});
            var res = this.board.isValidPlayerPosition(player1, input.x, input.y);
            assertEquals(res, expected);
        }
    }),
    "test Valid Position With Two Players (current player - Right)": new TestWithProvider({
        data: [
            {input: {x: 4, y: 3},expected: false},
            {input: {x: 4, y: 5},expected: false},
            {input: {x: 6, y: 4},expected: true},
            {input: {x: 3, y: 4},expected: true},
            {input: {x: 5, y: 3},expected: true},
            {input: {x: 5, y: 4},expected: false},
            {input: {x: 5, y: 5},expected: true}
        ],
        test: function(input, expected) {
            var player1 = this.board.players.at(0).set({x: 4, y: 4});
            var player2 = this.board.players.at(1).set({x: 5, y: 4});
            var res = this.board.isValidPlayerPosition(player2, input.x, input.y);
            assertEquals(res, expected);
        }
    }),
    "test Valid With Three Players (current player - Left)": new TestWithProvider({
        data: [
            {input: {x: 3, y: 3}, expected: false},
            {input: {x: 3, y: 4}, expected: true},
            {input: {x: 3, y: 5}, expected: false},
            {input: {x: 4, y: 3}, expected: true},
            {input: {x: 4, y: 4}, expected: false},
            {input: {x: 4, y: 5}, expected: true},
            {input: {x: 5, y: 3}, expected: true},
            {input: {x: 5, y: 4}, expected: false},
            {input: {x: 5, y: 5}, expected: true},
            {input: {x: 6, y: 3}, expected: false},
            {input: {x: 6, y: 4}, expected: false},
            {input: {x: 6, y: 5}, expected: false},
            {input: {x: 7, y: 3}, expected: false},
            {input: {x: 7, y: 4}, expected: false},
            {input: {x: 7, y: 5}, expected: false},
        ],
        test: function(input, expected) {
            var player1 = this.board.players.at(0).set({x: 4, y: 4});
            var player2 = this.board.players.at(1).set({x: 5, y: 4});
            var player3 = this.board.players.at(2).set({x: 6, y: 4});
            var res = this.board.isValidPlayerPosition(player1, input.x, input.y);
            assertEquals(res, expected);
        }
    }),
    "test Valid With Three Players (current player - Middle)": new TestWithProvider({
        data: [
            {input: {x: 3, y: 3}, expected: false},
            {input: {x: 3, y: 4}, expected: true},
            {input: {x: 3, y: 5}, expected: false},
            {input: {x: 4, y: 3}, expected: false},
            {input: {x: 4, y: 4}, expected: false},
            {input: {x: 4, y: 5}, expected: false},
            {input: {x: 5, y: 3}, expected: true},
            {input: {x: 5, y: 4}, expected: false},
            {input: {x: 5, y: 5}, expected: true},
            {input: {x: 6, y: 3}, expected: false},
            {input: {x: 6, y: 4}, expected: false},
            {input: {x: 6, y: 5}, expected: false},
            {input: {x: 7, y: 3}, expected: false},
            {input: {x: 7, y: 4}, expected: true},
            {input: {x: 7, y: 5}, expected: false}
        ],
        test: function(input, expected) {
            var player1 = this.board.players.at(0).set({x: 4, y: 4});
            var player2 = this.board.players.at(1).set({x: 5, y: 4});
            var player3 = this.board.players.at(2).set({x: 6, y: 4});
            var res = this.board.isValidPlayerPosition(player2, input.x, input.y);
            assertEquals(res, expected);
        }
    }),
    "test Valid With Three Players (current player - Right)": new TestWithProvider({
        data: [
            {input: {x: 3, y: 3}, expected: false},
            {input: {x: 3, y: 4}, expected: false},
            {input: {x: 3, y: 5}, expected: false},
            {input: {x: 4, y: 3}, expected: false},
            {input: {x: 4, y: 4}, expected: false},
            {input: {x: 4, y: 5}, expected: false},
            {input: {x: 5, y: 3}, expected: true},
            {input: {x: 5, y: 4}, expected: false},
            {input: {x: 5, y: 5}, expected: true},
            {input: {x: 6, y: 3}, expected: true},
            {input: {x: 6, y: 4}, expected: false},
            {input: {x: 6, y: 5}, expected: true},
            {input: {x: 7, y: 3}, expected: false},
            {input: {x: 7, y: 4}, expected: true},
            {input: {x: 7, y: 5}, expected: false}
        ],
        test: function(input, expected) {
            var player1 = this.board.players.at(0).set({x: 4, y: 4});
            var player2 = this.board.players.at(1).set({x: 5, y: 4});
            var player3 = this.board.players.at(2).set({x: 6, y: 4});
            var res = this.board.isValidPlayerPosition(player3, input.x, input.y);
            assertEquals(res, expected);
        }
    })

});