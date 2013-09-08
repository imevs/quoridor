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

exports.init = function(app) {
    app.get('/', index);
    app.get('/create', require('./create.js'));
    app.get('/play', require('./play.js'));
    app.get('/playLocal', require('./playLocal.js'));
};