var Bot = require('../models/bot.js');
var _ = require('underscore');

module.exports = function(req, res) {

    var id = req.params.id;

    var room = global.game.findRoomById(id);

    if (room) {
        if (room.get('state') == 'bot') {
            var botsCount = room.get('playersCount') - 1;
            _(_.range(botsCount)).each(function(index){
                var bot = new Bot((index + 1) + '', room.get('playersCount'));
                room.addPlayer(bot);
            });
        }

        res.render('play', {
            roomId: room.get('id'),
            playersCount: room.get('playersCount')
        });
    } else {
        res.render('notfound');
    }
};