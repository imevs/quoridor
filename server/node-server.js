var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var exphbs  = require('express3-handlebars');
var Backbone = require('./backbone.mongoose');
var Game = require('./models/game');
var io = require('socket.io');

var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.engine('handlebars', exphbs({
    //    extname: ".hbs",
    layoutsDir: 'server/views/layouts/',
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');
app.use(express.favicon());
//app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
if ('development' === app.get('env')) {
    app.use(express.static(path.join(__dirname, '/../public')));
}
if ('production' === app.get('env')) {
    app.use(express.static(path.join(__dirname, '/../build')));
}

app.use(function (err, req, res) {
    res.status(err.status || 500);
    console.log('Internal error(%d): %s', res.statusCode, err.message);
    res.send({ error: err.message });
});
// development only
if ('development' === app.get('env')) {
    app.use(express.errorHandler());
}

routes.init(app);

var server = http.createServer(app);
server.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

Backbone.initSync({
    db_url: 'mongodb://imevs:' + process.env.DB_PASS + '@ds043368.mongolab.com:43368/quoridor',
    schema_dir: __dirname + '/schema'
});

io = io.listen(server);
io.set('log level', 1);
io.set('resource', '/api');

var game = global.game = new Game();
game.start(io);