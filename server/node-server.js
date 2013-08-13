var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var exphbs  = require('express3-handlebars');
var io = require('socket.io');

var app = express();

app.set('port', process.env.PORT || 3000);
var viewsPath = __dirname + '\\views';
console.log(viewsPath);
app.set('views', viewsPath );
app.engine('handlebars', exphbs({
    layoutsDir: "server/views/layouts/",
   //    extname: ".hbs",
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
io = io.listen(server);
io.set('log level', 1);
io.set('resource', '/api');

app.use(express.static(path.join(__dirname, '/../public')));

var gamers = [];
setInterval(function() {
    io.sockets.emit('stats', [
        'Сейчас игроков: ' + gamers.length
    ]);
}, 5000);

io.sockets.on('connection', function (socket) {
    console.log('%s: %s - connected', socket.id.toString(), socket.handshake.address.address);
    gamers.push(socket.handshake.address.address);
    socket.on('disconnect', function () {
        console.log('%s: %s - disconnected', socket.id.toString(), socket.handshake.address.address);
        gamers.splice(gamers.indexOf(socket.handshake.address.address), 1);
    });

    socket.on('turn', function (eventInfo) {
        io.sockets.emit('turn', eventInfo);
    });
});

