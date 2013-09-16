var index = function(req, res){
    var games = [];
    global.game.each(function(room) {
        var game = room.toJSON();
        game.players = [];
        room.findBusyPlayersPlaces().forEach(function(player) {
            game.players.push(player.toJSON());
        });
        game.isNotBusy = game.players.length != game.playersCount;
        games.push(game);
    });
    res.render('index', {
      games: games
  });
};

exports.init = function(app) {
    app.get('/', index);
    app.get('/create/playersCount/:playersCount', require('./create.js'));
    app.get('/play/id/:id', require('./play.js'));
    app.get('/playLocal/playersCount/:playersCount', require('./playLocal.js'));
};