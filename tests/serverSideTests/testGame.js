var assert = this.chai ? chai.assert : require('chai').assert;
var Backbone = this.Backbone || require('backbone');
var sinon = this.sinon || require('sinon');
var Game = this.Game || require('../../server/models/game.js');

Backbone.sync = function (method, obj, options) {
    if (options && options.success) {
        options.success();
    }
};

function extend(Child, Parent) {
    Child.prototype = Parent.prototype;
}

var emitter = this.EventEmitter || require('events').EventEmitter;
var playerSocket = function (id) {
    this.id = id;
};
extend(playerSocket, emitter);
this.global = this.global || this;
global.setTimeout = function (callback) {callback()};

describe('test-game', function () {

    var io, game, clock;

    beforeEach(function (test) {
        io = {
            sockets: new emitter(),
            listen : function () {}
        };
        game = new Game();
        game.start(io);

        clock = sinon.useFakeTimers();

        test();
    });

    afterEach(function (test) {
        clock.restore();
        test();
    });

    it('create game', function (test) {
        assert.equal(0, game.length);
        test();
    });

    it('create room', function (test) {
        var room = game.createNewRoom(2);
        assert.equal(1, game.length);
        assert.equal(0, room.findBusyPlayersPlaces().length);
        test();
    });

    it('connect 1 player', function (test) {
        var room = game.createNewRoom(2);
        var guid = room.players.at(0).get('url');

        var p = new playerSocket('1');
        io.sockets.emit('connection', p);
        p.emit('myconnection', {playerId: guid});

        var room1 = game.at(0);
        assert.equal(1, room1.findBusyPlayersPlaces().length);
        assert.ok(!room1.isFull());
        test();
    });

    it('connect 2 player', function (test) {
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
        assert.equal(2, room1.findBusyPlayersPlaces().length);
        assert.ok(room1.isFull());
        test();
    });

    it('connect 1 player two times', function (test) {
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
        assert.equal(1, room1.findBusyPlayersPlaces().length);
        assert.ok(!room1.isFull());
        test();
    });

    it('connect 3 player', function (test) {
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
        assert.equal(2, room1.findBusyPlayersPlaces().length);
        assert.ok(room1.isFull());
        test();
    });

    it('disconnect player from room 1', function (test) {
        var room = game.createNewRoom(2);
        var guid1 = room.players.at(0).get('url');

        var p = new playerSocket('1');
        io.sockets.emit('connection', p);
        p.emit('myconnection', {playerId: guid1});

        assert.equal(1, room.findBusyPlayersPlaces().length);

        p.emit('disconnect', p);

        var room1 = game.at(0);
        assert.equal(0, room1.findBusyPlayersPlaces().length);
        test();
    });

    it('find player`s room', function (test) {
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

        assert.equal(game.at(0), game.findPlayerRoom({id: '1'}));
        assert.equal(game.at(1), game.findPlayerRoom({id: '3'}));
        test();
    });

    it('findFreeRoom get room 1', function (test) {
        var room1 = game.createNewRoom(2);
        var room2 = game.createNewRoom(2);
        assert.equal(room1, game.findFreeRoom(room1.get('id')));
        assert.equal(room2, game.findFreeRoom(room2.get('id')));
        test();
    });

    it('test start 1st player', function (test) {
        var room1 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');

        var p = new playerSocket('1');
        io.sockets.emit('connection', p);

        p.on('server_start', function (currentPlayer, activePlayer, history) {
            assert.equal(0, currentPlayer);
            assert.equal(0, activePlayer);
            assert.equal(2, history.length);
            test();
        });
        p.emit('myconnection', {playerId: guid1});
    });

    it('test start 2nd player', function (test) {
        var room1 = game.createNewRoom(2);
        var guid1 = room1.players.at(0).get('url');
        var guid2 = room1.players.at(1).get('url');

        var p1 = new playerSocket('1');
        io.sockets.emit('connection', p1);

        var p2 = new playerSocket('2');
        io.sockets.emit('connection', p2);

        p2.on('server_start', function (currentPlayer, activePlayer/*, gameHistory*/) {
            assert.equal(1, currentPlayer);
            assert.equal(0, activePlayer);
            test();
        });
        p1.emit('myconnection', {playerId: guid1});
        p2.emit('myconnection', {playerId: guid2});
    });

    it('test start 3rd player in 2nd room', function (test) {
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
            assert.equal(0, currentPlayer);
            assert.equal(0, activePlayer);
            assert.equal(2, history.length);
            test();
        });

        p1.emit('myconnection', {playerId: guid1});
        p2.emit('myconnection', {playerId: guid2});
        p3.emit('myconnection', {playerId: guid3});
    });

    void('move player (check event params)', function (test) {
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
            assert.equal(eventInfo.x, 4);
            assert.equal(eventInfo.y, 1);
            assert.equal(eventInfo.playerIndex, 0);
            test();
        });

        p1.emit('client_move_player', {x: 4, y: 1});
    });

    it('move player (change user position)', function (test) {
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
        assert.equal(4, player.get('x'));
        assert.equal(1, player.get('y'));
        test();
    });

    it('player can`t move (check that there`s no event)', function (test) {
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
        test();
    });

    it('player can`t move (check player position)', function (test) {
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

        assert.equal(4, player1.get('x'));
        assert.equal(0, player1.get('y'));
        assert.equal(4, player2.get('x'));
        assert.equal(8, player2.get('y'));
        test();
    });

    void('player move fence', function (test) {
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
            assert.equal(eventInfo.x, 4);
            assert.equal(eventInfo.y, 7);
            assert.equal(eventInfo.type, 'H');
            assert.equal(eventInfo.playerIndex, 0);
            //assert.equal(eventInfo.fencesRemaining, 9);
            test();
        });

        p1.emit('client_move_fence', {x: 4, y: 7, type: 'H'});
    });

    it('player can`t move fence', function (test) {
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
        test();
    });

    it('restore players positions', function (test) {
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
            assert.equal(0, currentPlayer);

            /*            assert.deepEqual({
             x              : 4,
             y              : 1,
             type           : 'player'
             }, gameHistory[3]);
             */
            test();
        });
        p3.emit('myconnection', {playerId: guid1});
    });

    it('restore fences positions', function (test) {
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
            assert.equal(0, currentPlayer);
            assert.equal(1, activePlayer);
/*            assert.deepEqual([
                {
                    x   : 4,
                    y   : 1,
                    type: 'fence'
                }
            ], history[3]);
*/
            test();
        });
        p3.emit('myconnection', {playerId: guid1});
    });

    it('player can`t move (invalid position)', function (test) {
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
        test();
    });

    it('fence can`t move (invalid position)', function (test) {
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
        test();
    });

    it('fence can`t move (position is busy)', function (test) {
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
        test();
    });

    it.skip('switch currentplayer by timeout', function (test) {
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

        assert.equal(room1.get('activePlayer'), 1);
        clock.tick(16000);

        assert.equal(room1.get('activePlayer'), 1);
        assert.deepEqual(room1.history.get('turns').toJSON(), [
            { x: 4, y: 0, t: 'p' }, // start position
            { x: 4, y: 8, t: 'p' }, // start position
            { x: 4, y: 2, x2: 3, y2: 2, t: 'f' } // move fence
        ]);
        test();
    });

    it.skip('parse empty', function (test) {
        var room1 = game.createNewRoom(2);
        var res = room1.parse();

        assert.equal(res, undefined);
        test();
    });

    it('parse history', function (test) {
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

        assert.deepEqual(room1.history.get('turns').toJSON(), turns);
        test();
    });

    it('test toJSON', function (test) {
        var room1 = game.createNewRoom(2);

        var result = room1.toJSON();
        delete result.id;
        delete result.createDate;
        delete result.playersInfo;

        assert.deepEqual(result, {
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

        test();
    });

});
