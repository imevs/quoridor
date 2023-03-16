import _ from "underscore";
import { BoardValidation } from "../models/BoardValidation";
import { Position } from "../models/BackboneModel";
import { FencePosition } from "../models/FenceModel";

let boardState = {
    activePlayer: 0,
    playersCount: 2,
    history: [] as { 
        x: number; y: number; orientation: "H" | "V" | "P"; 
    }[],
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

    remoteEvents(currentPlayer: number) {
        const me = this;
        const gameId = me.get("roomId");

        if (gameId) {
            this.on('confirmturn', this._onTurnSendSocketEvent);
            this.on('change:activePlayer', this.updateActivePlayer, this);

            setInterval(() => {
                fetchGameState(SERVICE_PATH, gameId).then(data => {
                    if (data.history && data.history.length && data.history.length !== me.history.get('turns').length) {
                        const lastMove = data.history[data.history.length - 1]!;
                        if (lastMove.orientation === "P") {
                            this.onSocketMovePlayer(lastMove);
                        } else {
                            this.onSocketMoveFence(lastMove as FencePosition);
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
                document.location = location.href + "&roomId=" + id;
            });
        }
    }
    updateActivePlayer() {
        const gameId = this.get("roomId")!;
        boardState.activePlayer = this.get("activePlayer")!;
        saveData(SERVICE_PATH, gameId, boardState);
    }
    _onTurnSendSocketEvent() {
        if (!this.isPlayerMoved && !this.isFenceMoved) {
            return;
        }

        boardState.history = this.history.get('turns').toJSON();

        if (this.isPlayerMoved) {
            boardState.history.push({
                ...(this.getActivePlayer().pick('x', 'y') as Position),
                orientation: "P"
            });
        }
        if (this.isFenceMoved) {
            const eventInfo = this.fences.getMovedFence().pick('x', 'y', 'orientation') as FencePosition;
            boardState.history.push({
                x: eventInfo.x,
                y: eventInfo.y,
                orientation: eventInfo.orientation,
            });
        }
        const gameId = this.get("roomId")!;
        saveData(SERVICE_PATH, gameId, boardState);
    }

    onSocketMoveFence(pos: FencePosition) {
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

    onStart(currentPlayer: 'error' | number, activePlayer: number, history: {}[]) {
        if (currentPlayer === 'error') {
            alert('Game is busy');
            return;
        }
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