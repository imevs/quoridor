require.config({
    waitSeconds: 30,
    paths: {
        'underscore': 'libs/lodash.underscore',
        'async': 'libs/async',
        'socket.io': 'libs/socket.io/socket.io',
        'text'     : 'libs/text'
    },
    shim : {
        'libs/jquery-1.10.2'      : {
            exports: '$'
        },
        'underscore'         : {
            exports: '_'
        },
        'libs/backbone'           : {
            deps   : ['underscore', 'libs/jquery-1.10.2'],
            exports: 'Backbone'
        },
        'libs/backbone.raphael'   : {
            deps: ['underscore', 'libs/backbone']
        },
        'utils'                   : {
            deps: ['underscore']
        },
        'models/Bot'       : {
            deps: ['models/TurnModel', 'libs/backbone', 'utils']
        },
        'models/SmartBot'       : {
            deps: ['models/TurnModel', 'libs/backbone', 'utils', 'models/Bot']
        },
        'models/MegaBot'       : {
            deps: ['models/TurnModel', 'libs/backbone', 'utils', 'async', 'models/SmartBot']
        },
        'models/FenceModel'       : {
            deps: ['libs/backbone', 'utils']
        },
        'models/FieldModel'       : {
            deps: [
                'underscore',
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
        'models/BotWrapper': {
            deps: [
                'libs/backbone',
                'models/Bot',
                'models/SmartBot',
                'models/MegaBot'
            ]
        },
        'models/TimerModel': {
            deps: ['libs/backbone']
        },
        'views/TimerView': {
            deps: ['libs/backbone']
        },
        'models/BoardModel'       : {
            deps: [
                'underscore',
                'libs/backbone',
                'models/TimerModel',
                'models/BotWrapper',
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
                'libs/backbone.raphael', 'libs/raphael'
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
                'views/GameObject'
            ]
        },
        'views/GameHistoryView': {
            deps: [
                'libs/backbone'
            ]
        },
        'views/BoardView'      : {
            deps: [
                'underscore',
                'views/GameObject',
                'views/TimerView',
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
require(['app']);