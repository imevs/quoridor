function createUrlObject(url: string) {
    const a = document.createElement('a');
    a.href = url;
    return a;
}

export const parseUrl = (url: string) => {
    let queryString = url, result: Record<string, string | string[]> = {}, i, s, seg;
    const isArrayExp = /(\w+)\[(\d*)\]/;

    if (url.charAt(0) !== '?') {
        const a = createUrlObject(url);
        queryString = a.search;
    }

    seg = queryString.replace(/^\?/, '').split('&');

    for (i = 0; i < seg.length; i++) {
        if (!seg[i]) {
            continue;
        }

        s = seg[i]!.split('=');

        let paramName = decodeURIComponent(s[0]!),
            paramValue = decodeURIComponent(s[1]!);
        const isArrayItem = isArrayExp.test(paramName);
        if (isArrayItem || result[paramName]) {
            paramName = paramName.replace(isArrayExp, '$1');
            const oldVal = result[paramName];
            const newVal = oldVal ? (oldVal instanceof Array ? oldVal : [oldVal]) : [];
            newVal.push(paramValue);
            result[paramName] = newVal;
        } else {
            result[paramName] = paramValue;
        }
    }

    return result;
};