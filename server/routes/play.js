module.exports = function(req, res) {

    var id = req.query.id;

    var room = global.game.findRoomById(id);

    res.render('play', {
        roomId: room.get('id'),
        playersCount: room.get('playersCount')
    });
};