module.exports = function (req, res) {

    var playersCount = req.params.playersCount;

    var items = [];

    for (var i = 0; i < playersCount; i++) {
        items.push(i);
    }

    res.render('new', {
        players: items
    });
};