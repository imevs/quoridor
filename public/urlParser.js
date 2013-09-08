function createUrlObject(url) {
    var a = document.createElement('a');
    a.href = url;
    return a;
}

var parseUrl = function (url) {
    var queryString = url, result = {}, i, s, seg;
    var isArrayExp = /(\w+)\[(\d*)\]/;

    if (url.charAt(0) !== '?') {
        var a = createUrlObject(url);
        queryString = a.search;
    }

    seg = queryString.replace(/^\?/, '').split('&');

    for (i = 0; i < seg.length; i++) {
        if (!seg[i]) continue;

        s = seg[i].split('=');

        var paramName = decodeURIComponent(s[0]),
            paramValue = decodeURIComponent(s[1]);
        var isArrayItem = isArrayExp.test(paramName);
        if (isArrayItem || result[paramName]) {
            paramName = paramName.replace(isArrayExp, '$1');
            var oldVal = result[paramName];
            if (!oldVal) {
                result[paramName] = [];
            } else if ( !(oldVal instanceof Array)) {
                result[paramName] = [oldVal];
            }
            result[paramName].push(paramValue);
        } else {
            result[paramName] = paramValue;
        }
    }

    return result;
};