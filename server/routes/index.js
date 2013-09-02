var index = function(req, res){
    var games = [];
    global.game.each(function(room) {
        var game = room.toJSON();
        game.players = [];
        room.findBusyPlayersPlaces().forEach(function(player) {
            game.players.push(player.toJSON());
        });
        games.push(game);
    });
    res.render('index', {
      games: games
  });
};

exports.index = {
    index : index,
    create: require('./create.js').create,
    play  : require('./play.js').play
};