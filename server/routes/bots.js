var Bot = require('../models/bot.js');
var _ = require('underscore');

module.exports = function(req, res) {

    var playersCount = req.params.playersCount;

    var room = global.game.createNewRoom(playersCount);
    room.set('state', 'bot');
    var botsCount = playersCount - 1;

    room.save({}, {
        success: function() {
            _(_.range(botsCount)).each(function(index){
                var bot = new Bot((index + 1) + '', playersCount);
                room.addPlayer(bot);
            });
            res.redirect('/play/id/' + room.get('id'));
        }
    });
};