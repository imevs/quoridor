function createUrlObject(url: string) {
    const a = document.createElement('a');
    a.href = url;
    return a;
}

export const parseUrl = (url: string): Record<string, string | string[]> => {
    const result: Record<string, string | string[]> = {};
    let queryString = url;
    let i;
    let s;
    let seg;
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

export function buildQuery(params: Record<string, string | string[]>): string {
    return Object.keys(params).map(key => key + "=" + params[key]).join("&");
}