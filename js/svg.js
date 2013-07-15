_.mixin({iter: function(params, callback, ctx) {
    var i = 0, j = 0, i_max = params[0], j_max = params[1];
    _(i_max).times(function() {
        j = 0;
        _(j_max).times(function() {
            callback.call(ctx, i, j);
            j++;
        });
        i++;
    });
}});

window.onload = function () {

    _([9, 9]).iter(function(i, j) {
        var model = new FieldModel({x: i,y: j});
        var view = new FieldView({model: model});
    });

    _([9, 8]).iter(function(i, j) {
        var model = new FieldModel({x: i,y: j});
        var view = new FenceHView({model: model});
    });

    _([8, 9]).iter(function(i, j) {
        var model = new FieldModel({x: i,y: j});
        var view = new FenceVView({model: model});
    });

    var model1 = new FieldModel({x: 4, y: 0, c: 'black'});
    var view1 = new PlayerView({model: model1});

    var model2 = new FieldModel({x: 4, y: 8, c: 'white'});
    var view2 = new PlayerView({model: model2});

};