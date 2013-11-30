module.exports = function (req, res) {

    var playersCount = req.params.playersCount;

    var playerTypes = ['bot', 'bot', 'bot', 'bot'];
    var room = global.game.createNewRoom(playersCount, playerTypes);

    room.save({}, {
        success: function () {
            res.redirect('/play/game/' +
                room.get('id'));
        }
    });
};