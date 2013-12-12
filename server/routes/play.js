var Bot = require('../../public/models/bot.js');
var _ = require('underscore');

module.exports = function (req, res) {

    var gameId = req.params.game;
    var playerId = req.params.player;

    var room = global.game.findRoomById(gameId);

    if (gameId && room) {
        if (room.get('state') === 'bot') {
            var botsCount = room.get('playersCount') - 1;
            _(_.range(botsCount)).each(function (index) {
                var bot = new Bot((index + 1) + '', room.get('playersCount'));
                room.addPlayer(bot);
            });
        }
        var players = room.players.toJSON();
        res.render('room', {
            roomId: room.get('id'),
            players: players,
            playersCount: players.length
        });
    } else if (playerId) {
        room = global.game.findRoomByPlayerId(playerId);
        res.render('play', {
            playerId: playerId,
            playersCount: room ? room.get('playersCount') : 0
        });
    } else {
        res.render('notfound');
    }
};