module.exports = function(req, res) {

    var playersCount = req.params.playersCount;

    res.render('play', {
        playersCount: playersCount
    });
};