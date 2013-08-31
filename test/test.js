var assert = require("assert");
var Backbone = require('backbone');
var Game = require('../server/game_.js');

var emitter = require('events').EventEmitter;
var io = {
    sockets: new emitter(),
    listen: function() {

    }
};

describe('Game', function() {
    describe('create Game', function(){

        it('First Game create', function(){
            assert.notEqual(false, Game);
            assert.ok(Game.prototype instanceof Backbone.Collection);
            assert.ok(new Game() instanceof Backbone.Collection);
        });

        it('start game', function() {
            var game = new Game();
            assert.equal(0, game.length);

            game.start(io);
            assert.equal(1, game.length);

            var room1 = game.at(0);
            assert.ok(room1 instanceof Backbone.Model);
            assert.ok(room1.players instanceof Backbone.Collection);
            assert.equal(0, room1.players.length);
        });

        it('connect 1 player', function() {
            var game = new Game();
            game.start(io);

            io.sockets.emit('connection', {id: '1'});

            var room1 = game.at(0);
            assert.equal(1, room1.players.length);
        });

        it('connect 2 player', function() {
            var game = new Game();
            game.start(io);

            io.sockets.emit('connection', {id: '1'});
            io.sockets.emit('connection', {id: '2'});

            var room1 = game.at(0);
            assert.equal(2, room1.players.length);
        });

        it('connect 3 player', function() {
            var game = new Game();
            game.start(io);

            io.sockets.emit('connection', {id: '1'});
            io.sockets.emit('connection', {id: '2'});
            io.sockets.emit('connection', {id: '3'});

            var room1 = game.at(0);
            var room2 = game.at(1);

            assert.equal(2, room1.players.length);
            assert.equal(2, game.length);
            assert.equal(1, room2.players.length);
        });

        it('disconnect player from room 1', function() {
            var game = new Game();
            game.start(io);

            io.sockets.emit('connection', {id: '1'});
            io.sockets.emit('disconnect', {id: '1'});

            assert.equal(1, game.length);
            var room1 = game.at(0);
            assert.equal(0, room1.players.length);
        });

        it("find player's room", function() {
            var game = new Game();
            game.start(io);

            io.sockets.emit('connection', {id: '1'});
            io.sockets.emit('connection', {id: '2'});
            io.sockets.emit('connection', {id: '3'});

            assert.equal(game.at(0), game.findPlayerRoom({id: '1'}));
            assert.equal(game.at(1), game.findPlayerRoom({id: '3'}));
        });

        it('disconnect user from room 2', function() {
            var game = new Game();
            game.start(io);

            io.sockets.emit('connection', {id: '1'});
            io.sockets.emit('connection', {id: '2'});
            io.sockets.emit('connection', {id: '3'});

            io.sockets.emit('disconnect', {id: '3'});

            var room2 = game.at(1);
            assert.equal(0, room2.players.length);
        });

        it('findFreeRoom get room 1', function() {
            var game = new Game();
            game.start(io);

            var room1 = game.at(0);
            assert.equal(room1, game.findFreeRoom());
        });

        it('findFreeRoom get room 2', function() {
            var game = new Game();
            game.start(io);

            io.sockets.emit('connection', {id: '1'});
            io.sockets.emit('connection', {id: '2'});
            io.sockets.emit('connection', {id: '3'});
            io.sockets.emit('disconnect', {id: '3'});

            var room2 = game.at(1);
            assert.equal(room2, game.findFreeRoom());
        });

    })
});