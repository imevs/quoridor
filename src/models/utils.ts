// import _ from "underscore";

export const iter = (params: number[], callback: (x: number, y: number) => void) => {
    let i = 0, j = 0;
    const i_max = params[0], j_max = params[1];
    _(i_max).times(() => {
        j = 0;
        _(j_max).times(() => {
            callback(i, j);
            j++;
        });
        i++;
    });
};
