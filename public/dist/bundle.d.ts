/// <reference types="backbone" />
declare function App(): void;
declare module "models/BackboneModel" {
    import { Model, Collection, ObjectHash, _StringKey } from "backbone";
    export class BackboneModel<T extends ObjectHash = any> extends Model<T> {
        get<A extends _StringKey<T>>(attributeName: A): T[A];
    }
    export class BackboneCollection<TModel extends BackboneModel = BackboneModel> extends Collection<TModel> {
    }
    export type Position = {
        x: number;
        y: number;
    };
}
declare module "models/TurnModel" {
    import { BackboneCollection, BackboneModel, Position } from "models/BackboneModel";
    type TurnModelProps = Position & {
        x2?: number;
        y2?: number;
        t?: "f" | "p";
        debug?: boolean;
    };
    export class TurnModel extends BackboneModel<TurnModelProps> {
        defaults: () => {
            x: number;
            y: number;
        };
        alpha: string[];
        intToChar(i: string | number): string;
        getX(x: string | number): string;
        getY(y: number): string;
        toString(): string;
        toJSON(): {
            x?: number | undefined;
            y?: number | undefined;
            x2?: number | undefined;
            y2?: number | undefined;
            t?: "f" | "p" | undefined;
            debug?: boolean | undefined;
        };
    }
    export class TurnsCollection extends BackboneCollection<TurnModel> {
        model: typeof TurnModel;
        initialize(): void;
    }
    export class GameHistoryModel extends BackboneModel<{
        debug?: boolean;
        t?: "f" | "p";
        boardSize: number;
        playersCount: number;
        playerNames?: string[];
        turns: TurnsCollection;
    }> {
        defaults: () => {
            turns: TurnsCollection;
            playerNames: never[];
        };
        playersPositions: Position[];
        getPlayerPositions(): {
            x?: number | undefined;
            y?: number | undefined;
            movedFences: number;
        }[];
        getFencesPositions(): {
            t: string;
            x?: number | undefined;
            y?: number | undefined;
            x2?: number | undefined;
            y2?: number | undefined;
        }[];
        add(turnInfo: TurnModelProps): void;
        at(index: number): string;
        getLength(): number;
        initPlayers(): void;
        initialize(params?: {
            boardSize: number;
            playersCount: number;
        }): void;
    }
}
declare module "models/Bot" {
    import { BackboneModel, Position } from "models/BackboneModel";
    type PlayerPosition = Position & {
        playerIndex: number;
    };
    export class Bot extends BackboneModel {
        x: number;
        y: number;
        id: number;
        playerId: number;
        fencesRemaining: number;
        attemptsCount: number;
        currentPlayer: number;
        playersCount: number;
        fencesCount: number;
        fencesPositions: {}[];
        newPositions: {}[];
        constructor(id: number);
        startGame: (currentPlayer: number, activePlayer: number) => void;
        onStart(currentPlayer: number, _activePlayer: number, history: {}[], playersCount: number, boardSize: number): void;
        getNextActivePlayer(currentPlayer: number): number;
        initEvents(): void;
        isPlayerCanMakeTurn(playerIndex: number): boolean;
        onMovePlayer: (params: PlayerPosition) => void;
        onMoveFence: (params: PlayerPosition & {
            type: "H" | "V";
        }) => void;
        turn(): void;
        makeTurn: () => void;
        getFencePosition(): Position & {
            type: "H" | "V";
        };
        doTurn(): void;
        getJumpPositions(): {
            x: number;
            y: number;
        }[];
        canMoveFence(): boolean;
        canMovePlayer(): boolean;
        getPossiblePosition(): {} | undefined;
    }
}
declare module "models/utils" {
    export const iter: (params: number[], callback: (x: number, y: number) => void) => void;
}
declare module "models/FenceModel" {
    import { BackboneCollection, BackboneModel, Position } from "models/BackboneModel";
    export type FencePosition = Position & {
        orientation: "H" | "V";
    };
    export type FenceModelProps = FencePosition & {
        color: string;
        prevcolor: string;
        state: string;
    };
    export class FenceModel extends BackboneModel<FenceModelProps> {
        defaults: () => {
            color: string;
            state: string;
        };
        initialize(): void;
        onChangeState(): void;
    }
    export class FenceHModel extends FenceModel {
        defaults: () => {
            type: "H";
            color: string;
            state: string;
        };
        getAdjacentFencePosition(): {
            x: number;
            y: number;
        };
    }
    export class FenceVModel extends FenceModel {
        defaults: () => {
            type: "V";
            color: string;
            state: string;
        };
        getAdjacentFencePosition(): {
            x: number;
            y: number;
        };
    }
    export class FencesCollection extends BackboneCollection<FenceHModel | FenceVModel> {
        model(attrs: FenceModelProps, options: {}): FenceHModel | FenceVModel;
        initialize(): void;
        createFences(boardSize: number, fences?: FencePosition[]): void;
        clearBusy(): void;
        getPreBusy(): FenceModel[];
        setBusy(): void;
        getMovedFence(): FenceHModel | FenceVModel;
        getSibling(item: FenceHModel | FenceVModel): FenceHModel | FenceVModel;
        triggerEventOnFenceAndSibling(item: FenceHModel | FenceVModel, event: string): void;
        validateFenceAndSibling(item?: FenceHModel | FenceVModel): boolean;
        validateAndTriggerEventOnFenceAndSibling(item: FenceHModel | FenceVModel, event: string): boolean;
        isBusy(item: FenceModel): boolean;
        isFencePlaceable(item: FenceModel): boolean;
    }
}
declare module "models/PlayerModel" {
    import { BackboneCollection, BackboneModel, Position } from "models/BackboneModel";
    export class PlayerModel extends BackboneModel<Position & {
        fencesRemaining: number;
        prev_x: number;
        prev_y: number;
        type?: "bot";
        id?: string;
        state?: string;
        color: string;
        url: number;
    }> {
        defaults(): {
            fencesRemaining: number;
        };
        initialize(): void;
        moveTo(x: number, y: number): void;
        placeFence(): void;
        hasFences(): boolean;
        reset(): void;
        isBot(): boolean;
    }
    export class PlayersCollection extends BackboneCollection<PlayerModel> {
        model: typeof PlayerModel;
        fencesCount: number;
        playersPositions: (Position & {
            color: string;
            name: string;
            isWin(x: number, y: number): boolean;
        })[];
        initialize(players: {
            movedFences: number;
            fencesRemaining: number;
            url: number;
        }[]): void;
        getPlayerNames(): string[];
        getNextActivePlayer(currentPlayer: number): number;
        checkWin(playerIndex: number): boolean;
        createPlayers(playersCount: number): void;
        initPlayerPositions(): void;
        isFieldBusy(pos: Position): boolean;
        isBetween(n1: number, n2: number, n3: number): boolean;
        isFieldBehindOtherPlayer(pos1: Position, pos2: Position): boolean;
        getCountByCondition(callback: (item: PlayerModel) => boolean): number;
        isFieldNearOtherPlayer(pos1: Position, pos2: Position): boolean;
        hasTwoVerticalSibling(pos1: Position, pos2: Position): boolean;
        hasTwoHorizontalSiblings(pos1: Position, pos2: Position): boolean;
        isPrevFieldBusy(pos: Position): boolean;
        updatePlayersPositions(): void;
    }
}
declare module "models/BoardValidation" {
    import { PlayerModel } from "models/PlayerModel";
    import { FenceModel, FenceModelProps } from "models/FenceModel";
    import { BoardModel } from "models/BoardModel";
    import { Position } from "models/BackboneModel";
    export class BoardValidation extends BoardModel {
        isBetween(n1: number, n2: number, n3: number): boolean;
        intToChar(i: number): string | undefined;
        intToInt(i: number): string | number;
        isOtherPlayerAndFenceBehindHimVertical(pos1: Position, pos2: Position, busyFences: FenceModelProps[]): boolean;
        isOtherPlayerAndFenceBehindHimHorizontal(pos1: Position, pos2: Position, busyFences: FenceModelProps[]): boolean;
        isOtherPlayerAndFenceBehindHim(pos1: Position, pos2: Position, busyFences: FenceModelProps[]): boolean;
        noFenceBetweenPositions(pos1: Position, pos2: Position, busyFences: FenceModelProps[]): boolean;
        isNearestPosition(currentPos: Position, pos: Position): boolean;
        isValidPlayerPosition(currentPos: Position, newPos: Position, busyFences: FenceModelProps[]): boolean;
        isCurrentPlayerTurn(): boolean;
        isValidCurrentPlayerPosition(x: number, y: number): boolean;
        canSelectFences(): boolean;
        getNearestPositions(pawn: Position): {
            x: number;
            y: number;
        }[];
        getPossiblePositions(pawn: Position): {
            x: number;
            y: number;
        }[];
        getBusyFences(): FenceModelProps[];
        getValidPositions(pawn: Position, busyFences: FenceModelProps[]): {
            x: number;
            y: number;
        }[];
        generatePositions(boardSize: number): Record<number, number>;
        getAddNewCoordinateFunc(notVisitedPositions: Record<number, number>, open: {}[], newDeep?: {
            value: number;
        }): (validMoveCoordinate: Position) => void;
        doesFenceBreakPlayerPath(pawn: PlayerModel, coordinate: FenceModel): boolean | "invalid";
        notBreakSomePlayerPath(wall: FenceModel): boolean;
        isWallNearBorder(wall: Partial<FenceModelProps>): boolean;
        hasWallsOrPawnsNear(wall: Partial<FenceModelProps>): boolean;
        _getNearestWalls(wall: Partial<FenceModelProps>): {
            x: number;
            y: number;
            type: string;
        }[];
        getNearestWalls(wall: Partial<FenceModelProps>): {
            x: number;
            y: number;
            type: string;
        }[];
        breakSomePlayerPath(wall: FenceModel): boolean;
        copy(): BoardValidation;
    }
}
declare module "models/SmartBot" {
    import { Bot } from "models/Bot";
    import { PlayerModel } from "models/PlayerModel";
    import { BoardValidation } from "models/BoardValidation";
    import { Position } from "models/BackboneModel";
    type PositionWithDeep = Position & {
        deep: number;
    };
    type PlayerPosition = Position & {
        playerIndex: number;
    };
    export class SmartBot extends Bot {
        board: BoardValidation;
        player: PlayerModel;
        activePlayer: number;
        currentPlayer: number;
        playersCount: number;
        fencesRemaining: number;
        onMovePlayer: (params: PlayerPosition) => void;
        onMoveFence: (params: PlayerPosition & {
            type: "H" | "V";
        }) => void;
        onStart(currentPlayer: number, _activePlayer: number, history: {}[], playersCount: number, boardSize: number): void;
        getPossiblePosition(): {
            x: number;
            y: number;
        };
        findPathToGoal(player: PlayerModel, board: BoardValidation): PositionWithDeep[];
        processBoardForGoal(board: BoardValidation, player: PlayerModel): PositionWithDeep[];
        findGoal(closed: PositionWithDeep[], pawn: Position & {
            isWin(x: number, y: number): boolean;
        }): PositionWithDeep | undefined;
        buildPath(from: PositionWithDeep | undefined, to: {
            x?: number;
            y?: number;
        }, board: BoardValidation, closed: PositionWithDeep[], player: PlayerModel): PositionWithDeep[];
    }
}
declare module "models/MegaBot" {
    import { SmartBot } from "models/SmartBot";
    import { PlayerModel } from "models/PlayerModel";
    import { BoardValidation } from "models/BoardValidation";
    import { Position } from "models/BackboneModel";
    type Move = Position & {
        type: "H" | "V" | "P";
    };
    type Rate = Move & {
        rate: number;
    };
    type CallArgs = {
        moves: Move[];
        player: PlayerModel;
        board: BoardValidation;
        rates: Rate[];
    };
    type Callback = (err: string | null, data: CallArgs) => void;
    export class MegaBot extends SmartBot {
        possibleWallsMoves: Move[];
        satisfiedRate: number;
        doTurn(): void;
        getBestTurn(callback: (res: Move) => void): void;
        getRatesForPlayersMoves: ({ moves, player, board, rates }: CallArgs, callback: Callback) => void;
        getRatesForWallsMoves: ({ moves, player, board, rates }: CallArgs, callback: Callback) => void;
        calcHeuristic(_player: PlayerModel, board: BoardValidation): number;
        getCountStepsToGoal(player: PlayerModel, board: BoardValidation): number;
        initPossibleMoves(): void;
        getPossibleMoves(board: BoardValidation, player: PlayerModel): Move[];
        removePossibleWallsMove(move: Move): void;
        selectWallsMoves(): Move[];
    }
}
declare module "models/BotWrapper" {
    import { BackboneModel } from "models/BackboneModel";
    import { SmartBot } from "models/SmartBot";
    import { Bot } from "models/Bot";
    import { EventHandler } from "backbone";
    export class BotWrapper extends BackboneModel {
        currentPlayer: string;
        bot: Bot | SmartBot | Worker;
        initialize(): void;
        on(name: string, callback: EventHandler): this;
        trigger: (name: string, ...param: any[]) => this;
        terminate(): void;
    }
}
declare module "models/FieldModel" {
    import { BackboneCollection, BackboneModel, Position } from "models/BackboneModel";
    export class FieldModel extends BackboneModel<Position & {
        color: string;
    }> {
        getColor(playersPositions: {
            color: string;
            isWin(x: number, y: number): boolean;
        }[]): string;
    }
    export class FieldsCollection extends BackboneCollection<FieldModel> {
        model: typeof FieldModel;
        selectField(x: number, y: number): void;
        createFields(boardSize: number): void;
    }
}
declare module "models/TimerModel" {
    import { BackboneModel } from "models/BackboneModel";
    export class TimerModel extends BackboneModel {
        defaults: () => {
            playerNames: never[];
            timePrev: number;
            allTime: number;
            times: number[];
            time: number;
        };
        isStopped: boolean;
        interval: number;
        next(current: number): void;
        reset(): void;
        stop(): void;
    }
}
declare module "models/BoardModel" {
    import { BackboneModel } from "models/BackboneModel";
    import { BotWrapper } from "models/BotWrapper";
    import { FieldsCollection } from "models/FieldModel";
    import { FenceHModel, FencePosition, FencesCollection, FenceVModel } from "models/FenceModel";
    import { PlayersCollection } from "models/PlayerModel";
    import { TimerModel } from "models/TimerModel";
    import { GameHistoryModel } from "models/TurnModel";
    export class BoardModel extends BackboneModel {
        isPlayerMoved: boolean;
        isFenceMoved: boolean;
        auto: boolean;
        bots: BotWrapper[];
        fences: FencesCollection;
        fields: FieldsCollection;
        players: PlayersCollection;
        history: GameHistoryModel;
        timerModel: TimerModel;
        infoModel: BackboneModel;
        defaults: () => {
            botsCount: number;
            boardSize: number;
            playersCount: number;
            currentPlayer: null;
            activePlayer: null;
        };
        getActivePlayer(): import("models/PlayerModel").PlayerModel;
        getActiveBot(): BotWrapper | undefined;
        remoteEvents(_num: number): void;
        onSocketMovePlayer: (_model: {
            x: number;
            y: number;
            timeout?: number;
        }) => void;
        onSocketMoveFence(_pos: FencePosition): boolean;
        canSelectFences(): boolean;
        notBreakSomePlayerPath(_model: BackboneModel): boolean;
        isValidCurrentPlayerPosition(_x: number, _y: number): boolean;
        createModels(): void;
        initModels(): void;
        switchActivePlayer(): void;
        makeTurn(): void;
        getNextActiveBot(next: string): BotWrapper | undefined;
        emitEventToBots(eventName: string, param: any): void;
        isOnlineGame(): any;
        onMovePlayer(x: number, y: number): void;
        updateInfo(): void;
        onFenceSelected(model: FenceHModel | FenceVModel): void;
        initEvents(): void;
        run(activePlayer: number, currentPlayer: number): void;
        stop(): void;
        connectBots(): void;
        initialize(): void;
    }
}
declare module "models/BoardSocketEvents" {
    import { BoardValidation } from "public/models/BoardValidation";
    import { FencePosition } from "public/models/FenceModel";
    export class BoardSocketEvents extends BoardValidation {
        remoteEvents(currentPlayer: number): void;
        updateActivePlayer(): void;
        _onTurnSendSocketEvent(): void;
        onSocketMoveFence(pos: FencePosition): boolean;
        onSocketMovePlayer: (pos: {
            x: number;
            y: number;
            timeout?: number;
        }) => void;
        onStart(currentPlayer: 'error' | number, activePlayer: number, history: {}[]): void;
    }
}
declare module "models/BotWorker" { }
declare module "models/urlParser" {
    export const parseUrl: (url: string) => Record<string, string | string[]>;
}
declare module "views/backbone.raphael" {
    import { _Result, EventsHash, Model, View } from "backbone";
    export type RaphaelEl = Element & Partial<{
        toFront(): void;
        toBack(): void;
        text(x: number, y: number, t: string | number | undefined): Required<RaphaelEl>;
        rect(x: number, y: number, x2: number, y2: number): Required<RaphaelEl>;
        ellipse(x: number, y: number, x2: number, y2: number): Required<RaphaelEl>;
        attr(o: Record<string, any>): Required<RaphaelEl>;
        attr(a: string, t: string | number): Required<RaphaelEl>;
        type: string;
        unbindAll(): void;
    }>;
    export class RaphaelView<TModel extends (Model) = Model, TElement extends RaphaelEl = HTMLElement> extends View<TModel, TElement> {
        delegated: boolean;
        setElement(element: TElement, delegate?: boolean, undelegateEvents?: boolean): this;
        delegateEvents(events?: _Result<EventsHash>, undelegateEvents?: boolean): this;
        undelegateEvents(): this;
    }
}
declare module "views/GameObject" {
    import { RaphaelEl, RaphaelView } from "views/backbone.raphael";
    import { BackboneModel } from "models/BackboneModel";
    export const ViewOptions: {
        paper: RaphaelEl | undefined;
        startX: number;
        startY: number;
        squareWidth: number;
        squareHeight: number;
        squareDistance: number;
        borderDepth: number;
        getPaper(): Required<RaphaelEl>;
    };
    export class GameObject<TModel extends (BackboneModel) = BackboneModel> extends RaphaelView<TModel, RaphaelEl> {
        template: string;
    }
}
declare module "views/FieldView" {
    import { GameObject } from "views/GameObject";
    import { FieldModel } from "models/FieldModel";
    export class FieldView extends GameObject<FieldModel> {
        defaults: {
            color: string;
        };
        model: FieldModel;
        defaultColor: string;
        events: () => {
            click: string;
            mouseover: string;
            mouseout: string;
        };
        initialize(options: {
            attributes: {
                defaultColor?: string;
            };
        }): void;
        selectCurrent(): void;
        markCurrent(): void;
        unSelectCurrent(): void;
        movePlayer(): void;
        onSelectFieldBefore(): void;
        render(): this;
    }
}
declare module "views/FenceView" {
    import { GameObject } from "views/GameObject";
    import { FenceHModel, FenceVModel } from "models/FenceModel";
    import { RaphaelEl } from "views/backbone.raphael";
    export class FenceView extends GameObject {
        events: () => {
            click: string;
            mouseover: string;
            mouseout: string;
        };
        onClick(): void;
        highlightCurrentAndSibling(): void;
        resetCurrentAndSibling(): void;
        initialize(): void;
        render(): this;
        createElement(): null | RaphaelEl;
    }
    export function createFenceView(model: FenceHModel | FenceVModel): FenceHView | FenceVView;
    export class FenceHView extends FenceView {
        createElement(): Required<RaphaelEl>;
    }
    export class FenceVView extends FenceView {
        createElement(): Required<RaphaelEl>;
    }
}
declare module "views/PlayerView" {
    import { GameObject } from "views/GameObject";
    export class PlayerView extends GameObject {
        initialize(): void;
        markAsCurrent(): void;
        resetState(): void;
        getPosX(x: number): number;
        getPosY(y: number): number;
        render(): this;
    }
}
declare module "views/InfoView" {
    import { GameObject } from "views/GameObject";
    import { Position } from "models/BackboneModel";
    import { RaphaelEl } from "views/backbone.raphael";
    export class InfoView extends GameObject {
        fences: (Required<RaphaelEl>)[];
        private current;
        private active;
        playersPositions: (Position & {
            color: string;
        })[];
        initialize(params: {
            attributes: (Position & {
                color: string;
            })[];
        }): void;
        render(): this;
        drawRemainingFences(): void;
        clearFences(): void;
        displayActivePlayer(): void;
        displayCurrentPlayer(): void;
        displayPlayer(index: number, dx: number, dy: number, text: string): [Required<RaphaelEl>, Required<RaphaelEl>] | undefined;
    }
}
declare module "views/TimerView" {
    import { View } from "backbone";
    export class TimerView extends View {
        template: string;
        initialize(): void;
        render(): this;
    }
}
declare module "views/GameHistoryView" {
    import { View } from "backbone";
    import { GameHistoryModel } from "models/TurnModel";
    import { BackboneModel } from "models/BackboneModel";
    export class GameHistoryView<TModel extends (BackboneModel) = GameHistoryModel> extends View<TModel> {
        template: string;
        initialize(): void;
        render(): this;
    }
}
declare module "views/BoardView" {
    import { GameObject } from "views/GameObject";
    import { BoardValidation } from "models/BoardValidation";
    export class BoardView extends GameObject<BoardValidation> {
        selector: string;
        events: () => {
            click: string;
        };
        move(): void;
        render(): this;
        initialize(): void;
        renderLegend(): void;
        drawBorders(): void;
        afterRender(): void;
    }
}
