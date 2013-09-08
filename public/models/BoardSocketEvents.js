/**
 * add to standard io.connect function extra params
 */
window.io && (io.myconnect = function(host, options, your_info){
    var socket = io.connect.apply(this, [host, options]);
    socket.on('connect', function(){
        socket.emit('myconnection', your_info);
    });
    return socket;
});
window.io && io.util.inherit(io.myconnect, io.connect);

var BoardSocketEvents = {

    initSocket: function() {
        var host = 'http://localhost:3000';
        return this.get('socket') || window.io && this.set('socket', io.myconnect(host, {
            resource: 'api'
        }, {
            roomId: this.get('roomId')
        }));
    },

    socketEvents: function() {
        this.initSocket();

        var socket = this.get('socket');
        if (!socket) return;

        this.on('confirmturn', this.onTurnSendSocketEvent);

        socket.on('server_move_fence', _(this.onSocketMoveFence).bind(this));
        socket.on('server_move_player', _(this.onSocketMovePlayer).bind(this));
        socket.on('server_start', _(this.onStart).bind(this));
    },
    onTurnSendSocketEvent: function() {
        if (!this.isPlayerMoved && !this.isFenceMoved) return;

        var socket = this.get('socket'), eventInfo = {};

        var currentPlayer = this.players.getCurrentPlayer();

        if (this.isPlayerMoved) {
            eventInfo = currentPlayer.pick('x', 'y');
            eventInfo.playerIndex = this.players.currentPlayer;

            socket.emit('client_move_player', eventInfo);
        }

        if (this.isFenceMoved) {
            eventInfo = this.fences.getMovedFence().pick('x', 'y', 'type');
            eventInfo.playerIndex = this.players.currentPlayer;
            eventInfo.fencesRemaining = currentPlayer.get('fencesRemaining');

            socket.emit('client_move_fence', eventInfo);
        }
    },
    onSocketMoveFence: function(pos) {
        pos = {
            type: pos.type,
            x: pos.x,
            y: pos.y
        };
        var fence = this.fences.findWhere(pos);
        this.auto = true;
        fence.trigger('selected', fence);
        this.auto = false;
        this.trigger('maketurn');
    },
    onSocketMovePlayer: function(pos) {
        this.auto = true;
        this.fields.trigger('moveplayer', pos.x, pos.y);
        this.auto = false;
        this.trigger('maketurn');
    },
    onStart: function(playerNumber, players, fences) {
        var me = this;

        _(players).each(function(playerInfo, i) {
            var player = me.players.at(i);
            if (playerInfo.x && playerInfo.y) {
                player.set({
                    x: playerInfo.x,
                    prev_x: playerInfo.x,
                    y: playerInfo.y,
                    prev_y: playerInfo.y
                });
            }
            var fencesRemaining = playerInfo.fencesRemaining;
            fencesRemaining && player.set('fencesRemaining', fencesRemaining);
        });
        _(fences).each(function(fencePos) {
            fencePos = {
                x: fencePos.x,
                y: fencePos.y,
                type: fencePos.type
            };
            var fence = me.fences.findWhere(fencePos);
            fence.trigger('movefence');
            me.fences.getSibling(fence).trigger('movefence');
        });
        me.fences.setBusy();

        _(players).each(function(player, i) {
            player.active && me.run(i, playerNumber);
        });
    }
};