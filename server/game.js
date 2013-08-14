var io = require('socket.io');

var player = function(socket) {
    this.socket = socket;


};

var game = {
    fencesH: [],
    fencesV: [],
    players: {
        1: {
            key: 'empty'
        },
        2: {
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
    onTurn: function (eventInfo) {
        if (eventInfo.eventType == 'player') {
            var player = this.players[eventInfo.playerIndex + 1];
            var nextIndex = (eventInfo.playerIndex + 2);
            nextIndex = nextIndex > this.getPlayersCount() ? 1 : nextIndex;
            var nextPlayer = this.players[nextIndex];

            player.x = eventInfo.x;
            player.y = eventInfo.y;

            for (var i in this.players) {
                this.players[i].isCurrent = false;
            }

            nextPlayer.isCurrent = true;
        }
        io.sockets.emit('turn', eventInfo);
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

            socket.on('turn', self.onTurn.bind(self));

            console.log('%s: %s - connected', socket.id.toString(),
                socket.handshake.address.address);

            var playerNumber = game.addPlayer(socket.id.toString());
            var player = self.players[playerNumber];
            playerNumber && socket.emit('start', playerNumber, self.players);
        });
    }
};

module.exports = game;