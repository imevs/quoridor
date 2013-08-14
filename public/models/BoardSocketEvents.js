var BoardSocketEvents = {

    initSocket: function() {
        return this.get('socket') || window.io && this.set('socket', io.connect('http://localhost:3000', {resource: 'api'}));
    },

    socketEvents: function() {
        var socket = this.get('socket');
        if (!socket) return;
        //this.get('socket').on('stats', this.onStat);
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
    onStat: function(arr) {
        console.log(arr);
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
    onStart: function(playerNumber) {
        this.run(playerNumber);
    }
};
