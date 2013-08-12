$(function () {
    var socket = io.connect('http://localhost:3000', {resource: 'api'});

    var boardModel = new BoardModel({
        socket: socket,
        playersCount: 2
    });
    new BoardView({
        model: boardModel
    });
    boardModel.run();
});