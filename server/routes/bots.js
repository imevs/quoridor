var Bot = require('../models/bot.js');
var _ = require('underscore');

module.exports = function(req, res) {

    var playersCount = req.params.playersCount;

    var room = global.game.createNewRoom(playersCount);

    var botsCount = playersCount - 1;

    _(_.range(botsCount)).each(function(index){
        var bot = new Bot(room);
        room.addPlayer(bot);
    });

    room.save();

    res.redirect('/play/id/' + room.get('id'));
};