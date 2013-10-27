var mongoose = require('mongoose'),
    fs = require('fs');

var backboneMongoose = function (config) {

    var files = fs.readdirSync(config.schema_dir),
        connection = mongoose.createConnection(config.db_url),
        mongooseSync;

    connection.on('error', function (err) {
        console.log('connection error:', err && err.message);
    });

    files.forEach(function (fileName) {
        require(config.schema_dir + '/' + fileName);
    });

    mongooseSync = function (method, model, options) {
        var MongooseModel = connection && connection.model(model.mongooseModel);
        var data = model.toJSON();

        var process = function (err, docs) {
            options = options || {};
            if (err) {
                if (options.error) {
                    options.error(err, options);
                }
            }
            if (options.success) {
                options.success(docs, options);
            }
        };

        if (!MongooseModel) {
            return;
        }

        switch (method) {
        case 'create':
            MongooseModel.create(data, process);
            break;
        case 'update':
            MongooseModel.findByIdAndUpdate(model.id, data, process);
            break;
        case 'delete':
            MongooseModel.remove(data, process);
            break;
        case 'read':
            MongooseModel.find(data, process);
        }
    };
    return mongooseSync;
};

var Backbone = require('backbone');
Backbone.initSync = function (config) {
    Backbone.sync = backboneMongoose(config);
};

backboneMongoose.VERSION = '0.1.1';

global.Backbone = global.Backbone || Backbone;
exports = module.exports = global.Backbone;
