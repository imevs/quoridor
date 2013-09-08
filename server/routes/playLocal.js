module.exports = function(req, res) {

    var playersCount = req.query.playersCount;

    res.render('play', {
        playersCount: playersCount
    });
};