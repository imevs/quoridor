module.exports = function (req, res) {
    var games = [];
    global.game.each(function (room) {
        if (room.isFull() || room.isOver())  {
            return;
        }
        var game = room.toJSON();
        game.players = [];
        room.findBusyPlayersPlaces().forEach(function (player) {
            game.players.push(player.toJSON());
        });
        game.isNotBusy = game.players.length !== game.playersCount;
        games.push(game);
    });
    res.render('index', {
        games: games
    });
};