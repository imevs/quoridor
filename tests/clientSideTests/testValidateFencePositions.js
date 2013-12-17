new TestCase('Test testValidateFencePositions', {
    setUp: function () {
        this.room = new BoardModel({
            playersCount: 4
        });
    },

    'test 1': function () {
        var room = this.room;
        room.fences.findWhere({x: 0, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 1, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 2, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 3, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 4, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 5, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 6, y: 5, type: 'H'}).set('state', 'busy');

        var fence = room.fences.findWhere({x: 8, y: 5, type: 'H'});
        //console.profile();
        assertTrue(room.doesFenceBreakPlayerPath(room.players.at(0), fence));
        //console.profileEnd();
    },

    'test 2': function () {
        var room = new BoardModel({
            playersCount: 4
        });
        room.players.at(0).set({prev_x: 6, prev_y: 5, x: 6, y: 5});
        room.players.at(1).set({prev_x: 8, prev_y: 5, x: 8, y: 5});

        room.fences.findWhere({x: 0, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 1, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 2, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 3, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 4, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 5, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 6, y: 5, type: 'H'}).set('state', 'busy');

        var fence = room.fences.findWhere({x: 8, y: 5, type: 'H'});
        assertTrue(room.doesFenceBreakPlayerPath(room.players.at(0), fence));
        assertFalse(room.doesFenceBreakPlayerPath(room.players.at(1), fence));
    }

});