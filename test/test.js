var assert = require("assert");
var Backbone = require('backbone');
var Game = require('../server/game_.js');

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
            assert.ok(new Game() instanceof Backbone.Collection);
        });

        it('start game', function() {
            game = new Game();
            assert.equal(0, game.length);

            game.start(io);
            assert.equal(1, game.length);

            var room1 = game.at(0);
            assert.ok(room1 instanceof Backbone.Model);
            assert.ok(room1.players instanceof Backbone.Collection);
            assert.equal(0, room1.players.length);
        });

        it('connect 1 player', function() {
            var p = new playerSocket('1');
            io.sockets.emit('connection', p);

            var room1 = game.at(0);
            assert.equal(1, room1.players.length);
        });

        it('connect 2 player', function() {
            io.sockets.emit('connection', new playerSocket('1'));
            io.sockets.emit('connection', new playerSocket('2'));

            var room1 = game.at(0);
            assert.equal(2, room1.players.length);
        });

        it('connect 3 player', function() {
            io.sockets.emit('connection', new playerSocket('1'));
            io.sockets.emit('connection', new playerSocket('2'));
            io.sockets.emit('connection', new playerSocket('3'));

            var room1 = game.at(0);
            var room2 = game.at(1);

            assert.equal(2, room1.players.length);
            assert.equal(2, game.length);
            assert.equal(1, room2.players.length);
        });

        it('disconnect player from room 1', function() {
            var p = new playerSocket('1');
            io.sockets.emit('connection', p);
            p.emit('disconnect', p);

            assert.equal(1, game.length);
            var room1 = game.at(0);
            assert.equal(0, room1.players.length);
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
            assert.equal(0, room2.players.length);
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
            p.on('server_start', function(playerNumber) {
                assert.equal(1, playerNumber);
                done();
            });

            io.sockets.emit('connection', p);
        });

        it('test start 2nd player', function(done) {
            var p = new playerSocket('2');
            p.on('server_start', function(playerNumber) {
                assert.equal(2, playerNumber);
                done();
            });

            io.sockets.emit('connection', new playerSocket('1'));
            io.sockets.emit('connection', p);
        });

        it('test start 3rd player', function(done) {
            var p = new playerSocket('3');
            p.on('server_start', function(playerNumber) {
                assert.equal(1, playerNumber);
                done();
            });

            io.sockets.emit('connection', new playerSocket('1'));
            io.sockets.emit('connection', new playerSocket('2'));
            io.sockets.emit('connection', p);
        });

    })
});