module.exports = function(req, res) {

    var playersCount = req.params.playersCount;

    var room = global.game.createNewRoom(playersCount);
    room.save();

    res.redirect('/play/id/' + room.get('id'));
};