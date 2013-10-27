/* global $, BoardModel,parseUrl,BoardView */
$(function () {

    var params = parseUrl(document.location.search);
    var boardModel = new BoardModel({
        playersCount: window.playersCount || params.playersCount,
        roomId: window.roomId
    });
    new BoardView({
        model: boardModel
    });
});