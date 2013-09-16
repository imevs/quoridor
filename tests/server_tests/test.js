var assert = require("assert");
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

describe('Game', function () {

    var io, game;

    beforeEach(function () {
        io = {
            sockets: new emitter(),
            listen : function () {
            }
        };
        game = new Game();
        game.start(io);
    });

    describe('create Game', function () {

        it('create game', function () {
            assert.equal(0, game.length);
        });

        it('create room', function () {
            var room = game.createNewRoom(2);
            assert.equal(1, game.length);
            assert.equal(0, room.findBusyPlayersPlaces().length);
        });

        it('connect 1 player', function () {
            var room = game.createNewRoom(2);

            var p = new playerSocket('1');
            io.sockets.emit('connection', p);
            p.emit('myconnection', {roomId: room.get('id')});

            var room1 = game.at(0);
            assert.equal(1, room1.findBusyPlayersPlaces().length);
            assert.ok(!room1.isFull());
        });


        it('connect 2 player', function () {
            var room = game.createNewRoom(2);

            var p1 = new playerSocket('1');
            io.sockets.emit('connection', p1);
            p1.emit('myconnection', {roomId: room.get('id')});

            var p2 = new playerSocket('2');
            io.sockets.emit('connection', p2);
            p2.emit('myconnection', {roomId: room.get('id')});

            var room1 = game.at(0);
            assert.equal(2, room1.findBusyPlayersPlaces().length);
            assert.ok(room1.isFull());
        });

        it('connect 1 player two times', function () {
            var room = game.createNewRoom(2);

            var p1 = new playerSocket('1');
            io.sockets.emit('connection', p1);
            p1.emit('myconnection', {roomId: room.get('id')});

            var p2 = new playerSocket('1');
            io.sockets.emit('connection', p2);
            p2.emit('myconnection', {roomId: room.get('id')});

            var room1 = game.at(0);
            assert.equal(1, room1.findBusyPlayersPlaces().length);
            assert.ok(!room1.isFull());
        });

        it('connect 3 player', function () {
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
            assert.equal(2, room1.findBusyPlayersPlaces().length);
            assert.ok(room1.isFull());
        });

        it('disconnect player from room 1', function () {
            var room = game.createNewRoom(2);

            var p = new playerSocket('1');
            io.sockets.emit('connection', p);
            p.emit('myconnection', {roomId: room.get('id')});
            p.emit('disconnect', p);

            var room1 = game.at(0);
            assert.equal(0, room1.findBusyPlayersPlaces().length);
        });

        it("find player's room", function () {
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

            assert.equal(game.at(0), game.findPlayerRoom({id: '1'}));
            assert.equal(game.at(1), game.findPlayerRoom({id: '3'}));
        });

        it('findFreeRoom get room 1', function () {
            var room1 = game.createNewRoom(2);
            var room2 = game.createNewRoom(2);
            assert.equal(room1, game.findFreeRoom(room1.get('id')));
            assert.equal(room2, game.findFreeRoom(room2.get('id')));
        });

        it('findFreeRoom get room 2', function () {
            var room1 = game.createNewRoom(2);
            var room2 = game.createNewRoom(2);

            var p1 = new playerSocket('1');
            io.sockets.emit('connection', p1);
            p1.emit('myconnection', {roomId: room1.get('id')});

            var p2 = new playerSocket('2');
            io.sockets.emit('connection', p2);
            p2.emit('myconnection', {roomId: room1.get('id')});

            assert.notEqual(room1, game.findFreeRoom(room1.get('id')));
            assert.equal(room2, game.findFreeRoom(room2.get('id')));
        });

        it('test start 1st player', function (done) {
            var room1 = game.createNewRoom(2);

            var p = new playerSocket('1');
            io.sockets.emit('connection', p);

            p.on('server_start', function (currentPlayer, activePlayer, players) {
                assert.equal(0, currentPlayer);
                assert.equal(0, activePlayer);
                assert.equal(2, players.length);
                done();
            });
            p.emit('myconnection', {roomId: room1.get('id')});
        });

        it('test start 2nd player', function (done) {
            var room1 = game.createNewRoom(2);

            var p1 = new playerSocket('1');
            io.sockets.emit('connection', p1);

            var p2 = new playerSocket('2');
            io.sockets.emit('connection', p2);

            p2.on('server_start', function (currentPlayer, activePlayer, players) {
                assert.equal(1, currentPlayer);
                assert.equal(0, activePlayer);
                done();
            });
            p1.emit('myconnection', {roomId: room1.get('id')});
            p2.emit('myconnection', {roomId: room1.get('id')});
        });

        it('test start 3rd player in 2nd room', function (done) {
            var room1 = game.createNewRoom(2);
            var room2 = game.createNewRoom(2);

            var p1 = new playerSocket('1');
            io.sockets.emit('connection', p1);

            var p2 = new playerSocket('2');
            io.sockets.emit('connection', p2);

            var p3 = new playerSocket('3');
            io.sockets.emit('connection', p3);

            p3.on('server_start', function (currentPlayer, activePlayer, players, fences) {
                assert.equal(0, currentPlayer);
                assert.equal(0, activePlayer);
                assert.equal(0, fences.length);
                done();
            });

            p1.emit('myconnection', {roomId: room1.get('id')});
            p2.emit('myconnection', {roomId: room1.get('id')});
            p3.emit('myconnection', {roomId: room2.get('id')});
        });

        it('move player (check event params)', function (done) {
            var room1 = game.createNewRoom(2);

            var p1 = new playerSocket('1');
            io.sockets.emit('connection', p1);
            p1.emit('myconnection', {roomId: room1.get('id')});

            var p2 = new playerSocket('2');
            io.sockets.emit('connection', p2);
            p2.emit('myconnection', {roomId: room1.get('id')});

            p1.on('server_move_player', function (eventInfo) {
                assert.equal(eventInfo.x, 4);
                assert.equal(eventInfo.y, 1);
                assert.equal(eventInfo.playerIndex, 0);
                done();
            });

            p1.emit('client_move_player', {x: 4, y: 1});
        });


        it('move player (change user position)', function () {
            var room1 = game.createNewRoom(2);

            var p1 = new playerSocket('1');
            io.sockets.emit('connection', p1);
            p1.emit('myconnection', {roomId: room1.get('id')});

            var p2 = new playerSocket('2');
            io.sockets.emit('connection', p2);
            p2.emit('myconnection', {roomId: room1.get('id')});

            p1.emit('client_move_player', {x: 4, y: 1});

            var player = game.findPlayerRoom(p1).findPlayer(p1);
            assert.equal(4, player.get('x'));
            assert.equal(1, player.get('y'));
        });

        it('player can`t move (check that there`s no event)', function () {
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
        });

        it('player can`t move (check player position)', function () {
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

            assert.equal(4, player1.get('x'));
            assert.equal(0, player1.get('y'));
            assert.equal(4, player2.get('x'));
            assert.equal(8, player2.get('y'));
        });

        it('player move fence', function (done) {
            var room1 = game.createNewRoom(2);

            var p1 = new playerSocket('1');
            io.sockets.emit('connection', p1);
            p1.emit('myconnection', {roomId: room1.get('id')});

            var p2 = new playerSocket('2');
            io.sockets.emit('connection', p2);
            p2.emit('myconnection', {roomId: room1.get('id')});

            p2.on('server_move_fence', function (eventInfo) {
                assert.equal(eventInfo.x, 4);
                assert.equal(eventInfo.y, 7);
                assert.equal(eventInfo.type, 'H');
                assert.equal(eventInfo.playerIndex, 0);
                assert.equal(eventInfo.fencesRemaining, 9);
                done();
            });

            p1.emit('client_move_fence', {x: 4, y: 7, type: 'H'});
        });

        it('player can`t move fence', function () {
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
        });

        it('restore players positions', function (done) {
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
                assert.equal(0, currentPlayer);
                assert.deepEqual({
                    x              : 4,
                    y              : 1,
                    fencesRemaining: 10
                }, players[currentPlayer]);

                done();
            });
            p3.emit('myconnection', {roomId: room1.get('id')});
        });

        it('restore fences positions', function (done) {
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
                assert.equal(0, currentPlayer);
                assert.equal(1, activePlayer);
                assert.deepEqual([
                    {
                        x   : 4,
                        y   : 1,
                        type: 'H'
                    }
                ], fences);

                done();
            });
            p3.emit('myconnection', {roomId: room1.get('id')});
        });

        it('player can`t move (invalid position)', function () {
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
        });

        it('fence can`t move (invalid position)', function () {
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
        });

        it('fence can`t move (position is busy)', function () {
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
        });

    })
});