if (typeof module !== 'undefined') {
    var _ = require('underscore');
}

_.mixin({iter: function (params, callback, ctx) {
    var i = 0, j = 0, i_max = params[0], j_max = params[1];
    _(i_max).times(function () {
        j = 0;
        _(j_max).times(function () {
            callback.call(ctx, i, j);
            j++;
        });
        i++;
    });
}});

if (typeof module !== 'undefined') {
    module.exports = _;
}
