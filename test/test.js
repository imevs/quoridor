var assert = require("assert");
var Backbone = require('backbone');
var Game = require('../server/_game.js');
var Room = require('../server/room.js');


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

            var game = new Game();
            assert.equal(0, game.length);

            game.start(io);
            assert.equal(1, game.length);

            var room1 = game.at(0);
            assert.ok(room1 instanceof Backbone.Model);
            assert.ok(room1.players instanceof Backbone.Collection);
            assert.equal(0, room1.players.length);

            // connect user
            io.sockets.emit('connection', {id: '1'});
            assert.equal(1, room1.players.length);

            io.sockets.emit('connection', {id: '2'});
            assert.equal(2, room1.players.length);

            io.sockets.emit('connection', {id: '3'});
            assert.equal(2, room1.players.length);
            assert.equal(2, game.length);

            var room2 = game.at(1);
            assert.equal(1, room2.players.length);
        });

    })
});