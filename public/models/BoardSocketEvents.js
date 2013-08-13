var BoardSocketEvents = {
    socketEvents: function() {
        var me = this;
        //this.get('socket').on('stats', this.onStat);
        this.get('socket') && this.get('socket').on('turn', _(this.onTurn).bind(this));
    },
    onTurnSendSocketEvent: function() {
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
    onStat: function(arr) {
        console.log(arr);
    },
    onTurn: function(pos) {
        if (pos.eventType == 'player') {
            this.fields.trigger('moveplayer', pos.x, pos.y);
        }
        if (pos.eventType == 'fence') {
            delete pos.eventType;
            var fence = this.fences.findWhere(pos);
            fence.trigger('selected', fence);
        }
        var isEcho = true;
        this.trigger('turn', isEcho);
    }
};