Raphael.prototype.squareWidth = 50;
Raphael.prototype.squareHeight = 30;
Raphael.prototype.squareDistance = 10;

Raphael.fn.square = function (i, j) {
    var w = this.squareWidth,
        h = this.squareHeight,
        d = this.squareDistance;
    var x = (w + d) * i + 10;
    var y = (h + d) * j + 10;
    var obj = this.rect(x, y, w, h);
    obj.attr("fill", "#f00");
    return this.set(obj);
};

Raphael.fn.fenceV = function (i, j) {
    var w = this.squareDistance,
        h = this.squareHeight,
        dh = this.squareDistance,
        dw = this.squareWidth;
    var x = (w + dw) * i + 10 + dw;
    var y = (h + dh) * j + 10;
    var obj = this.rect(x, y, w, h);
    obj.attr("fill", "blue");
    return this.set(obj);
};

Raphael.fn.fenceH = function (i, j) {
    var w = this.squareWidth,
        h = this.squareDistance,
        dh = this.squareHeight,
        dw = this.squareDistance;
    var x = (w + dw) * i + 10;
    var y = (h + dh) * j + 10 + dh;
    var obj = this.rect(x, y, w, h);
    obj.attr("fill", "blue");
    return this.set(obj);
};

Raphael.fn.player = function (i, j, color) {
    var w = this.squareWidth,
        h = this.squareHeight,
        d = this.squareDistance;
    var x = (w + d) * i + 10 + w / 2;
    var y = (h + d) * j + 10 + h / 2;
    var obj = this.ellipse(x, y, (w - 10) / 2, (h - 10) / 2 );
    obj.attr("fill", color);
    return this.set(obj);
};

var iter = function(params, callback, ctx) {
    var i = 0, j = 0, i_max = params[0], j_max = params[1];
    _(i_max).times(function() {
        j = 0;
        _(j_max).times(function() {
            callback.call(ctx, i, j);
            j++;
        });
        i++;
    });
};
_.mixin({iter: iter});

window.onload = function () {

    var R = Raphael('holder', 600, 600);
    _([9, 9]).iter(function(i, j) { R.square(i,j); });
    _([9, 8]).iter(function(i, j) { R.fenceH(i,j); });
    _([8, 9]).iter(function(i, j) { R.fenceV(i,j); });

    R.player(4,0, 'black');
    R.player(4,8, 'white');

};