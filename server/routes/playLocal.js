module.exports = function (req, res) {

    var playersCount = req.params.playersCount;
    var botsCount = req.params.bots;

    res.render('play', {
        playersCount: playersCount,
        botsCount: botsCount
    });
};