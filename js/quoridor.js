var Quoridor = function () {
    this.boardDimension = 9;
    this.startingFences = 10;
    this.players = [];
    this.currentTurn = null;
};

Quoridor.prototype = {
    constructor: Quoridor,
    init: function (board, info, players) {
        var me = this, $board = $(board), j;
        me.players = players;
        me.information = info;

        for (var i = 0; i < me.boardDimension; i++) {

            if (i != 0) {
                for (j = 0; j < me.boardDimension; j++) {
                    var horizontalFence = $('<div class="fence horizontal" />');
                    if (j == 0) {
                        horizontalFence.addClass('left');
                    }
                    if (j == 8) {
                        horizontalFence.addClass('right');
                    }
                    $board.append(horizontalFence);
                }
            }
            for (j = 0; j < me.boardDimension; j++) {
                var squareNumber = (i * me.boardDimension) + j;
                var square = $('<div id="square_' + squareNumber + '" class="square" />');
                if (j != 0) {
                    var fence = $('<div class="fence" />');
                    $board.append(fence);
                }
                $board.append(square);
            }
        }
        me.initPlayers(players);
        me.bindSquareEventHandlers();
        me.bindFenceEventHandlers();
        me.updateInformation();
        $board.after(me.information.getPanel());
    },

    bindFenceEventHandlers: function () {
        var $fence = $('.fence'), me = this;
        $fence.each(function (i, v) {
            $(v).attr('id', 'fence_' + i);
        });
        $fence.hover(function () {
            $(this).addClass('selected');
            me.getAdjacentFence(this).addClass('selected');
        }, function () {
            $(this).removeClass('selected');
            me.getAdjacentFence(this).removeClass('selected');
        });
        $fence.click(function () {
            me.placeFence(this);
        });
    },

    bindSquareEventHandlers: function () {
        var me = this;
        $('.square').click(function () {
            var newPosition = parseInt($(this).attr('id').split('_')[1]);
            me.movePlayer(newPosition);
        });
    },

    initPlayers: function (players) {
        var me = this;

        me.currentTurn = me.players[0];

        me.updatePlayerPosition(me.currentTurn.pos);
        me.switchPlayer();
        me.updatePlayerPosition(me.currentTurn.pos);
        me.switchPlayer();
    },

    movePlayer: function (newPosition) {
        var me = this;
        if (me.isPossibleMove(newPosition)) {
            me.updatePlayerPosition(newPosition);
            me.switchPlayer();
        }
    },

    isPossibleMove: function (newPosition) {
        return this.isAdjacentSquare(newPosition);
    },

    isAdjacentSquare: function (newPosition) {
        var isAdjacentSquare = false;
        var adjacentSquares = this.getAdjacentSquares();
        $.each(adjacentSquares, function (i, v) {
            if (newPosition == v) {
                isAdjacentSquare = true;
            }
        });
        return isAdjacentSquare;
    },

    getAdjacentSquares: function () {
        var adjacentSquares = [];
        this.getAdjacentVerticalSquares(adjacentSquares);
        this.getAdjacentHorizontalSquares(adjacentSquares);
        return adjacentSquares;
    },

    getAdjacentVerticalSquares: function (adjacentSquares) {
        var me = this, boardDimension = me.boardDimension;
        if (me.currentTurn.pos < boardDimension) {
            adjacentSquares.push(me.currentTurn.pos + boardDimension);
        } else if (me.currentTurn.pos > (boardDimension * boardDimension) - boardDimension) {
            adjacentSquares.push(me.currentTurn.pos - boardDimension);
        } else {
            adjacentSquares.push(me.currentTurn.pos + boardDimension);
            adjacentSquares.push(me.currentTurn.pos - boardDimension);
        }
    },

    getAdjacentHorizontalSquares: function (adjacentSquares) {
        var me = this;
        if (me.currentTurn.pos % 9 == 0) {
            adjacentSquares.push(me.currentTurn.pos + 1);
        } else if (me.currentTurn.pos % 9 == 8) {
            adjacentSquares.push(me.currentTurn.pos - 1);
        } else {
            adjacentSquares.push(me.currentTurn.pos + 1);
            adjacentSquares.push(me.currentTurn.pos - 1);
        }
    },

    updatePlayerPosition: function (position) {
        var me = this;
        me.currentTurn.pos = position;
        var playerDiv = $('<div id="' + me.currentTurn.id + '" />');
        $('#' + me.currentTurn.id).remove();
        $('#square_' + position).append(playerDiv);
    },

    getAdjacentFence: function (fence) {
        if ($(fence).hasClass('horizontal')) {
            return $(fence).next();
        } else {
            var adjacentIndex = parseInt($(fence).attr('id').split('_')[1]) + 17;
            return $($('.fence')[adjacentIndex]);
        }
    },

    isFencePlaceable: function (fence) {
        return this.hasFencesRemaining();
    },

    hasFencesRemaining: function () {
        return this.currentTurn.fencesRemaining > 0;
    },

    placeFence: function (fence) {
        if (this.isFencePlaceable(fence)) {
            $(fence).addClass('placed');
            this.getAdjacentFence(fence).addClass('placed');
            this.currentTurn.fencesRemaining--;
            this.switchPlayer();
        }
    },

    updateInformation: function () {
        var me = this;
        me.information.currentTurn.text(me.currentTurn.name);
        me.information.fencesRemaining[0].text(me.players[0].fencesRemaining);
        me.information.fencesRemaining[1].text(me.players[1].fencesRemaining);
    },

    switchPlayer: function () {
        var me = this;
        var getCurrentPlayerIndex = $.inArray(me.currentTurn, me.players);
        var nextPlayerIndex = getCurrentPlayerIndex + 1;
        nextPlayerIndex = nextPlayerIndex < me.players.length ? nextPlayerIndex : 0;
        me.currentTurn = me.players[nextPlayerIndex];

        me.updateInformation();
    }
};