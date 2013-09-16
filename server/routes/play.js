module.exports = function(req, res) {

    var id = req.params.id;

    var room = global.game.findRoomById(id);

    if (room) {
        res.render('play', {
            roomId: room.get('id'),
            playersCount: room.get('playersCount')
        });
    } else {
        res.render('notfound');
    }
};