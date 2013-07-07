$(function () {
    var quoridor = new Quoridor();
    var players = [
        new Player("Player 1", 4, "player_1", quoridor.startingFences),
        new Player("Player 2", 76, "player_2", quoridor.startingFences)
    ];
    quoridor.init('#board', new Information(), players);
});