var Quoridor = function () {
    this.boardDimension = 9;
    this.fencesCount = 20;
    this.players = [];
    this.playersPositions = [4, 76, 36, 44];
    this.currentTurn = null;
};

Quoridor.prototype = {
    constructor: Quoridor,

    init: function (board, info, players) {
        var me = this;
        me.players = players;
        me.information = info;
        me.information.init(me.players.length);
        me.createBoard(board);
        me.initPlayers(players);
        me.bindSquareEventHandlers();
        me.bindFenceEventHandlers();
        me.updateInformation();
        $(board).after(me.information.getPanel());
    },

    createBoard: function (board) {
        var i, j, me = this, $board = $(board);
        var firstIndex = 0, lastIndex = me.boardDimension - 1;
        for (i = 0; i < me.boardDimension; i++) {

            if (i != 0) {
                for (j = 0; j < me.boardDimension; j++) {
                    var horizontalFence = $('<div class="fence horizontal" />');
                    if (j == firstIndex) {
                        horizontalFence.addClass('left');
                    }
                    if (j == lastIndex) {
                        horizontalFence.addClass('right');
                    }
                    $board.append(horizontalFence);
                }
            }
            for (j = 0; j < me.boardDimension; j++) {
                var squareNumber = (i * me.boardDimension) + j;
                var square = $('<div/>', {
                    id: 'square_' + squareNumber,
                    'class': 'square'
                });
                if (j != 0) {
                    var fence = $('<div class="fence" />');
                    $board.append(fence);
                }
                $board.append(square);
            }
        }
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
        var fences = me.fencesCount / me.players.length;
        me.currentTurn = me.players[0];
        $.each(me.players, function(i, v) {
            v.fencesRemaining = fences;
            me.updatePlayerPosition(me.playersPositions[i]);
            me.switchPlayer();
        });
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
        var playerDiv = $('<div class="player" id="' + me.currentTurn.id + '" />');
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

    updateInformation: function() {
        this.information.updateInformation(this.currentTurn.name, this.players);
    },

    switchPlayer: function () {
        var me = this,
            currentPlayerIndex = $.inArray(me.currentTurn, me.players),
            c = currentPlayerIndex + 1,
            nextPlayerIndex = c < me.players.length ? c : 0;

        me.currentTurn = me.players[nextPlayerIndex];

        me.updateInformation();
    }
};