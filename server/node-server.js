var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var exphbs  = require('express3-handlebars');
var Game = require('./game');
var io = require('socket.io');

var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '\\views');
app.engine('handlebars', exphbs({
    //    extname: ".hbs",
    layoutsDir: "server/views/layouts/",
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/test', routes.index);

var server = http.createServer(app);
server.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});

app.use(express.static(path.join(__dirname, '/../public')));


io = io.listen(server);
io.set('log level', 1);
io.set('resource', '/api');

var game = new Game();
game.start(io);