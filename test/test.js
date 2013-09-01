var assert = require("assert");
var Backbone = require('backbone');
var Game = require('../server/game_.js');
var sinon = require('sinon');

function extend(Child, Parent) {
    Child.prototype = Parent.prototype;
}

var emitter = require('events').EventEmitter;
var playerSocket = function(id) {
    this.id = id;
};
extend(playerSocket, emitter);

describe('Game', function() {

    var io, game;

    beforeEach(function() {
        io = {
            sockets: new emitter(),
            listen: function() {}
        };
        game = new Game();
        game.start(io);
    });

    describe('create Game', function(){

        it('First Game create', function(){
            assert.notEqual(false, Game);
            assert.ok(Game.prototype instanceof Backbone.Collection);
            assert.ok(game instanceof Backbone.Collection);
            var room1 = game.at(0);
            assert.equal(2, room1.players.length);
        });

        it('start game', function() {
            game = new Game();
            assert.equal(0, game.length);

            game.start(io);
            assert.equal(1, game.length);

            var room1 = game.at(0);
            assert.ok(room1 instanceof Backbone.Model);
            assert.ok(room1.players instanceof Backbone.Collection);
            assert.equal(0, room1.findBusyPlayersPlaces().length);
        });

        it('connect 1 player', function() {
            var p = new playerSocket('1');
            io.sockets.emit('connection', p);

            var room1 = game.at(0);
            assert.equal(1, room1.findBusyPlayersPlaces().length);
        });

        it('connect 2 player', function() {
            io.sockets.emit('connection', new playerSocket('1'));
            io.sockets.emit('connection', new playerSocket('2'));

            var room1 = game.at(0);
            assert.equal(2, room1.findBusyPlayersPlaces().length);
        });

        it('connect 3 player', function() {
            io.sockets.emit('connection', new playerSocket('1'));
            io.sockets.emit('connection', new playerSocket('2'));
            io.sockets.emit('connection', new playerSocket('3'));

            var room1 = game.at(0);
            var room2 = game.at(1);

            assert.equal(2, room1.findBusyPlayersPlaces().length);
            assert.equal(2, game.length);
            assert.equal(1, room2.findBusyPlayersPlaces().length);
        });

        it('disconnect player from room 1', function() {
            var p = new playerSocket('1');
            io.sockets.emit('connection', p);
            p.emit('disconnect', p);

            assert.equal(1, game.length);
            var room1 = game.at(0);
            assert.equal(0, room1.findBusyPlayersPlaces().length);
        });

        it("find player's room", function() {
            io.sockets.emit('connection', new playerSocket('1'));
            io.sockets.emit('connection', new playerSocket('2'));
            io.sockets.emit('connection', new playerSocket('3'));

            assert.equal(game.at(0), game.findPlayerRoom({id: '1'}));
            assert.equal(game.at(1), game.findPlayerRoom({id: '3'}));
        });

        it('disconnect user from room 2', function() {
            var p = new playerSocket('3');

            io.sockets.emit('connection', new playerSocket('1'));
            io.sockets.emit('connection', new playerSocket('2'));
            io.sockets.emit('connection', p);

            p.emit('disconnect', p);

            var room2 = game.at(1);
            assert.equal(0, room2.findBusyPlayersPlaces().length);
        });

        it('findFreeRoom get room 1', function() {
            var room1 = game.at(0);
            assert.equal(room1, game.findFreeRoom());
        });

        it('findFreeRoom get room 2', function() {
            var p = new playerSocket('3');

            io.sockets.emit('connection', new playerSocket('1'));
            io.sockets.emit('connection', new playerSocket('2'));
            io.sockets.emit('connection', p);

            p.emit('disconnect', p);

            var room2 = game.at(1);
            assert.equal(room2, game.findFreeRoom());
        });

        it('test start 1st player', function(done) {
            var p = new playerSocket('1');
            p.on('server_start', function(playerNumber, players) {
                assert.equal(0, playerNumber);
                assert.ok(players[playerNumber].active);
                done();
            });

            io.sockets.emit('connection', p);
        });

        it('test start 2nd player', function(done) {
            var p = new playerSocket('2');
            p.on('server_start', function(playerNumber, players) {
                assert.equal(1, playerNumber);
                assert.ok(players[playerNumber - 1].active);
                assert.ok(!players[playerNumber].active);
                done();
            });

            io.sockets.emit('connection', new playerSocket('1'));
            io.sockets.emit('connection', p);
        });

        it('test start 3rd player', function(done) {
            var p = new playerSocket('3');
            p.on('server_start', function(playerNumber, players) {
                assert.equal(0, playerNumber);
                assert.ok(players[playerNumber].active);
                done();
            });

            io.sockets.emit('connection', new playerSocket('1'));
            io.sockets.emit('connection', new playerSocket('2'));
            io.sockets.emit('connection', p);
        });

        it('move player (check event params)',  function(done) {
            var p1 = new playerSocket('1');
            var p2 = new playerSocket('2');

            io.sockets.emit('connection', p1);
            io.sockets.emit('connection', p2);

            p2.on('server_move_player', function(eventInfo) {
                assert.equal(eventInfo.x, 4);
                assert.equal(eventInfo.y, 1);
                assert.equal(eventInfo.playerIndex, 0);
                done();
            });

            p1.emit('client_move_player', {x: 4,y: 1});
        });

        it('move player (change user position)',  function() {
            var p1 = new playerSocket('1');
            var p2 = new playerSocket('2');

            io.sockets.emit('connection', p1);
            io.sockets.emit('connection', p2);

            p1.emit('client_move_player', {x: 4,y: 1});

            var player = game.findPlayerRoom(p1).findPlayer(p1);
            assert.equal(4, player.get('x'));
            assert.equal(1, player.get('y'));
        });

        it('player can`t move (check that there`s no event)',  function() {
            var spy = sinon.spy();

            var p1 = new playerSocket('1');
            var p2 = new playerSocket('2');

            io.sockets.emit('connection', p1);
            io.sockets.emit('connection', p2);

            p2.on('server_move_player', spy);

            p2.emit('client_move_player', {x: 4, y: 7});
            sinon.assert.notCalled(spy);
        });

        it('player can`t move (check player position)',  function() {
            var spy = sinon.spy();

            var p1 = new playerSocket('1');
            var p2 = new playerSocket('2');

            io.sockets.emit('connection', p1);
            io.sockets.emit('connection', p2);

            p2.emit('client_move_player', {x: 4, y: 7});

            var player1 = game.findPlayerRoom(p1).findPlayer(p1);
            var player2 = game.findPlayerRoom(p1).findPlayer(p2);

            assert.equal(4, player1.get('x'));
            assert.equal(0, player1.get('y'));
            assert.equal(4, player2.get('x'));
            assert.equal(8, player2.get('y'));
        });

        it('player move fence', function(done) {
            var p1 = new playerSocket('1');
            var p2 = new playerSocket('2');

            io.sockets.emit('connection', p1);
            io.sockets.emit('connection', p2);

            p2.on('server_move_fence', function(eventInfo) {
                assert.equal(eventInfo.x, 4);
                assert.equal(eventInfo.y, 7);
                assert.equal(eventInfo.type, 'H');
                assert.equal(eventInfo.playerIndex, 0);
                assert.equal(eventInfo.fencesRemaining, 9);
                done();
            });

            p1.emit('client_move_fence', {x: 4, y: 7, type: 'H'});
        });

        it('player can`t move fence', function() {
            var spy = sinon.spy();

            var p1 = new playerSocket('1');
            var p2 = new playerSocket('2');

            io.sockets.emit('connection', p1);
            io.sockets.emit('connection', p2);

            p1.on('server_move_fence', spy);

            p2.emit('client_move_fence', {x: 4, y: 7, type: 'H'});

            sinon.assert.notCalled(spy);
        });

        it('restore players positions', function() {
            var p1 = new playerSocket('1');
            var p2 = new playerSocket('2');

            io.sockets.emit('connection', p1);
            io.sockets.emit('connection', p2);

            p1.emit('client_move_player', {x: 4, y: 1});

            p1.emit('disconnect', p1);

            var p3 = new playerSocket('3');
            io.sockets.emit('connection', p3);

            var player3 = game.findPlayerRoom(p3).findPlayer(p3);
            assert.equal(4, player3.get('x'));
            assert.equal(1, player3.get('y'));
            assert.equal(3, player3.get('id'));
            assert.ok(!player3.get('active'));
        });

        // валидация координат на сервере

    })
});