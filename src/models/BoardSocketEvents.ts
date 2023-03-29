import _ from "underscore";
import { PlayerNumber } from "./BoardModel";
import { BoardValidation } from "./BoardValidation";
import { Position } from "./BackboneModel";
import { FencePosition } from "./FenceModel";
import { TurnModelProps } from "./TurnModel";
import { buildQuery, parseUrl } from "./urlParser";

type HistoryItem = TurnModelProps;
let boardState = {
    activePlayer: 0 as PlayerNumber,
    playersCount: 2,
    history: [] as HistoryItem[],
};

const SERVICE_PATH = "https://api.jsonbin.io/v3";
const accessToken = "$2b$10$YE9Sljt4vjsX7w1GzojOVOkibhD.DRrH7eAGncSpfhmStD6Dp/kPO";

const saveData = (path: string, resourceID: string, data: {}) => {
    const req = new XMLHttpRequest();

    if (resourceID) {
        req.open("PUT", `${path}/b/${resourceID}`, true);
        req.onreadystatechange = () => {
            if (req.readyState === XMLHttpRequest.DONE) {
                console.log("Signalling data saved");
            }
        };
    } else {
        req.open("POST", `${path}/b`, true);
    }
    req.setRequestHeader("Content-type", "application/json");
    req.setRequestHeader("X-Access-Key", accessToken);
    req.setRequestHeader("X-Bin-Private", "true");
    req.send(JSON.stringify(data));
    return req;
};

const createData = (path: string, data: {}): Promise<string> => {
    const req = saveData(path, "", data);

    return new Promise((resolve, reject) => {
        req.onreadystatechange = () => {
            if (req.readyState === XMLHttpRequest.DONE) {
                console.log("Signalling data saved", req);
                try {
                    resolve(JSON.parse(req.responseText).metadata.id as string);
                } catch (ex) {
                    reject(ex);
                }
            }
        };
    });
};

const fetchGameState = (path: string, resourceID: string): Promise<typeof boardState> => {
    return fetch(
        `${path}/b/${resourceID}/latest`,
        { headers: { "X-Access-Key": accessToken, "X-Bin-Meta": "false" } }
    ).then(r => r.json());
};

export class BoardSocketEvents extends BoardValidation {

    public isOnlineGame() {
        return true;
    }

    private remoteEvents(currentPlayer: PlayerNumber) {
        const me = this;
        const gameId = me.get("roomId");

        if (gameId) {
            this.on('confirmturn', this.onTurnSendSocketEvent);
            this.on('change:activePlayer', this.updateActivePlayer, this);

            setInterval(() => {
                fetchGameState(SERVICE_PATH, gameId).then(data => {
                    if (data.history && data.history.length && data.history.length !== me.history.get('turns').length) {
                        const lastMove = data.history[data.history.length - 1]!;
                        if (lastMove.t === "p") {
                            this.onSocketMovePlayer(lastMove);
                        } else {
                            this.onSocketMoveFence({
                                x: lastMove.x,
                                y: lastMove.y,
                                orientation: lastMove.x === lastMove.x2 ? "V" : "H",
                            });
                        }
                    }
                });
            }, 5000);

            fetchGameState(SERVICE_PATH, gameId).then(data => {
                if (data.history === undefined) {
                    saveData(SERVICE_PATH, gameId, boardState);
                } else {
                    boardState = data;
                }
                this.onStart(currentPlayer, boardState.activePlayer, boardState.history);
            });
        } else {
            createData(SERVICE_PATH, boardState).then((id: string) => {
                this.set("roomId", id);
                document.location =
                    location.href + "?" + buildQuery({ ...parseUrl(location.search), roomId: id });
            });
        }
    }
    
    private updateActivePlayer() {
        const gameId = this.get("roomId")!;
        boardState.activePlayer = this.get("activePlayer")!;
        saveData(SERVICE_PATH, gameId, boardState);
    }

    private onTurnSendSocketEvent() {
        if (!this.isPlayerMoved && !this.isFenceMoved) {
            return;
        }

        boardState.history = this.history.get('turns').toJSON();

        if (this.isPlayerMoved) {
            boardState.history.push({
                ...(this.getActivePlayer().pick('x', 'y') as Position),
                t: "p"
            });
        }
        if (this.isFenceMoved) {
            const eventInfo = this.fences.getMovedFence().pick('x', 'y', 'orientation') as FencePosition;
            boardState.history.push({
                x: eventInfo.x,
                y: eventInfo.y,
                t: "f",
                x2: eventInfo.orientation === "V" ? eventInfo.x : eventInfo.x + 1,
                y2: eventInfo.orientation === "V" ? eventInfo.y + 1 : eventInfo.y,
            });
        }
        const gameId = this.get("roomId")!;
        saveData(SERVICE_PATH, gameId, boardState);
    }

    public onSocketMoveFence(pos: FencePosition) {
        const fence = this.fences.findWhere({
            type: pos.orientation,
            x   : pos.x,
            y   : pos.y
        });
        if (!fence) {
            return false;
        }
        this.auto = true;
        fence.trigger('selected', fence);
        this.auto = false;
        this.trigger('maketurn');
        return true;
    }

    private onStart(currentPlayer: PlayerNumber, activePlayer: PlayerNumber, history: HistoryItem[]) {
        const me = this;
        if (history.length) {
            // TODO: trigger update of UI
            me.history.get('turns').reset(history);
        } else {
            me.history.initPlayers();
        }

        const players = me.history.getPlayerPositions(),
            fences = me.history.getFencesPositions();

        _(players).each((playerInfo, i) => {
            const player = me.players.at(i);
            if (!_.isUndefined(playerInfo.x) && !_.isUndefined(playerInfo.y)) {
                player.set({
                    x     : playerInfo.x,
                    prev_x: playerInfo.x,
                    y     : playerInfo.y,
                    prev_y: playerInfo.y,
                    fencesRemaining: player.get('fencesRemaining') - playerInfo.movedFences
                });
            }
        });
        _(fences).each(fencePos => {
            const fence = me.fences.findWhere({
                x   : fencePos.x,
                y   : fencePos.y,
                type: fencePos.t
            });
            fence?.trigger('movefence');
            me.fences.getSibling(fence)?.trigger('movefence');
        });
        me.fences.setBusy();
        me.run(activePlayer, currentPlayer);
    }


    public afterInitialize() {
        this.remoteEvents(this.get('currentPlayer')!);
    }

}