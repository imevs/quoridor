var nodeunit = require('nodeunit');
var Backbone = require('backbone');
var Game = require('../../server/models/game.js');
var sinon = require('sinon');

function extend(Child, Parent) {
    Child.prototype = Parent.prototype;
}

var emitter = require('events').EventEmitter;
var playerSocket = function (id) {
    this.id = id;
};
extend(playerSocket, emitter);

var io, game;

exports['quoridor'] = nodeunit.testCase({

    setUp   : function (test) {
        io = {
            sockets: new emitter(),
            listen : function () {}
        };
        game = new Game();
        game.start(io);

        test();
    },
    tearDown: function (test) {
        test();
    },

    'create game': function (test) {
        test.equal(0, game.length);
        test.done();
    },

    'create room': function (test) {
        var room = game.createNewRoom(2);
        test.equal(1, game.length);
        test.equal(0, room.findBusyPlayersPlaces().length);
        test.done();
    },

    'connect 1 player': function (test) {
        var room = game.createNewRoom(2);

        var p = new playerSocket('1');
        io.sockets.emit('connection', p);
        p.emit('myconnection', {roomId: room.get('id')});

        var room1 = game.at(0);
        test.equal(1, room1.findBusyPlayersPlaces().length);
        test.ok(!room1.isFull());
        test.done();
    },

    'connect 2 player': function (test) {
        var room = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room.get('id')});

        var room1 = game.at(0);
        test.equal(2, room1.findBusyPlayersPlaces().length);
        test.ok(room1.isFull());
        test.done();
    },

    'connect 1 player two times': function (test) {
        var room = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room.get('id')});

        var p2 = new playerSocket('1');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room.get('id')});

        var room1 = game.at(0);
        test.equal(1, room1.findBusyPlayersPlaces().length);
        test.ok(!room1.isFull());
        test.done();
    },

    'connect 3 player': function (test) {
        var room = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room.get('id')});

        var p3 = new playerSocket('3');
        io.sockets.emit('connection', p3);
        p3.emit('myconnection', {roomId: room.get('id')});

        var room1 = game.at(0);
        test.equal(2, room1.findBusyPlayersPlaces().length);
        test.ok(room1.isFull());
        test.done();
    },

    'disconnect player from room 1': function (test) {
        var room = game.createNewRoom(2);

        var p = new playerSocket('1');
        io.sockets.emit('connection', p);
        p.emit('myconnection', {roomId: room.get('id')});
        p.emit('disconnect', p);

        var room1 = game.at(0);
        test.equal(0, room1.findBusyPlayersPlaces().length);
        test.done();
    },

    "find player's room": function (test) {
        var room1 = game.createNewRoom(2);
        var room2 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room1.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room1.get('id')});

        var p3 = new playerSocket('3');
        io.sockets.emit('connection', p3);
        p3.emit('myconnection', {roomId: room2.get('id')});

        test.equal(game.at(0), game.findPlayerRoom({id: '1'}));
        test.equal(game.at(1), game.findPlayerRoom({id: '3'}));
        test.done();
    },

    'findFreeRoom get room 1': function (test) {
        var room1 = game.createNewRoom(2);
        var room2 = game.createNewRoom(2);
        test.equal(room1, game.findFreeRoom(room1.get('id')));
        test.equal(room2, game.findFreeRoom(room2.get('id')));
        test.done();
    },

    'findFreeRoom get room 2': function (test) {
        var room1 = game.createNewRoom(2);
        var room2 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room1.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room1.get('id')});

        test.notEqual(room1, game.findFreeRoom(room1.get('id')));
        test.equal(room2, game.findFreeRoom(room2.get('id')));
        test.done();
    },

    'test start 1st player': function (test) {
        var room1 = game.createNewRoom(2);

        var p = new playerSocket('1');
        io.sockets.emit('connection', p);

        p.on('server_start', function (currentPlayer, activePlayer, players) {
            test.equal(0, currentPlayer);
            test.equal(0, activePlayer);
            test.equal(2, players.length);
            test.done();
        });
        p.emit('myconnection', {roomId: room1.get('id')});
    },

    'test start 2nd player': function (test) {
        var room1 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);

        p2.on('server_start', function (currentPlayer, activePlayer, players) {
            test.equal(1, currentPlayer);
            test.equal(0, activePlayer);
            test.done();
        });
        p1.emit('myconnection', {roomId: room1.get('id')});
        p2.emit('myconnection', {roomId: room1.get('id')});
    },

    'test start 3rd player in 2nd room': function (test) {
        var room1 = game.createNewRoom(2);
        var room2 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);

        var p3 = new playerSocket('3');
        io.sockets.emit('connection', p3);

        p3.on('server_start', function (currentPlayer, activePlayer, players, fences) {
            test.equal(0, currentPlayer);
            test.equal(0, activePlayer);
            test.equal(0, fences.length);
            test.done();
        });

        p1.emit('myconnection', {roomId: room1.get('id')});
        p2.emit('myconnection', {roomId: room1.get('id')});
        p3.emit('myconnection', {roomId: room2.get('id')});
    },

    'move player (check event params)': function (test) {
        var room1 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room1.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room1.get('id')});

        p1.on('server_move_player', function (eventInfo) {
            test.equal(eventInfo.x, 4);
            test.equal(eventInfo.y, 1);
            test.equal(eventInfo.playerIndex, 0);
            test.done();
        });

        p1.emit('client_move_player', {x: 4, y: 1});
    },

    'move player (change user position)': function (test) {
        var room1 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room1.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room1.get('id')});

        p1.emit('client_move_player', {x: 4, y: 1});

        var player = game.findPlayerRoom(p1).findPlayer(p1);
        test.equal(4, player.get('x'));
        test.equal(1, player.get('y'));
        test.done();
    },

    'player can`t move (check that there`s no event)': function (test) {
        var room1 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room1.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room1.get('id')});

        var spy = sinon.spy();
        p2.on('server_move_player', spy);

        p2.emit('client_move_player', {x: 4, y: 7});
        sinon.assert.notCalled(spy);
        test.done();
    },

    'player can`t move (check player position)': function (test) {
        var room1 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room1.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room1.get('id')});

        p2.emit('client_move_player', {x: 4, y: 7});

        var player1 = game.findPlayerRoom(p1).findPlayer(p1);
        var player2 = game.findPlayerRoom(p1).findPlayer(p2);

        test.equal(4, player1.get('x'));
        test.equal(0, player1.get('y'));
        test.equal(4, player2.get('x'));
        test.equal(8, player2.get('y'));
        test.done();
    },

    'player move fence': function (test) {
        var room1 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room1.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room1.get('id')});

        p2.on('server_move_fence', function (eventInfo) {
            test.equal(eventInfo.x, 4);
            test.equal(eventInfo.y, 7);
            test.equal(eventInfo.type, 'H');
            test.equal(eventInfo.playerIndex, 0);
            test.equal(eventInfo.fencesRemaining, 9);
            test.done();
        });

        p1.emit('client_move_fence', {x: 4, y: 7, type: 'H'});
    },

    'player can`t move fence': function (test) {
        var room1 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room1.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room1.get('id')});

        var spy = sinon.spy();
        p1.on('server_move_fence', spy);

        p2.emit('client_move_fence', {x: 4, y: 7, type: 'H'});

        sinon.assert.notCalled(spy);
        test.done();
    },

    'restore players positions': function (test) {
        var room1 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room1.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room1.get('id')});

        p1.emit('client_move_player', {x: 4, y: 1});

        p1.emit('disconnect', p1);

        var p3 = new playerSocket('3');
        io.sockets.emit('connection', p3);

        p3.on('server_start', function (currentPlayer, activePlayer, players, fences) {
            test.equal(0, currentPlayer);
            test.deepEqual({
                x              : 4,
                y              : 1,
                fencesRemaining: 10
            }, players[currentPlayer]);

            test.done();
        });
        p3.emit('myconnection', {roomId: room1.get('id')});
    },

    'restore fences positions': function (test) {
        var room1 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room1.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room1.get('id')});

        p1.emit('client_move_fence', {x: 4, y: 1, type: 'H'});

        p1.emit('disconnect', p1);

        var p3 = new playerSocket('3');
        io.sockets.emit('connection', p3);

        p3.on('server_start', function (currentPlayer, activePlayer, players, fences) {
            test.equal(0, currentPlayer);
            test.equal(1, activePlayer);
            test.deepEqual([
                {
                    x   : 4,
                    y   : 1,
                    type: 'H'
                }
            ], fences);

            test.done();
        });
        p3.emit('myconnection', {roomId: room1.get('id')});
    },

    'player can`t move (invalid position)': function (test) {
        var room1 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room1.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room1.get('id')});

        var spy = sinon.spy();
        p1.on('server_move_player', spy);

        p1.emit('client_move_player', {x: 4, y: 2});
        sinon.assert.notCalled(spy);
        test.done();
    },

    'fence can`t move (invalid position)': function (test) {
        var room1 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room1.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room1.get('id')});

        var spy = sinon.spy();
        p1.on('server_move_fence', spy);

        p1.emit('client_move_fence', {x: 4, y: 10, type: 'H'});

        sinon.assert.notCalled(spy);
        test.done();
    },

    'fence can`t move (position is busy)': function (test) {
        var room1 = game.createNewRoom(2);

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {roomId: room1.get('id')});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {roomId: room1.get('id')});

        p1.emit('client_move_fence', {x: 4, y: 2, type: 'H'});

        var spy = sinon.spy();
        p2.on('server_move_fence', spy);
        p2.emit('client_move_fence', {x: 4, y: 2, type: 'H'});

        sinon.assert.notCalled(spy);
        test.done();
    }

});