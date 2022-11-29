/* global $, BoardModel,parseUrl,BoardView */
$(function () {
    var params = parseUrl(document.location.search);
    var boardModel = new BoardModel({
        currentPlayer: +(window.currentPlayer || params.currentPlayer || 0),
        playersCount: +(window.playersCount || params.playersCount || 0),
        botsCount: +(window.botsCount || params.botsCount || 0),
        roomId: window.roomId || params.roomId
    });
    window.boardModel = boardModel;
    new BoardView({
        model: boardModel
    });
});