import { BoardView } from "../views/BoardView";
import { parseUrl } from "../models/urlParser";
import { PlayerNumber } from "../models/PlayerModel";
import { BoardValidation } from "../models/BoardValidation";
import { BoardSocketEvents } from "../models/BoardSocketEvents";

const params = parseUrl(document.location.search);
const options = {
    currentPlayer: +(params.currentPlayer ?? 0) as PlayerNumber,
    playersCount: +(params.playersCount ?? 2),
    botsCount: +(params.botsCount ?? 0),
    boardSize: 9,
    activePlayer: 0 as const,
    roomId: params.roomId as string
};
const boardModel = params.roomId !== undefined ? new BoardSocketEvents(options) : new BoardValidation(options);
(window as any).boardModel = boardModel;
const view = new BoardView({ model: boardModel });
view.render();
