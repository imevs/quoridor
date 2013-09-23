require.config({
    paths: {
        'socket.io': 'libs/socket.io/socket.io',
        'text'     : 'libs/text'
    },
    shim : {
        'libs/jquery-1.10.2'      : {
            exports: '$'
        },
        'libs/underscore'         : {
            exports: '_'
        },
        'libs/backbone'           : {
            deps   : ["libs/underscore", "libs/jquery-1.10.2"],
            exports: 'Backbone'
        },
        'libs/backbone.raphael'   : {
            deps: ["libs/underscore", 'libs/backbone']
        },
        'utils'                   : {
            deps: ['libs/underscore']
        },
        'models/FenceModel'       : {
            deps: ['libs/backbone', 'utils']
        },
        'models/FieldModel'       : {
            deps: [
                'libs/underscore',
                'utils',
                'libs/backbone'
            ]
        },
        'models/PlayerModel'      : {
            deps: ['libs/backbone']
        },
        'models/TurnModel'        : {
            deps: ['libs/backbone']
        },
        'models/BoardValidation'  : {
            deps: []
        },
        'models/BoardSocketEvents': {
            deps: ['socket.io']
        },
        'models/BoardModel'       : {
            deps: [
                'libs/underscore',
                'libs/backbone',
                'models/FenceModel',
                'models/FieldModel',
                'models/TurnModel',
                'models/BoardValidation',
                'models/BoardSocketEvents',
                'models/PlayerModel',
                'utils'
            ]
        },

        'views/GameObject'     : {
            deps: [
                "libs/backbone.raphael", "libs/raphael"
            ]
        },
        'views/FieldView'      : {
            deps: [
                'views/GameObject'
            ]
        },
        'views/PlayerView'     : {
            deps: [
                'views/GameObject'
            ]
        },
        'views/FenceView'      : {
            deps: [
                'views/GameObject'
            ]
        },
        'views/InfoView'       : {
            deps: [
                'libs/backbone'
            ]
        },
        'views/GameHistoryView': {
            deps: [
                'libs/backbone'
            ]
        },
        'views/BoardView'      : {
            deps: [
                'libs/underscore',
                'views/GameObject',
                'views/FieldView',
                'views/GameHistoryView',
                'views/FenceView',
                'views/PlayerView',
                'views/InfoView'
            ]
        },
        'app'                  : {
            deps: [
                'urlParser',
                'libs/jquery-1.10.2',
                'models/BoardModel',
                'views/BoardView'
            ]
        }
    }
});
window.module = false;
require(['app']);
