var io = require('socket.io');

var player = function(socket) {
    this.socket = socket;
};

var game = {
    fences: [],
    players: {
        1: {
            key: 'empty',
            fencesRemaining: 10,
            isActive: true
        },
        2: {
            fencesRemaining: 10,
            key: 'empty'
        }
    },
    getPlayersCount: function() {
        return 2;
    },
    addPlayer: function(address) {
        for (var i in this.players) {
            if (this.players[i].key == 'empty') {
                this.players[i].key = address;
                return i;
            }
        }
        return null;
    },
    findPlayer: function() {

    },
    removePlayer: function(address) {
        for (var i in this.players) {
            if (this.players[i].key == address) {
                this.players[i].key = 'empty';
            }
        }
    },
    makeTurn: function(playerIndex) {
        var player = this.players[playerIndex];

        var nextIndex = playerIndex + 1;
        nextIndex = nextIndex > this.getPlayersCount() ? 1 : nextIndex;
        var nextPlayer = this.players[nextIndex];

        for (var i in this.players) {
            this.players[i].isActive = false;
        }
        nextPlayer.isActive = true;
    },
    onMoveFence: function (eventInfo) {
        var player = this.players[eventInfo.playerIndex + 1];
        player.fencesRemaining--;
        this.fences.push(eventInfo);

        this.makeTurn(eventInfo.playerIndex + 1);

        io.sockets.emit('server_move_fence', eventInfo);
    },
    onMovePlayer: function (eventInfo) {
        var player = this.players[eventInfo.playerIndex + 1];
        player.x = eventInfo.x;
        player.y = eventInfo.y;
        this.makeTurn(eventInfo.playerIndex + 1);

        io.sockets.emit('server_move_player', eventInfo);
    },
    onDisconnect: function (socket) {
        console.log('%s: %s - disconnected', socket.id.toString(),
            socket.handshake.address.address);
        game.removePlayer(socket.id.toString());
    },
    start: function(server) {
        var self = this;
        io = io.listen(server);
        io.set('log level', 1);
        io.set('resource', '/api');

        io.sockets.on('connection', function (socket) {
            socket.on('disconnect', self.onDisconnect.bind(self, socket));

            socket.on('client_move_player', self.onMovePlayer.bind(self));
            socket.on('client_move_fence', self.onMoveFence.bind(self));

            console.log('%s: %s - connected', socket.id.toString(),
                socket.handshake.address.address);

            var playerNumber = game.addPlayer(socket.id.toString());
            playerNumber && socket.emit('server_start', playerNumber,
                self.players, self.fences);
        });
    }
};

module.exports = game;