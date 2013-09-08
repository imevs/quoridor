module.exports = function(req, res) {

    var id = req.query.id;

    var room = global.game.findFreeRoom(id);

    if (room) {
        res.render('play', {
            roomId: room.get('id'),
            playersCount: room.get('playersCount')
        });
    } else {
        res.render('notfound');
    }

};