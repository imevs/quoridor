var mongoose = require("mongoose"),
	fs = require('fs');

var backboneMongoose = function(config) {

	var files = fs.readdirSync(config.schema_dir),
		connection = mongoose.createConnection(config.db_url),
		mongooseSync;

    connection.on('error', function (err) {
        console.log('connection error:', err && err.message);
    });

	files.forEach(function(fileName) {
		require(config.schema_dir + '/' + fileName);
	});

	mongooseSync = function(method, model, options) {

		var MongooseModel = connection && connection.model(model.mongooseModel),

			process = function(err, docs) {
				if (err) {
					if (options.error) {
						options.error(err, options);
					}
				}
				if (options.success) {
					options.success(docs, options);
				}
			},

			data = model.toJSON() || {};

		options = options || (options = {});

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
		case 'patch':
			//MongooseModel.patch(model, process);
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
Backbone.initSync = function(config) {
    Backbone.sync = backboneMongoose(config);
};

backboneMongoose.VERSION = "0.1.1";

global.Backbone = global.Backbone || Backbone;
exports = module.exports = global.Backbone;
