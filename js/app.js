$(function() {
    var boardModel = new BoardModel();
    new BoardView({
        model: boardModel
    });
    boardModel.run();
});