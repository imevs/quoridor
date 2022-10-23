var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var exphbs  = require('express-handlebars');
var Game = require('./models/game');
var io = require('socket.io');
var bodyParser = require('body-parser');
var static = require('serve-static');
var favicon = require('serve-favicon');
var methodOverride = require('method-override');
var errorHandler = require('express-error-handler');

var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.engine('handlebars', exphbs({
    layoutsDir: 'server/views/layouts/',
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');
app.use(favicon(path.join(__dirname, '../public/img', 'favicon.ico')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride());

if ('development' === app.get('env')) {
    app.use(static(path.join(__dirname, '/../public')));
}
if ('production' === app.get('env')) {
    app.use(static(path.join(__dirname, '/../build')));
}

// development only
if ('development' === app.get('env')) {
    app.use(errorHandler());
}

routes.init(app);

var server = http.createServer(app);
server.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

io = io.listen(server);
io.set('log level', 1);
io.set('resource', '/api');

var game = global.game = new Game();
game.start(io);