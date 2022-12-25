import { BoardView } from "../views/BoardView";
import { parseUrl } from "../models/urlParser";
import { BoardValidation } from "../models/BoardValidation";

const params = parseUrl(document.location.search);
const boardModel = new BoardValidation({
    currentPlayer: +(params.currentPlayer ?? 0),
    playersCount: +(params.playersCount ?? 2),
    botsCount: +(params.botsCount ?? 0),
    roomId: params.roomId
});
(window as any).boardModel = boardModel;
const view = new BoardView({
    model: boardModel
});
view.render();
