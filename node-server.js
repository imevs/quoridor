var connect = require('connect')
    , http = require('http')
    , app = connect().use(connect.static(__dirname + '/'));

http.createServer(app).listen(process.env.PORT || 3000);