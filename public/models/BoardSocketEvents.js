var BoardSocketEvents = {

    initSocket: function() {
        var host = 'http://localhost:3000';
        return this.get('socket') || window.io && this.set('socket', io.connect(host, {resource: 'api'}));
    },

    socketEvents: function() {
        this.initSocket();

        var socket = this.get('socket');
        if (!socket) return;
        socket.on('turn', _(this.onTurn).bind(this));
        socket.on('start', _(this.onStart).bind(this));
    },
    onTurnSendSocketEvent: function() {
        if (!this.isPlayerMoved && !this.isFenceMoved) return;

        var socket = this.get('socket'), eventInfo = {};

        if (this.isPlayerMoved) {
            var currentPlayer = this.players.getCurrentPlayer();
            eventInfo = currentPlayer.pick('x', 'y');
            eventInfo.playerIndex = this.players.currentPlayer;
            eventInfo.eventType = 'player';
        }

        if (this.isFenceMoved) {
            eventInfo = this.fences.getMovedFence().pick('x', 'y', 'type');
            eventInfo.eventType = 'fence';
        }

        socket && socket.emit('turn', eventInfo);
    },
    onTurn: function(pos) {
        this.auto = true;
        if (pos.eventType == 'player') {
            this.fields.trigger('moveplayer', pos.x, pos.y);
        }
        if (pos.eventType == 'fence') {
            delete pos.eventType;
            var fence = this.fences.findWhere(pos);
            fence.trigger('selected', fence);
        }
        this.auto = false;
        var isEcho = false;
        this.trigger('turn', isEcho);
    },
    onStart: function(playerNumber, players, fences) {
        var me = this;

        _(players).each(function(player, i) {
            if (player.x && player.y) {
                me.players.at(i - 1).moveTo(player.x, player.y);
            }
        });
        _(fences).each(function(fencePos) {
            fencePos = {
                x: fencePos.x,
                y: fencePos.y,
                type: fencePos.type
            };
            var fence = me.fences.findWhere(fencePos);
            fence.trigger('markasselected');
            me.fences.getSibling(fence).trigger('markasselected');
        });
        me.fences.setBusy();

        this.set('playerNumber', playerNumber - 1);

        me.run(playerNumber);
        _(players).each(function(player, i) {
            player.isCurrent && me.run(i);
        });
    }
};