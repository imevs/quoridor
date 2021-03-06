/*jslint nomen: true, regexp: true */
var path = require('path'),
    fs = require('fs');

//require('../lib/register-plugins');

function loadDirTests(dir, pat) {
    var files = fs.readdirSync(path.resolve(__dirname, dir))
        .filter(function (f) {
            //return f.indexOf('browser') > 0;
            return pat.exec(f) && f.indexOf('.js') > 0 && f.indexOf('client.js') < 0 && f !== 'server.js';
        })
        .map(function (f) { return path.resolve(__dirname, dir, f).substring(process.cwd().length); });
    return files;
}

function runTests(pat, reporter, opts, callback) {
    var files;

    pat = pat || /(.*)+\.js$/;
    if (typeof pat === 'string') { pat = new RegExp(pat); }
    files = loadDirTests('serverSideTests', pat);
    reporter.run(files, opts, callback);
}

module.exports = {
    runTests: runTests
};

