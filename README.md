Quoridor game
========
[Game description](http://en.wikipedia.org/wiki/Quoridor)


[Demo on heroku](http://quoridor-online.herokuapp.com/)

[![Build Status](https://travis-ci.org/imevs/quoridor.png?branch=master)](https://travis-ci.org/imevs/quoridor)


This game is an example of fullstack javascript application. 
The application based on javascript framework Backbone, it's also using next libraries: requirejs, handlebars, bootstrap and Raphael for svg graphics. 
Here you can also find an examples of using mongodb, phantomjs, jshint and jstestdriver.  
The application intgrated with such external services as heroku (for deployment), travis-ci (for continuos integration and continuos deplument), mongolab (data storage).

You can play in game on the [sane browser window for all players](http://quoridor-online.herokuapp.com/playLocal/playersCount/2), and you can play in [multiplayer mode](http://quoridor-online.herokuapp.com/create/playersCount/2) (up to 4 players). If you haven't any friends, you can [choose bots](http://quoridor-online.herokuapp.com/new/playersCount/4). Eventually you can look [on bots battle](http://quoridor-online.herokuapp.com/createGameWithBots/playersCount/2) 

Road map
=

1. playing 2-4 players in the same browser window / 07.2013
2. playing game on different browsers, moving game logic into server side / 09.2013
3. game interface, AI / 11.2013
4. rewrite app on another framework (derbyjs or lycheejs) / 12.2013
5. 3d-View, more attractive design / 12.2013
6. android mobile version / 01.2014

=
TODO for next version
=
* more clever bots
* display remaining time for turn
* authorization
* rating, statistics
* chat in game room
* distributed game server
