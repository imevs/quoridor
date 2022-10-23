module.exports = function (req, res) {

    var playersCount = req.params.playersCount;

    var playerTypes = ['smartbot', 'smartbot', 'smartbot', 'smartbot'];
    var room = global.game.createNewRoom(playersCount, playerTypes);
    res.redirect('/play/game/' + room.get('id'));
};
