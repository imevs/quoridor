Quoridor game
========
[Game description](http://en.wikipedia.org/wiki/Quoridor)


[Demo on heroku](http://quoridor-online.herokuapp.com/)

[![Build Status](https://travis-ci.org/imevs/quoridor.png?branch=master)](https://travis-ci.org/imevs/quoridor)
[![Dependency Status](https://david-dm.org/imevs/quoridor.png)](https://david-dm.org/imevs/quoridor)
[![devDependency Status](https://david-dm.org/imevs/quoridor/dev-status.png)](https://david-dm.org/imevs/quoridor#info=devDependencies)


This game is an example of fullstack javascript application. 
The application based on javascript framework Backbone, it's also using next libraries: requirejs, handlebars, bootstrap and Raphael for svg graphics. 
Here you can also find an examples of using mongodb, phantomjs, jshint and jstestdriver.  
The application intgrated with such external services as heroku (for deployment), travis-ci (for continuos integration and continuos deplument), mongolab (data storage).

You can play in game on the [sane browser window for all players](http://quoridor-online.herokuapp.com/playLocal/playersCount/2), and you can play in [multiplayer mode](http://quoridor-online.herokuapp.com/create/playersCount/2) (up to 4 players). If you haven't any friends, you can [choose bots](http://quoridor-online.herokuapp.com/new/playersCount/4). Eventually you can look [on bots battle](http://quoridor-online.herokuapp.com/createGameWithBots/playersCount/2) 

Road map
=

1. playing 2-4 players in the same browser window / 07.2013
2. playing game on different browsers, moving game logic into server side / 09.2013
3. improve game interface, AI / 01.2014
4. 3d-View, more attractive design / 02.2014
5. rewrite app on another framework (derbyjs or lycheejs) / 03.2014
6. android mobile version / 01.2014

Analogs

http://massey-plantinga.com/online_quoridor/setup - no bots
http://kworidor.herokuapp.com/sign_in - no local mode, use ruby
http://martijn.van.steenbergen.nl/projects/quoridor/ - no online mode, java
https://play.google.com/store/apps/details?id=air.QuoridorBoardGame&hl=ru - android only