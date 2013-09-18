exports.init = function(app) {
    app.get('/', require('./main.js'));
    app.get('/create/playersCount/:playersCount', require('./create.js'));
    app.get('/play/id/:id', require('./play.js'));
    app.get('/playLocal/playersCount/:playersCount', require('./playLocal.js'));
};