exports.init = function(app) {
    app.get('/', require('./main.js'));
    app.get('/about', function(req, res) {
        res.render('about');
    });
    app.get('/contacts', function(req, res) {
        res.render('contacts');
    });
    app.get('/create/playersCount/:playersCount', require('./create.js'));
    app.get('/play/id/:id', require('./play.js'));
    app.get('/playLocal/playersCount/:playersCount', require('./playLocal.js'));
};