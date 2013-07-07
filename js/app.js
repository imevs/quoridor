$(function () {
    var quoridor = new Quoridor();
    var players = [
        new Player("Player 1"),
        new Player("Player 2"),
        new Player("Player 3"),
        new Player("Player 4")
    ];
    quoridor.init('#board', new Information(players.length), players);
});