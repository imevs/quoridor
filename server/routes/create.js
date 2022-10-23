module.exports = function (req, res) {

    var playersCount = req.params.playersCount;

    var playersParams = [];

    for (var i = 0; i < playersCount; i++) {
        var type = req.body['playerType' + i];
        if (type) {
            playersParams.push(type);
        }
    }

    var room = global.game.createNewRoom(playersCount, playersParams);
    res.redirect('/play/game/' + room.get('id'));
};