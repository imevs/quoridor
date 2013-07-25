TestCase("Test Validate Player Position", {
    setUp: function() {
        this.board = new BoardModel();
    },
    "test Valid Position With One Player At The Top": new TestWithProvider({
        data: [
            {
                input: {x: 4, y: 1}
            }, {
                input: {x: 5, y: 0}
            }, {
                input: {x: 3, y: 0}
            }
        ],
        test: function(input, expected) {
            var player = new PlayerModel({x: 4, y: 0});
            var res = this.board.isValidPlayerPosition(player, input.x, input.y);
            assertTrue(res);
        }
    }),
    "test InValid Position With One Player At The Top": new TestWithProvider({
        data: [
            {
                input: {x: 5, y: 1}
            }, {
                input: {x: 3, y: 1}
            }, {
                input: {x: 4, y: -1}
            }, {
                input: {x: 4, y: 0}
            }
        ],
        test: function(input, expected) {
            var player = new PlayerModel({x: 4, y: 0});
            var res = this.board.isValidPlayerPosition(player, input.x, input.y);
            assertFalse(res);
        }
    }),
    "test Valid Position With One Player At The Bottom": new TestWithProvider({
        data: [
            {
                input: {x: 4, y: 7}
            }, {
                input: {x: 5, y: 8}
            }, {
                input: {x: 3, y: 8}
            }
        ],
        test: function(input, expected) {
            var player = new PlayerModel({x: 4, y: 8});
            var res = this.board.isValidPlayerPosition(player, input.x, input.y);
            assertTrue(res);
        }
    }),
    "test InValid Position With One Player At The Bottom": new TestWithProvider({
        data: [
            {
                input: {x: 3, y: 7}
            }, {
                input: {x: 5, y: 7}
            }, {
                input: {x: 4, y: 8}
            }, {
                input: {x: 4, y: 9}
            }
        ],
        test: function(input, expected) {
            var player = new PlayerModel({x: 4, y: 8});
            var res = this.board.isValidPlayerPosition(player, input.x, input.y);
            assertFalse(res);
        }
    })

});