var assert = this.chai ? chai.assert : require('chai').assert;
var Room = this.Room || require('../../server/models/room.js');

var room;

describe('validation performance', function () {

/*
    'notBreakSomePlayerPath': function(test) {
        room = Room.createRoom({playersCount: 2});

        assert.ok(room.notBreakSomePlayerPath(
            room.fences.findWhere({x: 1, y: 1, type: 'H'})
        ));

        test();
    },

    'breakSomePlayerPath - 2 players': function(test) {
        room = Room.createRoom({playersCount: 2});

        room.fences.findWhere({x: 0, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 1, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 2, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 3, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 4, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 5, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 6, y: 5, type: 'H'}).set('state', 'busy');

        var fence = room.fences.findWhere({x: 8, y: 5, type: 'H'});

        assert.ok(room.breakSomePlayerPath(fence));
        assert.ok(room.doesFenceBreakPlayerPath(room.players.at(0), fence));
        assert.ok(room.doesFenceBreakPlayerPath(room.players.at(1), fence));

        test();
    },

    'breakSomePlayerPath - 4 players': function(test) {
        room = Room.createRoom({playersCount: 4});

        room.fences.findWhere({x: 0, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 1, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 2, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 3, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 4, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 5, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 6, y: 5, type: 'H'}).set('state', 'busy');

        var fence = room.fences.findWhere({x: 8, y: 5, type: 'H'});

        assert.ok(room.breakSomePlayerPath(fence));
        assert.deepEqual([
            room.doesFenceBreakPlayerPath(room.players.at(0), fence),
            room.doesFenceBreakPlayerPath(room.players.at(1), fence),
            room.doesFenceBreakPlayerPath(room.players.at(2), fence),
            room.doesFenceBreakPlayerPath(room.players.at(3), fence)
        ], [true, false, true, false]);

        test();
    },
*/

    it('breakSomePlayerPath - 4 players - temp', function (test) {
        console.time('0');
        room = Room.createRoom({playersCount: 4});

        room.fences.findWhere({x: 0, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 1, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 2, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 3, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 4, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 5, y: 5, type: 'H'}).set('state', 'busy');
        room.fences.findWhere({x: 6, y: 5, type: 'H'}).set('state', 'busy');

        var fence = room.fences.findWhere({x: 8, y: 5, type: 'H'});
        console.timeEnd('0');

        console.time('1');
        assert.ok(room.doesFenceBreakPlayerPath(room.players.at(0), fence));
        console.timeEnd('1');

        test();
    });

});
