/**
 * add to standard io.connect function extra params
 */
if (window.io) {
    io.myconnect = function (host, options, your_info) {
        var socket = io.connect.apply(this, [host, options]);
        socket.on('connect', function () {
            socket.emit('myconnection', your_info);
        });
        return socket;
    };
    io.util.inherit(io.myconnect, io.connect);
}

window.BoardSocketEvents = {

    initSocket: function () {
        var host = 'http://' + document.location.host;
        return this.get('socket') || window.io && this.set('socket', io.myconnect(host, {
            resource: 'api'
        }, {
            playerId: this.get('playerId'),
            roomId: this.get('roomId')
        }));
    },

    socketEvents: function () {
        this.initSocket();

        var socket = this.get('socket');
        if (!socket) {
            return;
        }

        this.on('confirmturn', this.onTurnSendSocketEvent);

        socket.on('server_move_fence', _(this.onSocketMoveFence).bind(this));
        socket.on('server_move_player', _(this.onSocketMovePlayer).bind(this));
        socket.on('server_start', _(this.onStart).bind(this));
        socket.on('server_win', _(this.onWin).bind(this));
    },
    onWin: function (playerNumber) {
        alert('Игрок номер ' + (playerNumber + 1) + ' выиграл, ' +
            'вы можете создать новую игру или выбрать из списка');
        document.location = '/';
    },
    onTurnSendSocketEvent: function () {
        if (!this.isPlayerMoved && !this.isFenceMoved) {
            return;
        }

        var socket = this.get('socket'), eventInfo = {};

        var activePlayer = this.getActivePlayer();

        if (this.isPlayerMoved) {
            eventInfo = activePlayer.pick('x', 'y');
            socket.emit('client_move_player', eventInfo);
        }

        if (this.isFenceMoved) {
            eventInfo = this.fences.getMovedFence().pick('x', 'y', 'type');
            socket.emit('client_move_fence', eventInfo);
        }
    },
    onSocketMoveFence: function (pos) {
        pos = {
            type: pos.type,
            x   : pos.x,
            y   : pos.y
        };
        var fence = this.fences.findWhere(pos);
        if (!fence) {
            return false;
        }
        this.auto = true;
        /** TODO: refactor fence events to board event */
        fence.trigger('selected', fence);
        this.auto = false;
        this.trigger('maketurn');
    },
    onSocketMovePlayer: function (pos) {
        if (pos.timeout) {
            this.isPlayerMoved = true;
        }
        this.auto = true;
        this.fields.trigger('moveplayer', pos.x, pos.y);
        this.auto = false;
        this.trigger('maketurn');
    },
    onStart: function (currentPlayer, activePlayer, history) {
        if (currentPlayer === 'error') {
            alert('Game is busy');
            return;
        }
        var me = this;
        me.history.get('turns').reset(history);

        var players = me.history.getPlayerPositions(),
            fences = me.history.getFencesPositions();

        _(players).each(function (playerInfo, i) {
            var player = me.players.at(i);
            if (!_.isUndefined(playerInfo.x) && !_.isUndefined(playerInfo.y)) {
                player.set({
                    x     : playerInfo.x,
                    prev_x: playerInfo.x,
                    y     : playerInfo.y,
                    prev_y: playerInfo.y,
                    fencesRemaining: player.get('fencesRemaining') - playerInfo.movedFences
                });
            }
        });
        _(fences).each(function (fencePos) {
            var fence = me.fences.findWhere({
                x   : fencePos.x,
                y   : fencePos.y,
                type: fencePos.t
            });
            fence.trigger('movefence');
            me.fences.getSibling(fence).trigger('movefence');
        });
        me.fences.setBusy();
        me.run(activePlayer, currentPlayer);
    }
};