$(function () {
    var boardModel = new BoardModel({
        playersCount: 2
    });
    new BoardView({
        model: boardModel
    });
    //boardModel.run(2);
});