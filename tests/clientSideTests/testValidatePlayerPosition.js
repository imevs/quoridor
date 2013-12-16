/* global TestCase, BoardModel, PlayerModel,
TestWithProvider, assertTrue, assertFalse, assertEquals */
new TestCase('Test Validate Player Position', {
    setUp: function () {
        this.board = new BoardModel({
            playersCount: 4
        });
    },
    'test Valid Position With One Player At The Top': new TestWithProvider({
        data: [
            {input: {x: 4, y: 1}},
            {input: {x: 5, y: 0}},
            {input: {x: 3, y: 0}}
        ],
        test: function (input/*, expected*/) {
            var player = new PlayerModel({x: 4, y: 0});
            var res = this.board.isValidPlayerPosition(player.pick('x', 'y'), input);
            assertTrue(res);
        }
    }),
    'test InValid Position With One Player At The Top': new TestWithProvider({
        data: [
            {input: {x: 5, y: 1}},
            {input: {x: 3, y: 1}},
            {input: {x: 4, y: -1}},
            {input: {x: 4, y: 0}}
        ],
        test: function (input/*, expected*/) {
            var player = new PlayerModel({x: 4, y: 0});
            var res = this.board.isValidPlayerPosition(player.pick('x', 'y'), input);
            assertFalse(res);
        }
    }),
    'test Valid Position With One Player At The Bottom': new TestWithProvider({
        data: [
            {input: {x: 4, y: 7}},
            {input: {x: 5, y: 8}},
            {input: {x: 3, y: 8}}
        ],
        test: function (input/*, expected*/) {
            var player = new PlayerModel({x: 4, y: 8});
            var res = this.board.isValidPlayerPosition(player.pick('x', 'y'), input);
            assertTrue(res);
        }
    }),
    'test InValid Position With One Player At The Bottom': new TestWithProvider({
        data: [
            {input: {x: 3, y: 7}},
            {input: {x: 5, y: 7}},
            {input: {x: 4, y: 8}},
            {input: {x: 4, y: 9}}
        ],
        test: function (input/*, expected*/) {
            var player = new PlayerModel({x: 4, y: 8});
            var res = this.board.isValidPlayerPosition(player.pick('x', 'y'), input);
            assertFalse(res);
        }
    }),
    'test Valid Position With Two Players (current player - Left)': new TestWithProvider({
        data: [
            {input: {x: 4, y: 3}, expected: true},
            {input: {x: 4, y: 5}, expected: true},
            {input: {x: 6, y: 4}, expected: true},
            {input: {x: 3, y: 4}, expected: true},
            {input: {x: 5, y: 3}, expected: false},
            {input: {x: 5, y: 4}, expected: false},
            {input: {x: 5, y: 5}, expected: false}
        ],
        test: function (input, expected) {
            var player1 = this.board.players.at(0).set({
                x: 4,
                y: 4,
                prev_x: 4,
                prev_y: 4
            });
            this.board.players.at(1).set({
                x: 5,
                y: 4,
                prev_x: 5,
                prev_y: 4
            });
            var res = this.board.isValidPlayerPosition(player1.pick('x', 'y'), input);
            assertEquals(res, expected);
        }
    }),
    'test Valid Position With Two Players (current player - Right)': new TestWithProvider({
        data: [
            {input: {x: 4, y: 3}, expected: false},
            {input: {x: 4, y: 5}, expected: false},
            {input: {x: 6, y: 4}, expected: true},
            {input: {x: 3, y: 4}, expected: true},
            {input: {x: 5, y: 3}, expected: true},
            {input: {x: 5, y: 4}, expected: false},
            {input: {x: 5, y: 5}, expected: true}
        ],
        test: function (input, expected) {
            this.board.players.at(0).set({
                x: 4,
                y: 4,
                prev_x: 4,
                prev_y: 4
            });
            var player2 = this.board.players.at(1).set({
                x: 5,
                y: 4,
                prev_x: 5,
                prev_y: 4
            });
            var res = this.board.isValidPlayerPosition(player2.pick('x', 'y'), input);
            assertEquals(res, expected);
        }
    }),
    'test Valid With Three Players (current player - Left)': new TestWithProvider({
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
            {input: {x: 7, y: 5}, expected: false}
        ],
        test: function (input, expected) {
            var player1 = this.board.players.at(0).set({x: 4, y: 4});
            this.board.players.at(1).set({x: 5, y: 4});
            this.board.players.at(2).set({x: 6, y: 4});
            var res = this.board.isValidPlayerPosition(player1.pick('x', 'y'), input);
            assertEquals(res, expected);
        }
    }),
    'test Valid With Three Players (current player - Middle)': new TestWithProvider({
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
        test: function (input, expected) {
            this.board.players.at(0).set({
                x: 4,
                y: 4,
                prev_x: 4,
                prev_y: 4
            });
            var player2 = this.board.players.at(1).set({
                x: 5,
                y: 4,
                prev_x: 5,
                prev_y: 4
            });
            this.board.players.at(2).set({
                x: 6,
                y: 4,
                prev_x: 6,
                prev_y: 4
            });
            var res = this.board.isValidPlayerPosition(player2.pick('x', 'y'), input);
            assertEquals(res, expected);
        }
    }),
    'test Valid With Three Players (current player - Right)': new TestWithProvider({
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
        test: function (input, expected) {
            this.board.players.at(0).set({x: 4, y: 4});
            this.board.players.at(1).set({x: 5, y: 4});
            var player3 = this.board.players.at(2).set({x: 6, y: 4});
            var res = this.board.isValidPlayerPosition(player3.pick('x', 'y'), input);
            assertEquals(res, expected);
        }
    }),

    'test bug with different prev_y and y': function () {
        var player1 = this.board.players.at(0).set({prev_x: 4, prev_y: 3, x: 4, y: 4});
        this.board.players.at(1).set({prev_x: 4, prev_y: 5, x: 4, y: 5});
        var newPos = {x: 5, y: 4};
        var currentPos = {x: player1.get('prev_x'), y: player1.get('prev_y')};
        assertFalse(this.board.isValidPlayerPosition(currentPos, newPos));
    }

});