require.config({
    baseUrl: '../',
    paths: {
        'text'           : 'libs/text'
    },
    shim: {
        'libs/jquery-1.10.2'           : {
            exports: '$'
        },
        'libs/underscore': {
            exports: '_'
        },
        'libs/backbone': {
            deps: ["libs/underscore", "libs/jquery-1.10.2"],
            exports: 'Backbone'
        },
        'libs/backbone.raphael': {
            deps: ["libs/underscore", 'libs/backbone']
        },
        'js/utils': {
            deps: ['libs/underscore']
        },
        'js/models/FenceModel': {
            deps: ['libs/backbone']
        },
        'js/models/FieldModel': {
            deps: ['libs/backbone']
        },
        'js/models/PlayerModel': {
            deps: ['libs/backbone']
        },
        'js/models/BoardModel': {
            deps: [
                'libs/underscore',
                'libs/backbone',
                'js/models/FenceModel',
                'js/models/FieldModel',
                'js/models/PlayerModel',
                'js/utils'
            ]
        },

        'js/views/GameObject': {
            deps: [
                "libs/backbone.raphael", "libs/raphael"
            ]
        },
        'js/views/FieldView': {
            deps: [
                'js/views/GameObject'
            ]
        },
        'js/views/PlayerView': {
            deps: [
                'js/views/GameObject'
            ]
        },
        'js/views/FenceView': {
            deps: [
                'js/views/GameObject'
            ]
        },
        'js/views/InfoView': {
            deps: [
                'libs/backbone'
            ]
        },
        'js/views/BoardView'  : {
            deps: [
                'libs/underscore',
                'js/views/GameObject',
                'js/views/FieldView',
                'js/views/FenceView',
                'js/views/PlayerView',
                'js/views/InfoView'
            ]
        }
    }
});

require(['libs/jquery-1.10.2', 'js/models/BoardModel', 'js/views/BoardView'],
    function ($) {
        $(function () {
            var boardModel = new BoardModel({
                playersCount: 2
            });
            new BoardView({
                model: boardModel
            });
            boardModel.run();
        });
    }
);