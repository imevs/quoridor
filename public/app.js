$(function () {

    var params = parseUrl(document.location.search);
    var boardModel = new BoardModel({
        playersCount: params['playersCount']
    });
    new BoardView({
        model: boardModel
    });
    //boardModel.run(2, 1);
});