var nodeunit = require('nodeunit');
var Backbone = require('backbone');
var sinon = require('sinon');
var Game = require('../../server/models/game.js');

Backbone.sync = function (method, obj, options) {
    if (options && options.success) {
        options.success();
    }
};

function extend(Child, Parent) {
    Child.prototype = Parent.prototype;
}

var emitter = require('events').EventEmitter;
var playerSocket = function (id) {
    this.id = id;
};
extend(playerSocket, emitter);

global.setTimeout = function () {};

var io, game, clock;

exports['test-game'] = nodeunit.testCase({

    setUp   : function (test) {
        io = {
            sockets: new emitter(),
            listen : function () {}
        };
        game = new Game();
        game.start(io);

        clock = sinon.useFakeTimers();

        test();
    },
    tearDown: function (test) {
        clock.restore();
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
        var guid = room.players.at(0).get('url');

        var p = new playerSocket('1');
        io.sockets.emit('connection', p);
        p.emit('myconnection', {playerId: guid});

        var room1 = game.at(0);
        test.equal(1, room1.findBusyPlayersPlaces().length);
        test.ok(!room1.isFull());
        test.done();
    },

    'connect 2 player': function (test) {
        var room = game.createNewRoom(2);
        var guid1 = room.players.at(0).get('url');
        var guid2 = room.players.at(1).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

        var room1 = game.at(0);
        test.equal(2, room1.findBusyPlayersPlaces().length);
        test.ok(room1.isFull());
        test.done();
    },

    'connect 1 player two times': function (test) {
        var room = game.createNewRoom(2);
        var guid1 = room.players.at(0).get('url');
        var guid2 = room.players.at(1).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('1');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

        var room1 = game.at(0);
        test.equal(1, room1.findBusyPlayersPlaces().length);
        test.ok(!room1.isFull());
        test.done();
    },

    'connect 3 player': function (test) {
        var room = game.createNewRoom(2);
        var guid1 = room.players.at(0).get('url');
        var guid2 = room.players.at(1).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

        var p3 = new playerSocket('3');
        io.sockets.emit('connection', p3);
        p3.emit('myconnection', {playerId: guid1});

        var room1 = game.at(0);
        test.equal(2, room1.findBusyPlayersPlaces().length);
        test.ok(room1.isFull());
        test.done();
    },

    'disconnect player from room 1': function (test) {
        var room = game.createNewRoom(2);
        var guid1 = room.players.at(0).get('url');

        var p = new playerSocket('1');
        io.sockets.emit('connection', p);
        p.emit('myconnection', {playerId: guid1});

        test.equal(1, room.findBusyPlayersPlaces().length);

        p.emit('disconnect', p);

        var room1 = game.at(0);
        test.equal(0, room1.findBusyPlayersPlaces().length);
        test.done();
    },

    'find player`s room': function (test) {
        var room1 = game.createNewRoom(2);
        var room2 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(1).get('url');
        var guid3 = room2.players.at(1).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

        var p3 = new playerSocket('3');
        io.sockets.emit('connection', p3);
        p3.emit('myconnection', {playerId: guid3});

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

    'test start 1st player': function (test) {
        var room1 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');

        var p = new playerSocket('1');
        io.sockets.emit('connection', p);

        p.on('server_start', function (currentPlayer, activePlayer, history) {
            test.equal(0, currentPlayer);
            test.equal(0, activePlayer);
            test.equal(2, history.length);
            test.done();
        });
        p.emit('myconnection', {playerId: guid1});
    },

    'test start 2nd player': function (test) {
        var room1 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(1).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);

        p2.on('server_start', function (currentPlayer, activePlayer/*, gameHistory*/) {
            test.equal(1, currentPlayer);
            test.equal(0, activePlayer);
            test.done();
        });
        p1.emit('myconnection', {playerId: guid1});
        p2.emit('myconnection', {playerId: guid2});
    },

    'test start 3rd player in 2nd room': function (test) {
        var room1 = game.createNewRoom(2);
        var room2 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(1).get('url');
        var guid3 = room2.players.at(0).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);

        var p3 = new playerSocket('3');
        io.sockets.emit('connection', p3);

        p3.on('server_start', function (currentPlayer, activePlayer, history) {
            test.equal(0, currentPlayer);
            test.equal(0, activePlayer);
            test.equal(2, history.length);
            test.done();
        });

        p1.emit('myconnection', {playerId: guid1});
        p2.emit('myconnection', {playerId: guid2});
        p3.emit('myconnection', {playerId: guid3});
    },

    'move player (check event params)': function (test) {
        var room1 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(1).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

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
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(1).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

        p1.emit('client_move_player', {x: 4, y: 1});

        var player = game.findPlayerRoom(p1).findPlayer(p1);
        test.equal(4, player.get('x'));
        test.equal(1, player.get('y'));
        test.done();
    },

    'player can`t move (check that there`s no event)': function (test) {
        var room1 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(0).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

        var spy = sinon.spy();
        p2.on('server_move_player', spy);

        p2.emit('client_move_player', {x: 4, y: 7});
        sinon.assert.notCalled(spy);
        test.done();
    },

    'player can`t move (check player position)': function (test) {
        var room1 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(1).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

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
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(1).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

        p2.on('server_move_fence', function (eventInfo) {
            test.equal(eventInfo.x, 4);
            test.equal(eventInfo.y, 7);
            test.equal(eventInfo.type, 'H');
            test.equal(eventInfo.playerIndex, 0);
            //test.equal(eventInfo.fencesRemaining, 9);
            test.done();
        });

        p1.emit('client_move_fence', {x: 4, y: 7, type: 'H'});
    },

    'player can`t move fence': function (test) {
        var room1 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(0).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

        var spy = sinon.spy();
        p1.on('server_move_fence', spy);

        p2.emit('client_move_fence', {x: 4, y: 7, type: 'H'});

        sinon.assert.notCalled(spy);
        test.done();
    },

    'restore players positions': function (test) {
        var room1 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(1).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

        p1.emit('client_move_player', {x: 4, y: 1});

        p1.emit('disconnect', p1);

        var p3 = new playerSocket('3');
        io.sockets.emit('connection', p3);

        p3.on('server_start', function (currentPlayer, activePlayer, history) {
            test.equal(0, currentPlayer);
            console.log(history[1]);
            /*            test.deepEqual({
             x              : 4,
             y              : 1,
             type           : 'player'
             }, gameHistory[3]);
             */
            test.done();
        });
        p3.emit('myconnection', {playerId: guid1});
    },

    'restore fences positions': function (test) {
        var room1 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(1).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

        p1.emit('client_move_fence', {x: 4, y: 1, type: 'H'});

        p1.emit('disconnect', p1);

        var p3 = new playerSocket('3');
        io.sockets.emit('connection', p3);

        p3.on('server_start', function (currentPlayer, activePlayer/*, gameHistory*/) {
            test.equal(0, currentPlayer);
            test.equal(1, activePlayer);
/*            test.deepEqual([
                {
                    x   : 4,
                    y   : 1,
                    type: 'fence'
                }
            ], history[3]);
*/
            test.done();
        });
        p3.emit('myconnection', {playerId: guid1});
    },

    'player can`t move (invalid position)': function (test) {
        var room1 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(0).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

        var spy = sinon.spy();
        p1.on('server_move_player', spy);

        p1.emit('client_move_player', {x: 4, y: 2});
        sinon.assert.notCalled(spy);
        test.done();
    },

    'fence can`t move (invalid position)': function (test) {
        var room1 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(0).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

        var spy = sinon.spy();
        p1.on('server_move_fence', spy);

        p1.emit('client_move_fence', {x: 4, y: 10, type: 'H'});

        sinon.assert.notCalled(spy);
        test.done();
    },

    'fence can`t move (position is busy)': function (test) {
        var room1 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(0).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

        p1.emit('client_move_fence', {x: 4, y: 2, type: 'H'});

        var spy = sinon.spy();
        p2.on('server_move_fence', spy);
        p2.emit('client_move_fence', {x: 4, y: 2, type: 'H'});

        sinon.assert.notCalled(spy);
        test.done();
    },

    'switch currentplayer by timeout': function (test) {
        var room1 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(1).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);
        p1.emit('myconnection', {playerId: guid1});

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);
        p2.emit('myconnection', {playerId: guid2});

        p1.emit('client_move_fence', {x: 4, y: 2, type: 'H'});

        test.equal(room1.get('activePlayer'), 1);
        clock.tick(16000);

        test.equal(room1.get('activePlayer'), 1);
        test.deepEqual(room1.history.get('turns').toJSON(), [
            { x: 4, y: 0, t: 'p' }, // start position
            { x: 4, y: 8, t: 'p' }, // start position
            { x: 4, y: 2, x2: 3, y2: 2, t: 'f' } // move fence
            //{ x: 4, y: 8, t: 'p' } // start position
        ]);
        test.done();
    },

    'parse empty': function (test) {
        var room1 = game.createNewRoom(2);
        var res = room1.parse();

        test.equal(res, undefined);
        test.done();
    },

    'parse history': function (test) {
        var room1 = game.createNewRoom(2);
        var turns = [
            { x: 4, y: 0, t: 'p' },
            { x: 4, y: 8, t: 'p' },
            { x: 4, y: 2, x2: 3, y2: 2, t: 'f' },
            { x: 4, y: 8, t: 'p' }
        ];
        room1.parse({
            _doc: {
                history: turns
            }
        });

        test.deepEqual(room1.history.get('turns').toJSON(), turns);
        test.done();
    },

    'test toJSON': function (test) {
        var room1 = game.createNewRoom(2);

        var result = room1.toJSON();
        delete result.id;
        delete result.createDate;
        delete result.playersInfo;

        test.deepEqual(result, {
            //createDate  : '',
            //id          : '431eb545-d537-47ca-a43f-4426d71ca243',
            playersCount: 2,
            activePlayer: 0,
            title       : '',
            boardSize   : 9,
            state       : '',
            history     : [
                { x: 4, y: 0, t: 'p' },
                { x: 4, y: 8, t: 'p' }
            ]
        });

        test.done();
    }

});
