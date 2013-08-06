//define(['libs/jquery-1.10.2', 'js/models/BoardModel', 'js/views/BoardView'],
//    function ($) {
        $(function () {
            var boardModel = new BoardModel({
                playersCount: 2
            });
            new BoardView({
                model: boardModel
            });
            boardModel.run();
        });
//    }
//);