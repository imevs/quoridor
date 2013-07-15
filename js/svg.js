window.onload = function () {
    var board = new BoardView({});

    var model1 = new FieldModel({x: 4, y: 0, c: 'black'});
    var view1 = new PlayerView({model: model1});

    var model2 = new FieldModel({x: 4, y: 8, c: 'white'});
    var view2 = new PlayerView({model: model2});
};