exports.create = function(req, res) {

    var playersCount = req.query.playersCount;

    var room = global.game.createNewRoom(playersCount);
    room.save();

    res.redirect('/play?id=' + room.get('id'));
};