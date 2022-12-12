import { BoardModel } from "public/models/BoardModel";
import { BoardView } from "public/views/BoardView";
import { parseUrl } from "public/models/urlParser";

$(function () {
    var params = parseUrl(document.location.search);
    var boardModel = new BoardModel({
        currentPlayer: +(params.currentPlayer || 0),
        playersCount: +(params.playersCount || 0),
        botsCount: +(params.botsCount || 0),
        roomId: params.roomId
    });
    (window as any).boardModel = boardModel;
    new BoardView({
        model: boardModel
    });
});