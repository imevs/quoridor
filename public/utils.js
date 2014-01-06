if (typeof module !== 'undefined') {
    var _ = require('lodash-node/underscore');
}

_.mixin({
    iter: function (params, callback, ctx) {
        var i = 0, j = 0, i_max = params[0], j_max = params[1];
        _(i_max).times(function () {
            j = 0;
            _(j_max).times(function () {
                callback.call(ctx, i, j);
                j++;
            });
            i++;
        });
    }
});


_.prototype.some = function (callback, thisArg) {
    var collection = this.__wrapped__;
    for (var i = 0, len = collection.length; i < len; i++) {
        if (callback.call(thisArg, collection[i])) {
            return true;
        }
    }
    return false;
};

if (typeof module !== 'undefined') {
    module.exports = _;
}