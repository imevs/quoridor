$(function () {
    var boardModel = new BoardModel({
        playersCount: 2
    });
    new BoardView({
        model: boardModel
    });
    boardModel.run();

    var socket = io.connect('http://localhost:3000', {resource: 'api'});
    socket.on('stats', function (arr) {
        console.log(arr);
    });
});