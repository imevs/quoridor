exports.init = function (app) {
    app.get('/', require('./main.js'));
    app.get('/about', function (req, res) {
        res.render('about');
    });
    app.get('/contacts', function (req, res) {
        res.render('contacts');
    });
    app.get('/create/playersCount/:playersCount', require('./create.js'));
    app.post('/create/playersCount/:playersCount', require('./create.js'));
    app.get('/new/playersCount/:playersCount', require('./new.js'));
    app.get('/createGameWithBots/playersCount/:playersCount', require('./bots.js'));
    app.get('/play/game/:game', require('./play.js'));
    app.get('/play/player/:player', require('./play.js'));
    app.get('/playLocal/playersCount/:playersCount', require('./playLocal.js'));
};