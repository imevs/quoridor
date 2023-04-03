var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define("views/backbone.raphael", ["require", "exports", "backbone", "underscore"], function (require, exports, backbone_1, underscore_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RaphaelView = void 0;
    underscore_1 = __importDefault(underscore_1);
    class RaphaelView extends backbone_1.View {
        constructor() {
            super(...arguments);
            this.delegated = false;
        }
        setElement(element, delegate = false, undelegateEvents = false) {
            if (this.el && undelegateEvents)
                this.undelegateEvents();
            this.el = element;
            if (delegate !== false)
                this.delegateEvents();
            return this;
        }
        delegateEvents(events, undelegateEvents = false) {
            if (!(events || (events = underscore_1.default.result(this, 'events'))))
                return this;
            if (this.delegated)
                return this;
            this.delegated = true;
            const eventsObj = events;
            if (undelegateEvents)
                this.undelegateEvents();
            for (const eventName in events) {
                let method = eventsObj[eventName];
                if (!underscore_1.default.isFunction(method) && method !== undefined) {
                    method = this[method];
                }
                if (!method)
                    continue;
                method = underscore_1.default.bind(method, this);
                if (this.el[eventName]) {
                    this.el[eventName](method);
                }
                else {
                    this.on(eventName, method);
                }
            }
            return this;
        }
        undelegateEvents() {
            var _a, _b;
            if (this.el.type)
                (_b = (_a = this.el).unbindAll) === null || _b === void 0 ? void 0 : _b.call(_a);
            return this;
        }
    }
    exports.RaphaelView = RaphaelView;
});
define("models/BackboneModel", ["require", "exports", "backbone"], function (require, exports, backbone_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BackboneCollection = exports.BackboneModel = void 0;
    class BackboneModel extends backbone_2.Model {
        get(attributeName) {
            var _a, _b, _c;
            const defs = (_b = (_a = this.defaults) === null || _a === void 0 ? void 0 : _a.call(this)) !== null && _b !== void 0 ? _b : {};
            return (_c = super.get(attributeName)) !== null && _c !== void 0 ? _c : defs[attributeName];
        }
    }
    exports.BackboneModel = BackboneModel;
    class BackboneCollection extends backbone_2.Collection {
        findWhere(properties) {
            return super.findWhere(properties);
        }
    }
    exports.BackboneCollection = BackboneCollection;
});
define("views/GameObject", ["require", "exports", "views/backbone.raphael"], function (require, exports, backbone_raphael_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GameObject = exports.ViewOptions = void 0;
    exports.ViewOptions = {
        paper: undefined,
        startX: 0,
        startY: 100,
        squareWidth: 50,
        squareHeight: 30,
        squareDistance: 10,
        borderDepth: 20,
        getPaper() {
            var _a;
            return (_a = exports.ViewOptions.paper) !== null && _a !== void 0 ? _a : (exports.ViewOptions.paper = new window.Raphael('holder', 580, 540));
        }
    };
    class GameObject extends backbone_raphael_1.RaphaelView {
    }
    exports.GameObject = GameObject;
});
define("models/utils", ["require", "exports", "underscore"], function (require, exports, underscore_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.iter = void 0;
    underscore_2 = __importDefault(underscore_2);
    const iter = (params, callback) => {
        let i = 0, j = 0;
        const i_max = params[0], j_max = params[1];
        (0, underscore_2.default)(i_max).times(() => {
            j = 0;
            (0, underscore_2.default)(j_max).times(() => {
                callback(i, j);
                j++;
            });
            i++;
        });
    };
    exports.iter = iter;
});
define("models/FieldModel", ["require", "exports", "models/BackboneModel", "models/utils"], function (require, exports, BackboneModel_1, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FieldsCollection = exports.FieldModel = void 0;
    class FieldModel extends BackboneModel_1.BackboneModel {
        getColor(playersPositions) {
            let color = '';
            playersPositions.some(pos => {
                if ((this.get('x') === 0 || this.get('x') === 8) &&
                    (this.get('y') === 0 || this.get('y') === 8)) {
                    return false;
                }
                const win = pos.isWin(this.get('x'), this.get('y'));
                if (win) {
                    color = pos.color;
                }
                return win;
            });
            return color;
        }
        selectField() {
            this.trigger('selectfield');
        }
    }
    exports.FieldModel = FieldModel;
    class FieldsCollection extends BackboneModel_1.BackboneCollection {
        constructor() {
            super(...arguments);
            this.model = FieldModel;
        }
        createFields(boardSize) {
            const me = this;
            (0, utils_1.iter)([boardSize, boardSize], (i, j) => {
                me.add({ x: i, y: j });
            });
        }
    }
    exports.FieldsCollection = FieldsCollection;
});
define("views/FieldView", ["require", "exports", "views/GameObject"], function (require, exports, GameObject_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FieldView = void 0;
    class FieldView extends GameObject_1.GameObject {
        defaults() {
            return {
                color: '#742'
            };
        }
        events() {
            return {
                click: this.movePlayer,
                mouseover: this.onSelectFieldBefore,
                mouseout: this.unSelectCurrent
            };
        }
        initialize() {
            const cls = GameObject_1.ViewOptions;
            const model = this.model;
            model.set('color', this.defaults().color);
            this.listenTo(model, 'change', this.render);
            this.listenTo(model, 'selectfield', this.selectCurrent);
            this.listenTo(model, 'markfield', this.markCurrent);
            const w = cls.squareWidth, h = cls.squareHeight, d = cls.squareDistance, color = model.get('color');
            const i = model.get('x'), j = model.get('y');
            const x = (w + d) * i + cls.startX + cls.borderDepth;
            const y = (h + d) * j + cls.startY + cls.borderDepth;
            const obj = cls.getPaper().rect(x, y, w, h);
            obj.attr('fill', color);
            obj.attr('stroke-width', 0);
            this.setElement(obj);
        }
        selectCurrent() {
            this.model.set({ color: 'black' });
        }
        markCurrent() {
            this.model.set({ color: 'gray' });
        }
        unSelectCurrent() {
            this.model.set({ color: this.defaults().color });
        }
        movePlayer() {
            this.model.trigger('moveplayer', this.model.get('x'), this.model.get('y'));
            this.unSelectCurrent();
        }
        onSelectFieldBefore() {
            this.model.trigger('beforeselectfield', this.model.get('x'), this.model.get('y'), this.model);
        }
        render() {
            const circle = this.el;
            const model = this.model;
            circle.attr({
                fill: model.get('color')
            });
            return this;
        }
    }
    exports.FieldView = FieldView;
});
define("models/FenceModel", ["require", "exports", "underscore", "models/BackboneModel", "models/utils"], function (require, exports, underscore_3, BackboneModel_2, utils_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FencesCollection = exports.FenceModel = void 0;
    underscore_3 = __importDefault(underscore_3);
    class FenceModel extends BackboneModel_2.BackboneModel {
        defaults() {
            return {
                color: '#c75',
                orientation: "H",
            };
        }
        initialize() {
            this.on({
                'movefence': () => {
                    this.set('state', 'prebusy');
                },
                'markfence': () => {
                    if (!this.get('state')) {
                        this.set('state', 'highlight');
                    }
                },
                'unmarkfence': () => {
                    if (this.get('state') === 'highlight') {
                        this.set('state', '');
                    }
                },
                'change:state': this.onChangeState
            });
        }
        onChangeState() {
            if (this.get('state') === 'prebusy') {
                this.set({
                    color: 'black',
                    prevcolor: 'black'
                });
            }
            if (this.get('state') === '') {
                this.set({
                    color: this.defaults().color,
                    prevcolor: ''
                });
            }
            if (this.get('state') === 'highlight') {
                this.set({
                    color: 'black',
                    prevcolor: this.get('color')
                });
            }
        }
        getAdjacentFencePosition() {
            if (this.get('orientation') === 'H') {
                return {
                    x: this.get('x') - 1,
                    y: this.get('y')
                };
            }
            else {
                return {
                    x: this.get('x'),
                    y: this.get('y') - 1
                };
            }
        }
    }
    exports.FenceModel = FenceModel;
    class FencesCollection extends BackboneModel_2.BackboneCollection {
        constructor() {
            super(...arguments);
            this.model = FenceModel;
        }
        initialize() {
            this.on('premarkasselected', this.clearBusy, this);
        }
        createFences(boardSize, fences = []) {
            const me = this;
            (0, utils_2.iter)([boardSize, boardSize - 1], (i, j) => {
                me.add({ x: i, y: j, orientation: 'H' });
            });
            (0, utils_2.iter)([boardSize - 1, boardSize], (i, j) => {
                me.add({ x: i, y: j, orientation: 'V' });
            });
            fences.forEach(fence => {
                const find = me.findWhere({
                    x: fence.x,
                    y: fence.y,
                    orientation: fence.orientation
                });
                const sibling = me.getSibling(find);
                find === null || find === void 0 ? void 0 : find.set('state', 'busy');
                sibling === null || sibling === void 0 ? void 0 : sibling.set('state', 'busy');
            });
        }
        clearBusy() {
            (0, underscore_3.default)(this.where({ state: 'prebusy' })).each(fence => {
                fence.set({ state: '' });
            });
        }
        getPreBusy() {
            return this.where({ state: 'prebusy' });
        }
        setBusy() {
            this.getPreBusy().forEach(fence => {
                fence.set({ state: 'busy' });
            });
        }
        getMovedFence() {
            const fences = this.getPreBusy();
            return underscore_3.default.chain(fences)
                .sortBy(i => i.get('x'))
                .sortBy(i => i.get('y'))
                .last().value();
        }
        getSibling(item) {
            const siblingPosition = item && item.getAdjacentFencePosition();
            return siblingPosition && this.findWhere({
                x: siblingPosition.x,
                y: siblingPosition.y,
                orientation: item.get('orientation')
            });
        }
        triggerEventOnFenceAndSibling(item, event) {
            const sibling = this.getSibling(item);
            if (sibling && event) {
                sibling.trigger(event);
                item.trigger(event);
            }
        }
        validateFenceAndSibling(item) {
            if (!item) {
                return false;
            }
            if (this.isBusy(item)) {
                return false;
            }
            if (!this.isFencePlaceable(item)) {
                return false;
            }
            const sibling = this.getSibling(item);
            return !!(sibling && !this.isBusy(sibling));
        }
        validateAndTriggerEventOnFenceAndSibling(item, event) {
            const shouldTriggerEvent = this.validateFenceAndSibling(item);
            if (shouldTriggerEvent && event) {
                item.trigger('pre' + event);
                item.trigger(event);
                const sibling = this.getSibling(item);
                sibling === null || sibling === void 0 ? void 0 : sibling.trigger(event);
            }
            return shouldTriggerEvent;
        }
        isBusy(item) {
            return item.get('state') === 'busy';
        }
        isFencePlaceable(item) {
            let type, i, j;
            if (item.get('orientation') === 'V') {
                type = 'H';
                i = 'y';
                j = 'x';
            }
            else {
                type = 'V';
                i = 'x';
                j = 'y';
            }
            const attrs = { state: 'busy', orientation: type, x: 0, y: 0 };
            attrs[i] = item.get(i) - 1;
            const prevLine = this.where(attrs);
            const f1 = (0, underscore_3.default)(prevLine).find(model => {
                return model.get(j) === item.get(j);
            });
            const f2 = (0, underscore_3.default)(prevLine).find(model => {
                return model.get(j) === item.get(j) + 1;
            });
            return !(f1 && f2);
        }
    }
    exports.FencesCollection = FencesCollection;
});
define("views/FenceView", ["require", "exports", "views/GameObject"], function (require, exports, GameObject_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FenceVView = exports.FenceHView = exports.createFenceView = exports.FenceView = void 0;
    class FenceView extends GameObject_2.GameObject {
        events() {
            return {
                click: this.onClick,
                mouseover: this.highlightCurrentAndSibling,
                mouseout: this.resetCurrentAndSibling,
            };
        }
        onClick() {
            this.model.trigger('selected', this.model);
        }
        highlightCurrentAndSibling() {
            this.model.trigger('highlight_current_and_sibling', this.model);
        }
        resetCurrentAndSibling() {
            this.model.trigger('reset_current_and_sibling', this.model);
        }
        initialize() {
            this.model.on({
                'change:color': this.render
            }, this);
            const obj = this.createElement();
            if (obj) {
                this.setElement(obj);
            }
        }
        render() {
            const circle = this.el;
            const model = this.model;
            if (model.get('state') === 'prebusy') {
                circle.toFront();
            }
            if (model.get('state') === '') {
                circle.toBack();
            }
            if (model.get('state') === 'highlight') {
                circle.toFront();
            }
            circle.attr({ fill: model.get('color') });
            return this;
        }
        createElement() { return null; }
    }
    exports.FenceView = FenceView;
    function createFenceView(model) {
        return model.get("orientation") === "H"
            ? new FenceHView({ model: model })
            : new FenceVView({ model: model });
    }
    exports.createFenceView = createFenceView;
    class FenceHView extends FenceView {
        createElement() {
            const cls = GameObject_2.ViewOptions;
            const w = cls.squareWidth, h = cls.squareDistance, dh = cls.squareHeight, dw = cls.squareDistance;
            const i = this.model.get('x'), j = this.model.get('y'), color = this.model.get('color');
            const x = (w + dw) * i + cls.startX - dw / 2 + cls.borderDepth;
            const y = (h + dh) * j + cls.startY + dh + cls.borderDepth;
            const obj = cls.getPaper().rect(x, y, w + dw + 1, h);
            obj.attr('fill', color);
            obj.attr('stroke-width', 0);
            return obj;
        }
    }
    exports.FenceHView = FenceHView;
    class FenceVView extends FenceView {
        createElement() {
            const cls = GameObject_2.ViewOptions;
            const model = this.model;
            const i = model.get('x'), j = model.get('y'), color = model.get('color');
            const w = cls.squareDistance, h = cls.squareHeight, dh = cls.squareDistance, dw = cls.squareWidth;
            const x = (w + dw) * i + cls.startX + dw + cls.borderDepth;
            const y = (h + dh) * j + cls.startY - dh / 2 + cls.borderDepth;
            const obj = cls.getPaper().rect(x, y, w, h + dh + 1);
            obj.attr('fill', color);
            obj.attr('stroke-width', 0);
            return obj;
        }
    }
    exports.FenceVView = FenceVView;
});
define("models/PlayerModel", ["require", "exports", "underscore", "models/BackboneModel"], function (require, exports, underscore_4, BackboneModel_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PlayersCollection = exports.PlayerModel = void 0;
    underscore_4 = __importDefault(underscore_4);
    class PlayerModel extends BackboneModel_3.BackboneModel {
        defaults() {
            return {
                fencesRemaining: 0
            };
        }
        ;
        initialize() {
            this.set('prev_x', this.get('x'));
            this.set('prev_y', this.get('y'));
        }
        moveTo(x, y) {
            this.set({ x: x, y: y });
        }
        placeFence() {
            this.set('fencesRemaining', this.get('fencesRemaining') - 1);
        }
        hasFences() {
            return this.get('fencesRemaining') > 0;
        }
        reset() {
            this.set({ id: '', state: '' });
        }
        isBot() {
            return this.get('type') === 'bot';
        }
    }
    exports.PlayerModel = PlayerModel;
    class PlayersCollection extends BackboneModel_3.BackboneCollection {
        constructor() {
            super(...arguments);
            this.model = PlayerModel;
            this.fencesCount = 20;
        }
        initialize(players) {
            const me = this;
            this.playersPositions = [
                { x: 4, y: 0, color: '#d2322d', name: 'red', isWin: (_x, y) => { return y === 8; } },
                { x: 8, y: 4, color: '#3477B2', name: 'blue', isWin: x => { return x === 0; } },
                { x: 4, y: 8, color: 'green', name: 'green', isWin: (_x, y) => { return y === 0; } },
                { x: 0, y: 4, color: '#ed9c28', name: 'orange', isWin: x => { return x === 8; } }
            ];
            players && players.forEach((player, i) => {
                player.url = i;
                if (player.movedFences !== undefined) {
                    const fences = Math.round(me.fencesCount / players.length);
                    player.fencesRemaining = fences - player.movedFences;
                }
            });
            if (players && players.length === 2 && me.playersPositions.length === 4) {
                me.playersPositions.splice(3, 1);
                me.playersPositions.splice(1, 1);
            }
        }
        getPlayerNames() {
            return (0, underscore_4.default)(this.playersPositions).pluck('name');
        }
        getNextActivePlayer(currentPlayer) {
            this.checkWin(currentPlayer);
            const current = this.at(currentPlayer);
            current.set({
                'prev_x': current.get('x'),
                'prev_y': current.get('y')
            });
            return (currentPlayer + 1) < this.length ? (currentPlayer + 1) : 0;
        }
        checkWin(playerIndex) {
            const pos = this.at(playerIndex).pick('x', 'y'), x = pos.x, y = pos.y;
            if (this.playersPositions[playerIndex].isWin(x, y)) {
                this.trigger('win', playerIndex);
                return true;
            }
            return false;
        }
        createPlayers(playersCount) {
            const me = this;
            playersCount = +playersCount;
            if (playersCount === 2 && me.playersPositions.length === 4) {
                me.playersPositions.splice(3, 1);
                me.playersPositions.splice(1, 1);
            }
            const fences = Math.round(me.fencesCount / playersCount);
            (0, underscore_4.default)(playersCount).times(player => {
                const position = me.playersPositions[player];
                const model = new PlayerModel({
                    url: player,
                    color: position.color,
                    x: position.x,
                    prev_x: position.x,
                    y: position.y,
                    prev_y: position.y,
                    fencesRemaining: fences
                });
                me.add(model);
            });
        }
        initPlayerPositions() {
            const me = this;
            this.each((player, i) => {
                const position = me.playersPositions[i];
                const fences = Math.round(me.fencesCount / me.length);
                player.set({
                    url: i,
                    x: position.x,
                    prev_x: position.x,
                    y: position.y,
                    prev_y: position.y,
                    fencesRemaining: fences
                });
            });
        }
        isFieldBusy(pos) {
            const p0 = this.at(0);
            const p1 = this.at(1);
            if (this.length === 2) {
                return p0.get('x') === pos.x && p0.get('y') === pos.y ||
                    p1.get('x') === pos.x && p1.get('y') === pos.y;
            }
            if (this.length === 4) {
                const p2 = this.at(2);
                const p3 = this.at(3);
                return p0.get('x') === pos.x && p0.get('y') === pos.y ||
                    p1.get('x') === pos.x && p1.get('y') === pos.y ||
                    p2.get('x') === pos.x && p2.get('y') === pos.y ||
                    p3.get('x') === pos.x && p3.get('y') === pos.y;
            }
            return false;
        }
        isBetween(n1, n2, n3) {
            let min, max;
            if (n1 > n2) {
                min = n2;
                max = n1;
            }
            else {
                min = n1;
                max = n2;
            }
            return min < n3 && n3 < max;
        }
        isFieldBehindOtherPlayer(pos1, pos2) {
            const me = this;
            const playerX = pos1.x, playerY = pos1.y, x = pos2.x, y = pos2.y;
            const distanceBetweenPositions = playerX === x && Math.abs(playerY - y)
                || playerY === y && Math.abs(playerX - x) || 0;
            if (distanceBetweenPositions !== 2) {
                return false;
            }
            const callback1 = (item) => {
                return y === item.get('prev_y') && me.isBetween(playerX, x, item.get('prev_x'));
            };
            const callback2 = (item) => {
                return x === item.get('prev_x') && me.isBetween(playerY, y, item.get('prev_y'));
            };
            return this.getCountByCondition(playerY === y ? callback1 : callback2) === 1;
        }
        getCountByCondition(callback) {
            let busyFieldsBetweenPositionLength = 0;
            for (let i = 0, len = this.length; i < len; i++) {
                if (callback(this.at(i))) {
                    busyFieldsBetweenPositionLength++;
                }
            }
            return busyFieldsBetweenPositionLength;
        }
        isFieldNearOtherPlayer(pos1, pos2) {
            const isDiagonal = Math.abs(pos1.x - pos2.x) === 1 && Math.abs(pos1.y - pos2.y) === 1;
            if (!isDiagonal) {
                return false;
            }
            return !!(this.hasTwoVerticalSibling(pos1, pos2) || this.hasTwoHorizontalSiblings(pos1, pos2));
        }
        hasTwoVerticalSibling(pos1, pos2) {
            const playerX = pos1.x, playerY = pos1.y, y = pos2.y;
            const diffY = playerY - y;
            return this.isPrevFieldBusy({ x: playerX, y: playerY - diffY })
                && this.isPrevFieldBusy({ x: playerX, y: playerY - diffY * 2 });
        }
        hasTwoHorizontalSiblings(pos1, pos2) {
            const playerX = pos1.x, playerY = pos1.y, x = pos2.x;
            const diffX = playerX - x;
            return this.isPrevFieldBusy({ x: playerX - diffX, y: playerY })
                && this.isPrevFieldBusy({ x: playerX - diffX * 2, y: playerY });
        }
        isPrevFieldBusy(pos) {
            const p0 = this.at(0);
            const p1 = this.at(1);
            const nameX = 'prev_x';
            const nameY = 'prev_y';
            if (this.length === 2) {
                return p0.get(nameX) === pos.x && p0.get(nameY) === pos.y ||
                    p1.get(nameX) === pos.x && p1.get(nameY) === pos.y;
            }
            if (this.length === 4) {
                const p2 = this.at(2);
                const p3 = this.at(3);
                return p0.get(nameX) === pos.x && p0.get(nameY) === pos.y ||
                    p1.get(nameX) === pos.x && p1.get(nameY) === pos.y ||
                    p2.get(nameX) === pos.x && p2.get(nameY) === pos.y ||
                    p3.get(nameX) === pos.x && p3.get(nameY) === pos.y;
            }
            return false;
        }
        updatePlayersPositions() {
            this.each(item => {
                if (item.get('x') !== item.get('prev_x') ||
                    item.get('y') !== item.get('prev_y')) {
                    item.set({
                        x: item.get('prev_x'),
                        y: item.get('prev_y')
                    });
                }
            });
        }
    }
    exports.PlayersCollection = PlayersCollection;
});
define("views/PlayerView", ["require", "exports", "views/GameObject"], function (require, exports, GameObject_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PlayerView = void 0;
    class PlayerView extends GameObject_3.GameObject {
        initialize() {
            const cls = GameObject_3.ViewOptions;
            const model = this.model;
            this.listenTo(model, 'change', this.render);
            this.listenTo(model, 'resetstate', this.resetState);
            this.listenTo(model, 'setcurrent', this.markAsCurrent);
            const color = model.get('color'), w = cls.squareWidth, h = cls.squareHeight, x = this.getPosX(model.get('x')), y = this.getPosY(model.get('y'));
            const obj = cls.getPaper().ellipse(x, y, (w - 10) / 2, (h - 10) / 2);
            obj.attr('fill', color);
            this.setElement(obj);
        }
        markAsCurrent() {
            var _a, _b;
            (_b = (_a = this.el).attr) === null || _b === void 0 ? void 0 : _b.call(_a, { 'stroke-width': 3 });
        }
        resetState() {
            var _a, _b;
            (_b = (_a = this.el).attr) === null || _b === void 0 ? void 0 : _b.call(_a, { 'stroke-width': 1 });
        }
        getPosX(x) {
            const cls = GameObject_3.ViewOptions, w = cls.squareWidth, d = cls.squareDistance;
            return (w + d) * x + cls.startX + w / 2 + cls.borderDepth;
        }
        getPosY(y) {
            const cls = GameObject_3.ViewOptions, h = cls.squareHeight, d = cls.squareDistance;
            return (h + d) * y + cls.startY + h / 2 + cls.borderDepth;
        }
        render() {
            var _a, _b;
            (_b = (_a = this.el).attr) === null || _b === void 0 ? void 0 : _b.call(_a, {
                fill: this.model.get('color'),
                cx: this.getPosX(this.model.get('x')),
                cy: this.getPosY(this.model.get('y'))
            });
            return this;
        }
    }
    exports.PlayerView = PlayerView;
});
define("models/TurnModel", ["require", "exports", "underscore", "models/BackboneModel"], function (require, exports, underscore_5, BackboneModel_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GameHistoryModel = exports.TurnsCollection = exports.TurnModel = void 0;
    underscore_5 = __importDefault(underscore_5);
    let boardSize = 9;
    class TurnModel extends BackboneModel_4.BackboneModel {
        constructor() {
            super(...arguments);
            this.alpha = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k'];
        }
        defaults() {
            return {
                x: 0,
                y: 0,
            };
        }
        intToChar(i) {
            return this.alpha[+i];
        }
        getX(x) {
            if (this.get('debug')) {
                return x + ':';
            }
            return this.intToChar(x);
        }
        getY(y) {
            if (this.get('debug')) {
                return y + '';
            }
            return (boardSize - y) + "";
        }
        toString() {
            const dy = this.get('y') === this.get('y2') ? 1 : 0;
            return this.get('t') === 'p'
                ? this.getX(this.get('x')) + this.getY(this.get('y')) + ''
                : this.getX(this.get('x')) + this.getY(this.get('y') + dy) +
                    this.getX(this.get('x2')) + this.getY(this.get('y2') + dy) + '';
        }
        toJSON() {
            const result = Object.assign({}, this.attributes);
            delete result.debug;
            return result;
        }
    }
    exports.TurnModel = TurnModel;
    class TurnsCollection extends BackboneModel_4.BackboneCollection {
        constructor() {
            super(...arguments);
            this.model = TurnModel;
        }
        toJSON() {
            return this.map(function (model) { return model.toJSON(); });
        }
        reset(models, options) {
            return super.reset(models, options);
        }
    }
    exports.TurnsCollection = TurnsCollection;
    class GameHistoryModel extends BackboneModel_4.BackboneModel {
        defaults() {
            return {
                playerNames: [],
            };
        }
        getPlayerPositions() {
            const positions = [], self = this;
            const playersCount = this.get('playersCount');
            (0, underscore_5.default)(underscore_5.default.range(playersCount)).each(index => {
                const playerPositions = self.get('turns').filter((v, i) => {
                    const b = (i - index) % playersCount === 0;
                    return v.get('t') === 'p' && b;
                });
                const playerFences = self.get('turns').filter((v, i) => {
                    const b = (i - index) % playersCount === 0;
                    return v.get('t') === 'f' && b;
                });
                const playerInfo = underscore_5.default.last(playerPositions);
                if (playerInfo) {
                    const info = playerInfo.pick('x', 'y');
                    positions[index] = Object.assign(Object.assign({}, info), { movedFences: playerFences.length });
                }
            });
            return positions;
        }
        getFencesPositions() {
            const filter = this.get('turns').filter(val => {
                return val.get('t') === 'f';
            });
            return filter.map(model => {
                const item = model.pick('x', 'x2', 'y', 'y2');
                return Object.assign(Object.assign({}, item), { t: item.x === item.x2 ? 'V' : (item.y === item.y2 ? 'H' : '') });
            });
        }
        add(turnInfo) {
            turnInfo.debug = this.get('debug');
            const turn = new TurnModel(turnInfo);
            this.get('turns').add(turn);
            this.trigger('change');
        }
        at(index) {
            const turnsLength = this.get('turns').length / this.get('playersCount');
            if (index > turnsLength) {
                return 'error';
            }
            const self = this;
            const result = [];
            const startIndex = index * this.get('playersCount');
            const playersCount = self.get('playersCount');
            const turns = this.get('turns').filter((_value, index) => {
                return index >= startIndex && index < startIndex + playersCount;
            });
            (0, underscore_5.default)(turns).each(value => {
                result.push(value + '');
            });
            return result.join(' ');
        }
        getLength() {
            return Math.ceil(this.get('turns').length / this.get('playersCount'));
        }
        initPlayers() {
            const playersCount = this.get('playersCount');
            const self = this;
            if (playersCount === 2 && self.playersPositions.length !== 2) {
                self.playersPositions.splice(3, 1);
                self.playersPositions.splice(1, 1);
            }
            (0, underscore_5.default)(underscore_5.default.range(playersCount)).each(index => {
                const playersPosition = self.playersPositions[index];
                self.add(Object.assign(Object.assign({}, playersPosition), { t: 'p' }));
            });
        }
        initialize(params) {
            var _a, _b;
            this.set({
                turns: new TurnsCollection(),
                boardSize: (_a = params === null || params === void 0 ? void 0 : params.boardSize) !== null && _a !== void 0 ? _a : 9,
                playersCount: (_b = params === null || params === void 0 ? void 0 : params.playersCount) !== null && _b !== void 0 ? _b : 2,
            });
            this.playersPositions = [
                { x: 4, y: 0 },
                { x: 8, y: 4 },
                { x: 4, y: 8 },
                { x: 0, y: 4 }
            ];
        }
    }
    exports.GameHistoryModel = GameHistoryModel;
});
define("models/Bot", ["require", "exports", "underscore", "models/BackboneModel", "models/TurnModel"], function (require, exports, underscore_6, BackboneModel_5, TurnModel_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Bot = void 0;
    underscore_6 = __importDefault(underscore_6);
    class Bot extends BackboneModel_5.BackboneModel {
        get playerId() {
            var _a;
            return (_a = this._playerId) !== null && _a !== void 0 ? _a : null;
        }
        get currentPlayer() {
            var _a;
            return (_a = this._currentPlayer) !== null && _a !== void 0 ? _a : null;
        }
        get playersCount() {
            var _a;
            return (_a = this._playersCount) !== null && _a !== void 0 ? _a : null;
        }
        get fencesPositions() {
            var _a;
            return (_a = this._fencesPositions) !== null && _a !== void 0 ? _a : [];
        }
        get newPositions() {
            var _a;
            return (_a = this._newPositions) !== null && _a !== void 0 ? _a : [];
        }
        constructor(id) {
            super();
            this.fencesRemaining = 0;
            this.attemptsCount = 0;
            this.fencesCount = 20;
            this.setDelay = setTimeout;
            this.random = underscore_6.default.random;
            this.id = id;
            this._playerId = id;
            this.initEvents();
        }
        startGame(currentPlayer, activePlayer, history, playersCount) {
            this.onStart(currentPlayer, activePlayer, history, playersCount, 9);
            if (currentPlayer === activePlayer) {
                this.turn();
            }
        }
        onStart(currentPlayer, _activePlayer, history, playersCount, boardSize) {
            var _a, _b;
            this._playersCount = playersCount;
            const turns = new TurnModel_1.TurnsCollection();
            const historyModel = new TurnModel_1.GameHistoryModel({
                turns: turns,
                boardSize: boardSize,
                playersCount: playersCount
            });
            turns.reset(history);
            const playerPositions = historyModel.getPlayerPositions();
            const position = playerPositions[currentPlayer];
            if (position) {
                this.x = (_a = position.x) !== null && _a !== void 0 ? _a : 0;
                this.y = (_b = position.y) !== null && _b !== void 0 ? _b : 0;
                this._newPositions = [];
                this._fencesPositions = [];
                this._currentPlayer = currentPlayer;
                this.fencesRemaining = Math.round(this.fencesCount / playersCount) - position.movedFences;
            }
        }
        getNextActivePlayer(currentPlayer) {
            var _a;
            currentPlayer++;
            return currentPlayer < ((_a = this.playersCount) !== null && _a !== void 0 ? _a : 0) ? currentPlayer : 0;
        }
        initEvents() {
            this.on('server_move_player', this.onMovePlayer, this);
            this.on('server_move_fence', this.onMoveFence, this);
            this.on('server_start', this.startGame, this);
            this.on('server_turn_fail', this.makeTurn, this);
        }
        isPlayerCanMakeTurn(playerIndex) {
            return this.currentPlayer === this.getNextActivePlayer(playerIndex);
        }
        onMovePlayer(params) {
            if (this.currentPlayer === params.playerIndex) {
                this.x = params.x;
                this.y = params.y;
            }
            if (this.isPlayerCanMakeTurn(params.playerIndex)) {
                this.turn();
            }
        }
        onMoveFence(params) {
            if (this.currentPlayer === params.playerIndex) {
                this.fencesRemaining--;
            }
            if (this.isPlayerCanMakeTurn(params.playerIndex)) {
                this.turn();
            }
        }
        turn() {
            this.attemptsCount = 0;
            this._newPositions = this.getJumpPositions();
            this.makeTurn();
        }
        makeTurn() {
            this.attemptsCount++;
            if (this.attemptsCount > 50) {
                console.warn('bot can`t make a turn');
                return;
            }
            this.setDelay.call(window, () => this.doTurn(), 1000);
        }
        getFencePosition() {
            const y = this.random(0, 8);
            const x = this.random(0, 8);
            const type = this.random(0, 1) ? 'H' : 'V';
            const res = { y: y, x: x, type: type };
            if ((0, underscore_6.default)(this.fencesPositions).contains(res)) {
                return this.getFencePosition();
            }
            this.fencesPositions.push(res);
            return res;
        }
        doTurn() {
            const bot = this;
            const random = this.random(0, 1);
            if (bot.canMovePlayer() && (random || !bot.canMoveFence())) {
                let playerPosition = bot.getPossiblePosition();
                if (playerPosition) {
                    bot.trigger('client_move_player', playerPosition);
                }
                return;
            }
            if (bot.canMoveFence()) {
                const res = this.getFencePosition();
                const eventInfo = {
                    x: res.x,
                    y: res.y,
                    type: res.type,
                    playerIndex: bot.id
                };
                bot.trigger('client_move_fence', eventInfo);
                return;
            }
            console.warn('something going wrong');
        }
        getJumpPositions() {
            return [
                {
                    x: this.x + 1,
                    y: this.y
                },
                {
                    x: this.x - 1,
                    y: this.y
                },
                {
                    x: this.x,
                    y: this.y + 1
                },
                {
                    x: this.x,
                    y: this.y - 1
                }
            ];
        }
        canMoveFence() {
            return this.fencesRemaining > 0;
        }
        canMovePlayer() {
            return this.newPositions && this.newPositions.length > 0;
        }
        getPossiblePosition() {
            const random = this.random(0, this.newPositions.length - 1);
            const position = this.newPositions[random];
            this.newPositions.splice(random, 1);
            return position;
        }
    }
    exports.Bot = Bot;
});
define("models/BoardValidation", ["require", "exports", "underscore", "models/PlayerModel", "models/FenceModel", "models/utils", "models/BoardModel"], function (require, exports, underscore_7, PlayerModel_1, FenceModel_1, utils_3, BoardModel_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BoardValidation = void 0;
    underscore_7 = __importDefault(underscore_7);
    class BoardValidation extends BoardModel_1.BoardModel {
        isBetween(n1, n2, n3) {
            let min, max;
            if (n1 > n2) {
                min = n2;
                max = n1;
            }
            else {
                min = n1;
                max = n2;
            }
            return min <= n3 && n3 < max;
        }
        intToChar(i) {
            if (this.get('debug')) {
                return i + '';
            }
            const a = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k'];
            return a[i];
        }
        intToInt(i) {
            if (this.get('debug')) {
                return i + '';
            }
            return this.get('boardSize') - i;
        }
        isOtherPlayerAndFenceBehindHimVertical(pos1, pos2, busyFences) {
            const playerX = pos1.x, playerY = pos1.y, y = pos2.y;
            const wallY = y - (playerY < y ? 0 : 1);
            const sibling1 = this.players.isFieldBusy({ x: playerX, y: y });
            const result = sibling1 && (wallY === -1 || wallY === 8 || (0, underscore_7.default)(busyFences).findWhere({
                x: playerX,
                y: wallY,
                orientation: 'H'
            }));
            return !!result;
        }
        isOtherPlayerAndFenceBehindHimHorizontal(pos1, pos2, busyFences) {
            const playerX = pos1.x, playerY = pos1.y, x = pos2.x;
            const sibling1 = this.players.isFieldBusy({ x: x, y: playerY });
            const wallX = x - (playerX < x ? 0 : 1);
            const result = sibling1 && (wallX === -1 || wallX === 8 || (0, underscore_7.default)(busyFences).findWhere({
                x: wallX,
                y: playerY,
                orientation: 'V'
            }));
            return !!result;
        }
        isOtherPlayerAndFenceBehindHim(pos1, pos2, busyFences) {
            const playerX = pos1.x, playerY = pos1.y, x = pos2.x, y = pos2.y;
            const isDiagonalSibling = Math.abs(playerX - x) === 1 && Math.abs(playerY - y) === 1;
            if (!isDiagonalSibling) {
                return false;
            }
            return this.isOtherPlayerAndFenceBehindHimVertical(pos1, pos2, busyFences)
                || this.isOtherPlayerAndFenceBehindHimHorizontal(pos1, pos2, busyFences);
        }
        noFenceBetweenPositions(pos1, pos2, busyFences) {
            const me = this, playerX = pos1.x, playerY = pos1.y, x = pos2.x, y = pos2.y;
            let callback;
            if (playerX === x) {
                callback = (fence) => {
                    return fence.x === x && fence.orientation === 'H' && me.isBetween(playerY, y, fence.y);
                };
            }
            else if (playerY === y) {
                callback = (fence) => {
                    return fence.y === y && fence.orientation === 'V' && me.isBetween(playerX, x, fence.x);
                };
            }
            else {
                const minY = Math.min(playerY, y);
                const minX = Math.min(playerX, x);
                callback = (fence) => {
                    return (fence.orientation === 'V' && fence.x === minX && (fence.y === y))
                        || (fence.orientation === 'H' && fence.y === minY && (fence.x === x));
                };
            }
            return !busyFences.some(callback);
        }
        isNearestPosition(currentPos, pos) {
            const prevX = currentPos.x, prevY = currentPos.y;
            return Math.abs(prevX - pos.x) === 1 && prevY === pos.y
                || Math.abs(prevY - pos.y) === 1 && prevX === pos.x;
        }
        isValidPlayerPosition(currentPos, newPos, busyFences) {
            return this.isBetween(0, this.get('boardSize'), newPos.x)
                && this.isBetween(0, this.get('boardSize'), newPos.y)
                && !this.players.isFieldBusy(newPos)
                && this.noFenceBetweenPositions(currentPos, newPos, busyFences)
                && (this.isNearestPosition(currentPos, newPos) ||
                    this.players.isFieldBehindOtherPlayer(currentPos, newPos) ||
                    this.players.isFieldNearOtherPlayer(currentPos, newPos) ||
                    this.isOtherPlayerAndFenceBehindHim(currentPos, newPos, busyFences));
        }
        isCurrentPlayerTurn() {
            const current = this.get('currentPlayer');
            const active = this.get('activePlayer');
            return this.auto || (current === active && !!this.getActivePlayer() && !this.getActiveBot());
        }
        isValidCurrentPlayerPosition(x, y) {
            const activePlayer = this.getActivePlayer();
            if (!this.isCurrentPlayerTurn()) {
                return false;
            }
            const busyFences = this.getBusyFences();
            const currentPos = { x: activePlayer.get('prev_x'), y: activePlayer.get('prev_y') };
            return this.isValidPlayerPosition(currentPos, { x: x, y: y }, busyFences);
        }
        canSelectFences() {
            const activePlayer = this.getActivePlayer();
            return activePlayer && activePlayer.hasFences() && this.isCurrentPlayerTurn();
        }
        getNearestPositions(pawn) {
            return [
                { x: pawn.x - 1, y: pawn.y - 1 },
                { x: pawn.x - 1, y: pawn.y },
                { x: pawn.x - 1, y: pawn.y + 1 },
                { x: pawn.x + 1, y: pawn.y - 1 },
                { x: pawn.x + 1, y: pawn.y },
                { x: pawn.x + 1, y: pawn.y + 1 },
                { x: pawn.x, y: pawn.y - 1 },
                { x: pawn.x, y: pawn.y + 1 }
            ];
        }
        getPossiblePositions(pawn) {
            return [
                { x: pawn.x - 1, y: pawn.y - 1 },
                { x: pawn.x - 1, y: pawn.y },
                { x: pawn.x - 1, y: pawn.y + 1 },
                { x: pawn.x + 1, y: pawn.y - 1 },
                { x: pawn.x + 1, y: pawn.y },
                { x: pawn.x + 1, y: pawn.y + 1 },
                { x: pawn.x, y: pawn.y - 1 },
                { x: pawn.x, y: pawn.y + 1 },
                { x: pawn.x - 2, y: pawn.y },
                { x: pawn.x + 2, y: pawn.y },
                { x: pawn.x, y: pawn.y - 2 },
                { x: pawn.x, y: pawn.y + 2 }
            ];
        }
        getBusyFences() {
            return this.fences
                .filter(item => item.get('state') === 'busy')
                .map(f => f.toJSON());
        }
        getValidPositions(pawn, busyFences) {
            const positions = this.getPossiblePositions(pawn);
            return (0, underscore_7.default)(positions).filter(pos => {
                return this.isValidPlayerPosition(pawn, pos, busyFences);
            });
        }
        generatePositions(boardSize) {
            const notVisitedPositions = {};
            (0, utils_3.iter)([boardSize, boardSize], (i, j) => {
                notVisitedPositions[10 * i + j] = 1;
            });
            return notVisitedPositions;
        }
        getAddNewCoordinateFunc(notVisitedPositions, open, newDeep) {
            return (validMoveCoordinate) => {
                var _a;
                const hash = validMoveCoordinate.x * 10 + validMoveCoordinate.y;
                if (notVisitedPositions[hash]) {
                    open.push({
                        x: validMoveCoordinate.x,
                        y: validMoveCoordinate.y,
                        deep: (_a = newDeep === null || newDeep === void 0 ? void 0 : newDeep.value) !== null && _a !== void 0 ? _a : 0
                    });
                    delete notVisitedPositions[hash];
                }
            };
        }
        doesFenceBreakPlayerPath(pawn, coordinate) {
            const open = [pawn.pick('x', 'y')], closed = [];
            const board = this.copy();
            const indexPlayer = this.players.indexOf(pawn);
            const player = board.players.at(indexPlayer);
            const fence = board.fences.findWhere(coordinate.pick('x', 'y', 'orientation'));
            const sibling = board.fences.getSibling(fence);
            if (!sibling) {
                return 'invalid';
            }
            fence === null || fence === void 0 ? void 0 : fence.set('state', 'busy');
            sibling.set('state', 'busy');
            const busyFences = board.getBusyFences();
            const notVisitedPositions = board.generatePositions(board.get('boardSize'));
            delete notVisitedPositions[10 * player.get('x') + player.get('y')];
            const addNewCoordinates = board.getAddNewCoordinateFunc(notVisitedPositions, open);
            while (open.length) {
                const currentCoordinate = open.pop();
                if (this.players.playersPositions[indexPlayer].isWin(currentCoordinate.x, currentCoordinate.y)) {
                    return false;
                }
                closed.push(currentCoordinate);
                player.set({
                    x: currentCoordinate.x,
                    y: currentCoordinate.y,
                    prev_x: currentCoordinate.x,
                    prev_y: currentCoordinate.y
                });
                board.getValidPositions(currentCoordinate, busyFences).forEach(addNewCoordinates);
            }
            return true;
        }
        notBreakSomePlayerPath(wall) {
            return !this.breakSomePlayerPath(wall);
        }
        isWallNearBorder(wall) {
            const boardSize = this.get('boardSize');
            return wall.x === 0 || wall.x === boardSize
                || wall.y === 0 || wall.y === boardSize;
        }
        hasWallsOrPawnsNear(wall) {
            const busyFences = this.getBusyFences().map((item) => {
                return item.orientation + item.x + item.y;
            });
            const nearestWalls = this.getNearestWalls(wall).map(item => {
                return item.type + item.x + item.y;
            });
            const result = !!underscore_7.default.intersection(busyFences, nearestWalls).length;
            return result;
        }
        _getNearestWalls(wall) {
            if (wall.x === undefined || wall.y === undefined) {
                return [];
            }
            return wall.orientation === 'H' ? [
                { x: wall.x - 1, y: wall.y, type: 'H' },
                { x: wall.x + 1, y: wall.y, type: 'H' },
                { x: wall.x - 1, y: wall.y, type: 'V' },
                { x: wall.x - 1, y: wall.y + 1, type: 'V' },
                { x: wall.x, y: wall.y, type: 'V' },
                { x: wall.x, y: wall.y + 1, type: 'V' }
            ] : [
                { x: wall.x, y: wall.y - 1, type: 'V' },
                { x: wall.x, y: wall.y + 1, type: 'V' },
                { x: wall.x, y: wall.y - 1, type: 'H' },
                { x: wall.x + 1, y: wall.y - 1, type: 'H' },
                { x: wall.x, y: wall.y, type: 'H' },
                { x: wall.x + 1, y: wall.y, type: 'H' }
            ];
        }
        getNearestWalls(wall) {
            const fence = this.fences.findWhere(wall);
            const sibling = this.fences.getSibling(fence);
            if (!sibling) {
                return [];
            }
            const siblingWall = sibling.pick('x', 'y', 'orientation');
            const all = (0, underscore_7.default)(this._getNearestWalls(wall).concat(this._getNearestWalls(siblingWall)));
            const all2 = all.without(all.findWhere(wall), all.findWhere(siblingWall));
            const unique = underscore_7.default.uniq(all2, a => {
                return a.type + a.x + a.y;
            });
            return (0, underscore_7.default)(unique).filter(item => {
                return this.isBetween(0, this.get('boardSize'), item.x) ||
                    this.isBetween(0, this.get('boardSize'), item.y);
            });
        }
        breakSomePlayerPath(wall) {
            const me = this;
            return this.hasWallsOrPawnsNear(wall.pick('x', 'y', 'orientation')) &&
                me.players.some(player => {
                    return me.doesFenceBreakPlayerPath(player, wall) === true;
                });
        }
        copy() {
            const board = new BoardShallowCopy({
                boardSize: this.get('boardSize'),
                playersCount: this.get('playersCount'),
                currentPlayer: this.get('currentPlayer'),
                activePlayer: this.get('activePlayer'),
                botsCount: this.get("botsCount"),
            });
            board.fences = new FenceModel_1.FencesCollection(this.fences.toJSON(), { model: FenceModel_1.FenceModel });
            board.players = new PlayerModel_1.PlayersCollection(this.players.toJSON(), { model: PlayerModel_1.PlayerModel });
            board.players.playersPositions = this.players.playersPositions;
            return board;
        }
    }
    exports.BoardValidation = BoardValidation;
    class BoardShallowCopy extends BoardValidation {
        initialize() { }
    }
});
define("models/SmartBot", ["require", "exports", "underscore", "models/Bot", "models/FenceModel", "models/PlayerModel", "models/TurnModel", "models/BoardValidation"], function (require, exports, underscore_8, Bot_1, FenceModel_2, PlayerModel_2, TurnModel_2, BoardValidation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SmartBot = void 0;
    underscore_8 = __importDefault(underscore_8);
    class SmartBot extends Bot_1.Bot {
        constructor() {
            super(...arguments);
            this.fencesRemaining = 0;
        }
        onMovePlayer(params) {
            this.board.players.at(params.playerIndex).set({
                x: params.x,
                y: params.y,
                prev_x: params.x,
                prev_y: params.y
            });
            if (this.isPlayerCanMakeTurn(params.playerIndex)) {
                this.turn();
            }
        }
        onMoveFence(params) {
            const fence = this.board.fences.findWhere({
                x: params.x,
                y: params.y,
                type: params.type
            });
            const sibling = this.board.fences.getSibling(fence);
            fence === null || fence === void 0 ? void 0 : fence.set('state', 'busy');
            sibling === null || sibling === void 0 ? void 0 : sibling.set('state', 'busy');
            if (this.currentPlayer === params.playerIndex) {
                this.fencesRemaining--;
            }
            if (this.isPlayerCanMakeTurn(params.playerIndex)) {
                this.turn();
            }
        }
        onStart(currentPlayer, _activePlayer, history, playersCount, boardSize) {
            this._newPositions = [];
            this._fencesPositions = [];
            this._currentPlayer = currentPlayer;
            this._playersCount = playersCount;
            const historyModel = new TurnModel_2.GameHistoryModel({
                turns: new TurnModel_2.TurnsCollection(),
                boardSize: boardSize,
                playersCount: playersCount
            });
            if (history.length) {
                historyModel.get('turns').reset(history);
            }
            else {
                historyModel.initPlayers();
            }
            this.board = new BoardValidation_1.BoardValidation({
                boardSize: historyModel.get('boardSize'),
                playersCount: historyModel.get('playersCount'),
                currentPlayer: this.currentPlayer,
                activePlayer: this.activePlayer,
                botsCount: 0
            });
            this.board.fences = new FenceModel_2.FencesCollection();
            this.board.fences.createFences(historyModel.get('boardSize'));
            this.board.players = new PlayerModel_2.PlayersCollection(historyModel.getPlayerPositions(), { model: PlayerModel_2.PlayerModel });
            this.player = this.board.players.at(currentPlayer);
            const position = historyModel.getPlayerPositions()[currentPlayer];
            if (position) {
                this.fencesRemaining = Math.round(this.fencesCount / playersCount) - position.movedFences;
            }
        }
        getPossiblePosition() {
            const board = this.board.copy();
            if (this.currentPlayer === null) {
                console.error("this.currentPlayer is null");
            }
            const player = board.players.at(this.currentPlayer);
            const goalPath = this.findPathToGoal(player, board);
            const result = goalPath.pop();
            return { x: result.x, y: result.y };
        }
        findPathToGoal(player, board) {
            const playerXY = player.pick('x', 'y');
            const indexPlayer = board.players.indexOf(player);
            board.players.each((p, i) => {
                if (i !== indexPlayer) {
                    p.set({ x: -1, y: -1, prev_x: -1, prev_y: -1 });
                }
            });
            const closed = this.processBoardForGoal(board, player);
            const goal = this.findGoal(closed, board.players.playersPositions[indexPlayer]);
            const path = this.buildPath(goal, playerXY, board, closed, player);
            return path;
        }
        processBoardForGoal(board, player) {
            const open = [{
                    x: player.get('x'),
                    y: player.get('y'),
                    deep: 0
                }], closed = [];
            const indexPlayer = board.players.indexOf(player);
            let currentCoordinate;
            const newDeep = { value: 0 };
            const busyFences = board.getBusyFences();
            const notVisitedPositions = board.generatePositions(board.get('boardSize'));
            delete notVisitedPositions[10 * player.get('x') + player.get('y')];
            const addNewCoordinates = board.getAddNewCoordinateFunc(notVisitedPositions, open, newDeep);
            let winPositionsCount = 0;
            while (open.length) {
                currentCoordinate = open.shift();
                newDeep.value = currentCoordinate.deep + 1;
                closed.push({
                    x: currentCoordinate.x,
                    y: currentCoordinate.y,
                    deep: currentCoordinate.deep
                });
                if (board.players.playersPositions[indexPlayer].isWin(currentCoordinate.x, currentCoordinate.y)) {
                    winPositionsCount++;
                }
                if (winPositionsCount >= board.get('boardSize')) {
                    return closed;
                }
                player.set({
                    x: currentCoordinate.x,
                    y: currentCoordinate.y,
                    prev_x: currentCoordinate.x,
                    prev_y: currentCoordinate.y
                });
                (0, underscore_8.default)(board.getValidPositions(currentCoordinate, busyFences)).each(addNewCoordinates);
            }
            return closed;
        }
        findGoal(closed, pawn) {
            const winPositions = (0, underscore_8.default)(closed).filter(item => {
                return pawn.isWin(item.x, item.y);
            }).sort((a, b) => {
                return a.deep - b.deep;
            });
            return winPositions[0];
        }
        buildPath(from, to, board, closed, player) {
            if (!from) {
                return [];
            }
            let current = from;
            const path = [];
            const func = (pos) => {
                return (pos.deep === current.deep - 1) &&
                    (0, underscore_8.default)(board.getNearestPositions(current)).findWhere({ x: pos.x, y: pos.y }) !== undefined;
            };
            while (current.x !== to.x || current.y !== to.y) {
                player.set({
                    x: current.x,
                    y: current.y,
                    prev_x: current.x,
                    prev_y: current.y
                });
                path.push(current);
                current = (0, underscore_8.default)(closed).detect(func);
                if (!current) {
                    console.log('cannot build path');
                    return [];
                }
            }
            return path;
        }
    }
    exports.SmartBot = SmartBot;
});
define("models/MegaBot", ["require", "exports", "underscore", "async", "models/SmartBot", "models/utils"], function (require, exports, underscore_9, async_1, SmartBot_1, utils_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MegaBot = void 0;
    underscore_9 = __importDefault(underscore_9);
    async_1 = __importDefault(async_1);
    class MegaBot extends SmartBot_1.SmartBot {
        constructor() {
            super(...arguments);
            this.possibleWallsMoves = [];
            this.satisfiedRate = 1;
        }
        doTurn() {
            const self = this;
            self.getBestTurn(turn => {
                const eventInfo = {
                    x: turn.x,
                    y: turn.y,
                    type: turn.type,
                    playerIndex: this.id
                };
                if (turn.type === 'P') {
                    self.trigger('client_move_player', eventInfo);
                }
                else {
                    self.trigger('client_move_fence', eventInfo);
                }
            });
        }
        getBestTurn(callback) {
            const board = this.board.copy();
            const player = board.players.at(this.currentPlayer);
            const moves = this.getPossibleMoves(board, player);
            async_1.default.waterfall([
                (callback1) => {
                    callback1(null, { moves: moves, player: player, board: board, rates: [] });
                },
                this.getRatesForPlayersMoves.bind(this),
                this.getRatesForWallsMoves.bind(this),
            ], (_err, result) => {
                const rates = result === null || result === void 0 ? void 0 : result.rates.sort((move1, move2) => {
                    return move1.rate - move2.rate;
                });
                const minRate = (0, underscore_9.default)((0, underscore_9.default)(rates).pluck('rate')).min();
                const types = { H: 0, V: 1, P: 2 };
                const filtered = (0, underscore_9.default)(rates).filter(move => {
                    return move.rate === minRate;
                });
                const minRatedMoves = filtered.sort((a, b) => {
                    return types[b.type] - types[a.type];
                });
                callback(minRatedMoves[underscore_9.default.random(0, minRatedMoves.length - 1)]);
            });
        }
        getRatesForPlayersMoves({ moves, player, board, rates }, callback) {
            const result = [];
            (0, underscore_9.default)(moves).each(move => {
                if (move.type === 'P') {
                    const prevPosition = player.pick('x', 'y', 'prev_x', 'prev_y');
                    player.set({
                        x: move.x,
                        y: move.y,
                        prev_x: move.x,
                        prev_y: move.y
                    });
                    player.set(prevPosition);
                    result.push(Object.assign(Object.assign({}, move), { rate: this.calcHeuristic(player, board) }));
                }
            });
            callback(null, { moves: moves, player: player, board: board, rates: rates.concat(result) });
        }
        getRatesForWallsMoves({ moves, player, board, rates }, callback) {
            const self = this;
            let satisfiedCount = 0;
            const result = [];
            if (!this.canMoveFence()) {
                callback(null, { moves, player, board, rates });
                return;
            }
            async_1.default.some(moves, (item, callback) => {
                const move = { x: item.x, y: item.y, type: item.type, rate: 0 };
                if (move.type === 'P') {
                    callback(false);
                    return false;
                }
                const fence = board.fences.findWhere(move);
                if (!board.fences.validateFenceAndSibling(fence)) {
                    self.removePossibleWallsMove(move);
                }
                else if (fence && !board.breakSomePlayerPath(fence)) {
                    const sibling = board.fences.getSibling(fence);
                    const prevStateFence = fence.get('state');
                    const prevStateSibling = sibling === null || sibling === void 0 ? void 0 : sibling.get('state');
                    fence.set({ state: 'busy' });
                    sibling === null || sibling === void 0 ? void 0 : sibling.set({ state: 'busy' });
                    move.rate = self.calcHeuristic(player, board);
                    result.push(move);
                    fence.set({ state: prevStateFence });
                    sibling === null || sibling === void 0 ? void 0 : sibling.set({ state: prevStateSibling });
                    if (move.rate <= self.satisfiedRate) {
                        satisfiedCount++;
                    }
                }
                callback(satisfiedCount >= 2);
                return satisfiedCount >= 2;
            }, () => {
                self.satisfiedRate = 0;
                callback(null, { moves, player, board, rates: rates.concat(result) });
            });
        }
        calcHeuristic(_player, board) {
            const otherPlayersPaths = [];
            let currentPlayerPathLength = 0;
            board.players.each((player, index) => {
                if (this.currentPlayer === index) {
                    currentPlayerPathLength = this.getCountStepsToGoal(player, board) + 1;
                }
                else {
                    otherPlayersPaths.push(this.getCountStepsToGoal(player, board));
                }
            });
            const othersMinPathLength = (0, underscore_9.default)(otherPlayersPaths).min();
            return currentPlayerPathLength - othersMinPathLength;
        }
        getCountStepsToGoal(player, board) {
            const indexPlayer = board.players.indexOf(player);
            const prevPositions = [];
            board.players.each((p, i) => {
                prevPositions.push(p.pick('x', 'y', 'prev_x', 'prev_y'));
                if (i !== indexPlayer) {
                    p.set({ x: -1, y: -1, prev_x: -1, prev_y: -1 });
                }
            });
            const closed = this.processBoardForGoal(board, player);
            const goal = this.findGoal(closed, board.players.playersPositions[indexPlayer]);
            board.players.forEach((p, i) => { p.set(prevPositions[i]); });
            return goal ? goal.deep : 9999;
        }
        initPossibleMoves() {
            this.possibleWallsMoves = this.possibleWallsMoves || this.selectWallsMoves();
        }
        getPossibleMoves(board, player) {
            this.initPossibleMoves();
            const playerPositions = board.getValidPositions(player.pick('x', 'y'), []).map(playerPosition => {
                const move = Object.assign(Object.assign({}, playerPosition), { type: "P" });
                return move;
            });
            return player.hasFences()
                ? playerPositions.concat(this.possibleWallsMoves) : playerPositions;
        }
        removePossibleWallsMove(move) {
            const item = (0, underscore_9.default)(this.possibleWallsMoves).findWhere(move);
            const index = (0, underscore_9.default)(this.possibleWallsMoves).indexOf(item);
            if (index !== -1) {
                this.possibleWallsMoves.splice(index, 1);
            }
        }
        selectWallsMoves() {
            const positions = [];
            const boardSize = this.board.get('boardSize');
            (0, utils_4.iter)([boardSize, boardSize - 1], (i, j) => {
                positions.push({ x: i, y: j, type: 'H' });
            });
            (0, utils_4.iter)([boardSize, boardSize - 1], (i, j) => {
                positions.push({ x: i, y: j, type: 'V' });
            });
            return positions;
        }
    }
    exports.MegaBot = MegaBot;
});
define("models/BotWrapper", ["require", "exports", "models/BackboneModel", "models/SmartBot", "models/MegaBot", "models/Bot"], function (require, exports, BackboneModel_6, SmartBot_2, MegaBot_1, Bot_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BotWrapper = void 0;
    class BotWrapper extends BackboneModel_6.BackboneModel {
        constructor() {
            super(...arguments);
            this.trigger = (name, ...param) => {
                console.log("trigger", name, ...param);
                if (!this.bot) {
                    BackboneModel_6.BackboneModel.prototype.trigger.call(this, name, ...param);
                }
                this.bot.trigger(name, ...param);
                return this;
            };
        }
        initialize() {
            const type = this.get('botType');
            const id = this.get('id');
            this.currentPlayer = id;
            if (type === 'simple') {
                this.bot = new Bot_2.Bot(id);
            }
            else if (type === 'medium') {
                this.bot = new SmartBot_2.SmartBot(id);
            }
            else if (type === 'super') {
                this.bot = new MegaBot_1.MegaBot(id);
            }
        }
        on(name, callback) {
            this.bot.on(name, callback);
            return this;
        }
        terminate() {
            this.trigger = function () { return this; };
        }
    }
    exports.BotWrapper = BotWrapper;
});
define("models/TimerModel", ["require", "exports", "models/BackboneModel"], function (require, exports, BackboneModel_7) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TimerModel = void 0;
    class TimerModel extends BackboneModel_7.BackboneModel {
        constructor() {
            super(...arguments);
            this.isStopped = false;
            this.interval = 0;
        }
        defaults() {
            return {
                playerNames: [],
                timePrev: 0,
                allTime: 0,
                times: [0, 0, 0, 0],
                time: 0
            };
        }
        next(current) {
            if (this.isStopped) {
                return;
            }
            const timer = this;
            this.get('times')[current] = this.get('times')[current] + this.get('time');
            timer.set('allTime', timer.get('allTime') + this.get('time'));
            timer.set('timePrev', timer.get('time'));
            timer.set('time', 0);
            clearInterval(this.interval);
            timer.interval = setInterval(() => {
                timer.set('time', timer.get('time') + 1);
            }, 1000);
        }
        reset() {
            this.set('timePrev', this.get('time'));
            this.set('time', 0);
            this.set('allTime', 0);
            this.set('times', [0, 0, 0, 0]);
        }
        stop() {
            this.isStopped = true;
            clearInterval(this.interval);
        }
    }
    exports.TimerModel = TimerModel;
});
define("models/BoardModel", ["require", "exports", "underscore", "models/BackboneModel", "models/BotWrapper", "models/FieldModel", "models/FenceModel", "models/PlayerModel", "models/TimerModel", "models/TurnModel"], function (require, exports, underscore_10, BackboneModel_8, BotWrapper_1, FieldModel_1, FenceModel_3, PlayerModel_3, TimerModel_1, TurnModel_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BoardModel = void 0;
    underscore_10 = __importDefault(underscore_10);
    class BoardModel extends BackboneModel_8.BackboneModel {
        constructor() {
            super(...arguments);
            this.isPlayerMoved = false;
            this.isFenceMoved = false;
            this.auto = false;
        }
        defaults() {
            return {
                botsCount: 0,
                boardSize: 9,
                playersCount: 2,
                currentPlayer: null,
                activePlayer: -1,
            };
        }
        ;
        getActivePlayer() {
            return this.players.at(this.get('activePlayer'));
        }
        getActiveBot() {
            return (0, underscore_10.default)(this.bots).find(bot => {
                return bot.currentPlayer === this.get('activePlayer');
            });
        }
        onSocketMoveFence(pos) {
            const fence = this.fences.findWhere({
                type: pos.orientation,
                x: pos.x,
                y: pos.y
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
        onSocketMovePlayer(pos) {
            if (pos.timeout) {
                this.isPlayerMoved = true;
            }
            this.auto = true;
            this.fields.trigger('moveplayer', pos.x, pos.y);
            this.auto = false;
            this.trigger('maketurn');
        }
        createModels() {
            this.fences = new FenceModel_3.FencesCollection();
            this.fields = new FieldModel_1.FieldsCollection();
            this.players = new PlayerModel_3.PlayersCollection();
            this.timerModel = new TimerModel_1.TimerModel({
                playersCount: this.get('playersCount')
            });
            this.infoModel = new BackboneModel_8.BackboneModel({
                playersPositions: this.players.playersPositions,
                fences: [],
                isActive: true,
                showCurrent: this.isOnlineGame() || this.get("botsCount") > 0,
            });
            this.history = new TurnModel_3.GameHistoryModel({
                turns: new TurnModel_3.TurnsCollection(),
                debug: this.get('debug'),
                boardSize: this.get('boardSize'),
                playersCount: this.get('playersCount')
            });
        }
        initModels() {
            const me = this;
            const count = me.get('playersCount');
            if (count !== 2 && count !== 4) {
                me.set('playersCount', 2);
            }
            me.set('botsCount', Math.min(me.get('playersCount'), me.get('botsCount')));
            me.fields.createFields(me.get('boardSize'));
            me.fences.createFences(me.get('boardSize'));
            me.players.createPlayers(me.get('playersCount'));
            this.history.set('playerNames', this.players.getPlayerNames());
            this.timerModel.set('playerNames', this.players.getPlayerNames());
        }
        switchActivePlayer() {
            if (this.history.get('turns').length > this.get('playersCount')) {
                this.timerModel.next(this.get('activePlayer'));
            }
            this.set('activePlayer', this.players.getNextActivePlayer(this.get('activePlayer')));
        }
        makeTurn() {
            const me = this;
            if (!(me.isPlayerMoved || me.isFenceMoved)) {
                return;
            }
            const active = me.getActivePlayer();
            const preBusy = me.fences.getMovedFence();
            const index = me.get('activePlayer');
            if (me.isFenceMoved) {
                me.getActivePlayer().placeFence();
                const preBusySibling = me.fences.getSibling(preBusy);
                if (preBusySibling) {
                    me.history.add({
                        x: preBusy.get('x'),
                        y: preBusy.get('y'),
                        x2: preBusySibling.get('x'),
                        y2: preBusySibling.get('y'),
                        t: 'f'
                    });
                }
                me.fences.setBusy();
            }
            if (me.isPlayerMoved) {
                me.history.add({
                    x: active.get('x'),
                    y: active.get('y'),
                    t: 'p'
                });
            }
            me.switchActivePlayer();
            me.players.each(player => {
                player.trigger('resetstate');
            });
            me.getActivePlayer().trigger('setcurrent');
            if (!me.isOnlineGame()) {
                if (!me.getNextActiveBot(me.get('activePlayer'))) {
                    me.set('currentPlayer', me.get('activePlayer'));
                }
            }
            if (me.isFenceMoved) {
                me.emitEventToBots('server_move_fence', {
                    x: preBusy.get('x'),
                    y: preBusy.get('y'),
                    type: preBusy.get('orientation'),
                    playerIndex: index
                });
            }
            if (me.isPlayerMoved) {
                me.emitEventToBots('server_move_player', {
                    x: active.get('x'),
                    y: active.get('y'),
                    playerIndex: index
                });
            }
            me.isPlayerMoved = false;
            me.isFenceMoved = false;
        }
        getNextActiveBot(next) {
            var _a;
            return (_a = this.bots) === null || _a === void 0 ? void 0 : _a.find(bot => {
                return bot.currentPlayer === next;
            });
        }
        emitEventToBots(eventName, param) {
            var _a, _b;
            const next = this.players.at(this.get('activePlayer')).get("url");
            (_a = this.bots) === null || _a === void 0 ? void 0 : _a.forEach(bot => {
                if (next !== bot.currentPlayer) {
                    bot.trigger(eventName, param);
                }
            });
            (_b = this.getNextActiveBot(next)) === null || _b === void 0 ? void 0 : _b.trigger(eventName, param);
        }
        isOnlineGame() {
            return false;
        }
        onMovePlayer(x, y) {
            const me = this;
            console.log("onMovePlayer", x, y);
            if (me.isValidCurrentPlayerPosition(x, y)) {
                const current = me.getActivePlayer();
                current.moveTo(x, y);
                me.fences.clearBusy();
                me.isFenceMoved = false;
                me.isPlayerMoved = true;
            }
            else {
                const activeBot = me.getActiveBot();
                if (activeBot) {
                    activeBot.trigger('server_turn_fail');
                }
            }
        }
        updateInfo() {
            this.infoModel.set({
                currentPlayer: this.get('currentPlayer'),
                activePlayer: this.get('activePlayer'),
                fences: this.players.pluck('fencesRemaining')
            });
        }
        onFenceSelected(model) {
            if (this.canSelectFences() &&
                this.fences.validateFenceAndSibling(model) &&
                this.notBreakSomePlayerPath(model)) {
                this.fences.clearBusy();
                this.fences.validateAndTriggerEventOnFenceAndSibling(model, 'movefence');
                this.players.updatePlayersPositions();
                this.isPlayerMoved = false;
                this.isFenceMoved = true;
            }
            else {
                const activeBot = this.getActiveBot();
                if (activeBot) {
                    activeBot.trigger('server_turn_fail');
                }
            }
        }
        initEvents() {
            const me = this;
            me.on('maketurn', this.makeTurn);
            this.fields.on('moveplayer', me.onMovePlayer, this);
            this.fields.on('beforeselectfield', (x, y, model) => {
                if (me.isValidCurrentPlayerPosition(x, y)) {
                    model.selectField();
                }
            });
            this.on('change:activePlayer', this.updateInfo, this);
            this.on('change:currentPlayer', this.updateInfo, this);
            this.fences.on({
                'selected': (model) => me.onFenceSelected(model),
                'highlight_current_and_sibling': (model) => {
                    if (me.canSelectFences() &&
                        me.fences.validateFenceAndSibling(model) &&
                        me.notBreakSomePlayerPath(model)) {
                        me.fences.validateAndTriggerEventOnFenceAndSibling(model, 'markfence');
                    }
                },
                'reset_current_and_sibling': (model) => {
                    me.fences.triggerEventOnFenceAndSibling(model, 'unmarkfence');
                }
            });
        }
        run(activePlayer, currentPlayer) {
            this.set({
                activePlayer: activePlayer,
                currentPlayer: currentPlayer,
            });
            if (!this.isOnlineGame()) {
                this.history.initPlayers();
            }
            this.connectBots();
        }
        stop() {
            var _a;
            (_a = this.bots) === null || _a === void 0 ? void 0 : _a.forEach(bot => {
                bot.terminate();
            });
            this.timerModel.stop();
        }
        connectBots() {
            if (!this.get('botsCount')) {
                return;
            }
            const me = this;
            this.bots = [];
            const turns = this.history.get('turns').toJSON();
            (0, underscore_10.default)(this.get('botsCount')).times(i => {
                const botIndex = i + (this.get('playersCount') - this.get('botsCount'));
                const bot = new BotWrapper_1.BotWrapper({
                    id: botIndex,
                    botType: 'medium'
                });
                bot.on('client_move_player', (pos) => me.onSocketMovePlayer(pos));
                bot.on('client_move_fence', (pos) => {
                    if (this.onSocketMoveFence(pos) === false) {
                        const activeBot = this.getActiveBot();
                        if (activeBot) {
                            activeBot.trigger('server_turn_fail');
                        }
                    }
                });
                bot.trigger('server_start', botIndex, this.get('activePlayer'), turns, this.get('playersCount'));
                this.bots.push(bot);
            });
        }
        initialize() {
            this.createModels();
            this.initEvents();
            this.initModels();
            this.updateInfo();
            this.afterInitialize();
        }
        afterInitialize() {
            this.on('confirmturn', this.makeTurn);
            this.run(0, 0);
        }
    }
    exports.BoardModel = BoardModel;
});
define("views/InfoView", ["require", "exports", "underscore", "views/GameObject"], function (require, exports, underscore_11, GameObject_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InfoView = void 0;
    underscore_11 = __importDefault(underscore_11);
    class InfoView extends GameObject_4.GameObject {
        initialize(params) {
            var _a, _b;
            const me = this;
            me.fences = [];
            me.playersPositions = params.model.get("playersPositions");
            this.$el = $('#game-info');
            me.template = (_b = (_a = document.querySelector("#game-info-tmpl")) === null || _a === void 0 ? void 0 : _a.innerHTML) !== null && _b !== void 0 ? _b : "";
            me.listenTo(me.model, 'change', me.render);
        }
        render() {
            const me = this;
            me.$el.html(underscore_11.default.template(me.template, { variable: 'data' })(me.model.toJSON()));
            me.$el.find('.move').click(() => {
                me.trigger('click');
            });
            this.clearFences();
            this.drawRemainingFences();
            if (this.model.get("showCurrent")) {
                this.displayCurrentPlayer();
            }
            this.displayActivePlayer();
            return this;
        }
        drawRemainingFences() {
            const me = this, cls = GameObject_4.ViewOptions, w = cls.squareDistance, h = cls.squareHeight, fences = me.model.get('fences'), playersCount = fences ? fences.length : 0, y0 = cls.startY - w - cls.squareHeight, x0 = cls.startX - w + cls.borderDepth, boardSize = 9, fenceCountPerPlayer = 5, boardHeight = (cls.squareHeight + cls.squareDistance) * boardSize + 2 * cls.borderDepth, boardWidth = (cls.squareWidth + cls.squareDistance) * fenceCountPerPlayer;
            (0, underscore_11.default)(me.model.get('fences')).each((fenceCount, index) => {
                let x = x0, y = y0;
                if (playersCount === 2 && index === 1 || playersCount === 4 && index > 1) {
                    y += boardHeight + h + w;
                }
                if (playersCount === 4 && (index === 1 || index === 2)) {
                    x += boardWidth;
                }
                (0, underscore_11.default)(fenceCount).times((i) => {
                    const dx = i * (cls.squareWidth + cls.squareDistance);
                    const obj = cls.getPaper().rect(x + dx, y, w, h);
                    obj.attr('fill', me.playersPositions[index].color);
                    obj.attr('stroke-width', 1);
                    me.fences.push(obj);
                });
            });
        }
        clearFences() {
            while (this.fences.length) {
                const f = this.fences.pop();
                f.remove();
            }
        }
        displayActivePlayer() {
            const cls = GameObject_4.ViewOptions;
            if (this.active) {
                this.active[0].remove();
                this.active[1].remove();
            }
            const active = this.model.get('activePlayer');
            if (active !== undefined) {
                this.active = this.displayPlayer(active, cls.squareWidth * 4, 70, 'Active');
            }
        }
        displayCurrentPlayer() {
            const cls = GameObject_4.ViewOptions;
            if (this.current) {
                this.current[0].remove();
                this.current[1].remove();
            }
            const current = this.model.get('currentPlayer');
            if (current !== undefined) {
                this.current = this.displayPlayer(current, cls.squareWidth, 70, 'You');
            }
        }
        displayPlayer(index, dx, dy, text) {
            dx += 70;
            if (underscore_11.default.isUndefined(index) || index < 0) {
                return;
            }
            const me = this, cls = GameObject_4.ViewOptions, color = me.playersPositions[index].color, w = cls.squareWidth, h = cls.squareHeight, x = cls.startX + dx, y = cls.startY - dy;
            const textObj = cls.getPaper().text(x - 70, y, text + ' -');
            textObj.attr('fill', 'black');
            textObj.attr('font-size', 20);
            const obj = cls.getPaper().ellipse(x, y, w / 2, h / 2);
            obj.attr('fill', color);
            return [obj, textObj];
        }
    }
    exports.InfoView = InfoView;
});
define("views/TimerView", ["require", "exports", "underscore", "backbone"], function (require, exports, underscore_12, backbone_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TimerView = void 0;
    underscore_12 = __importDefault(underscore_12);
    class TimerView extends backbone_3.View {
        initialize() {
            var _a, _b;
            const me = this;
            this.$el = $('#timer');
            me.template = (_b = (_a = document.querySelector("#timer-tmpl")) === null || _a === void 0 ? void 0 : _a.innerHTML) !== null && _b !== void 0 ? _b : "";
            me.listenTo(me.model, 'change', me.render);
            me.render();
        }
        render() {
            const me = this;
            me.$el.html(underscore_12.default.template(me.template, { variable: 'data' })(me.model.toJSON()));
            me.$el.find('.move').click(() => {
                me.trigger('click');
            });
            return this;
        }
    }
    exports.TimerView = TimerView;
});
define("views/GameHistoryView", ["require", "exports", "backbone", "underscore"], function (require, exports, backbone_4, underscore_13) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GameHistoryView = void 0;
    underscore_13 = __importDefault(underscore_13);
    class GameHistoryView extends backbone_4.View {
        initialize() {
            var _a, _b;
            const me = this;
            this.$el = $('#history');
            me.template = (_b = (_a = document.querySelector("#history-tmpl")) === null || _a === void 0 ? void 0 : _a.innerHTML) !== null && _b !== void 0 ? _b : "";
            me.listenTo(me.model, 'change', me.render);
            me.render();
        }
        render() {
            const data = this.model.toJSON();
            data.turns = data.turns.models;
            this.$el.html(underscore_13.default.template(this.template, { variable: 'data' })(data));
            return this;
        }
    }
    exports.GameHistoryView = GameHistoryView;
});
define("views/BoardView", ["require", "exports", "underscore", "views/GameObject", "views/FieldView", "views/FenceView", "views/PlayerView", "views/InfoView", "views/TimerView", "views/GameHistoryView"], function (require, exports, underscore_14, GameObject_5, FieldView_1, FenceView_1, PlayerView_1, InfoView_1, TimerView_1, GameHistoryView_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BoardView = void 0;
    underscore_14 = __importDefault(underscore_14);
    class BoardView extends GameObject_5.GameObject {
        constructor() {
            super(...arguments);
            this.selector = '#board';
        }
        events() {
            return {
                click: this.move,
            };
        }
        move() {
            this.model.trigger('confirmturn', true);
        }
        ;
        render() {
            var _a, _b;
            const me = this;
            this.$el = $(this.selector);
            me.template = (_b = (_a = document.querySelector("#board-tmpl")) === null || _a === void 0 ? void 0 : _a.innerHTML) !== null && _b !== void 0 ? _b : "";
            me.$el.html(underscore_14.default.template(me.template, { variable: 'data' })(me.model.attributes));
            this.afterRender();
            return this;
        }
        ;
        renderLegend() {
            const me = this.model;
            const cls = GameObject_5.ViewOptions, d = cls.squareDistance, boardSize = me.get('boardSize'), depth = cls.borderDepth, w = boardSize * (d + cls.squareWidth), h = boardSize * (d + cls.squareHeight), x = cls.startX + depth / 2, y = cls.startY + depth / 2 - 2;
            const largeFontSize = depth - 3;
            const smallFontSize = depth / 2;
            (0, underscore_14.default)(underscore_14.default.range(boardSize)).each((i) => {
                let text;
                const _yv = y + i * (cls.squareHeight + d) + (cls.squareHeight + depth) / 2;
                const _xh = x + i * (cls.squareWidth + d) + (cls.squareWidth + depth) / 2;
                text = cls.getPaper().text(x, _yv, me.intToInt(i));
                text.attr('fill', 'white');
                text.attr('font-size', largeFontSize);
                text = cls.getPaper().text(x + w + depth - d, _yv, me.intToInt(i));
                text.attr('fill', 'black');
                text.attr('font-size', largeFontSize);
                text = cls.getPaper().text(_xh, y, me.intToChar(i));
                text.attr('fill', 'black');
                text.attr('font-size', largeFontSize);
                text = cls.getPaper().text(_xh, y + h + depth - d, me.intToChar(i));
                text.attr('fill', 'black');
                text.attr('font-size', largeFontSize);
            });
            (0, underscore_14.default)(underscore_14.default.range(boardSize - 1)).each((i) => {
                let text;
                const _yv = y + i * (cls.squareHeight + d) + cls.squareHeight + (d + depth) / 2;
                const _xh = x + i * (cls.squareWidth + d) + cls.squareWidth + (d + depth) / 2;
                text = cls.getPaper().text(x, _yv, me.intToInt(i));
                text.attr('fill', 'white');
                text.attr('font-size', smallFontSize);
                text = cls.getPaper().text(x + w + depth - d, _yv, me.intToInt(i));
                text.attr('fill', 'black');
                text.attr('font-size', smallFontSize);
                text = cls.getPaper().text(_xh, y, me.intToChar(i));
                text.attr('fill', 'black');
                text.attr('font-size', smallFontSize);
                text = cls.getPaper().text(_xh, y + h + depth - d, me.intToChar(i));
                text.attr('fill', 'black');
                text.attr('font-size', smallFontSize);
            });
        }
        drawBorders() {
            const me = this.model;
            const cls = GameObject_5.ViewOptions, depth = cls.borderDepth, d = cls.squareDistance, w = me.get('boardSize') * (d + cls.squareWidth) - d + depth, h = me.get('boardSize') * (d + cls.squareHeight) - d, x = cls.startX, y = cls.startY;
            const p = cls.getPaper();
            const borderLeft = p.rect(x, y + depth, depth, h);
            const borderRight = p.rect(x + w, y + depth, depth, h);
            const borderTop = p.rect(x, y, w + depth, depth);
            const borderBottom = p.rect(x, y + h + depth, w + depth, depth);
            const defColor = '#c75';
            const positions = me.players.playersPositions;
            if (me.get('playersCount') === 2) {
                borderTop.attr('fill', positions[1].color);
                borderRight.attr('fill', defColor);
                borderBottom.attr('fill', positions[0].color);
                borderLeft.attr('fill', defColor);
            }
            else if (me.get('playersCount') === 4) {
                borderTop.attr('fill', positions[2].color);
                borderRight.attr('fill', positions[3].color);
                borderBottom.attr('fill', positions[0].color);
                borderLeft.attr('fill', positions[1].color);
            }
            this.renderLegend();
        }
        afterRender() {
            const me = this.model;
            me.fields.each((model) => {
                new FieldView_1.FieldView({ model: model });
            });
            me.fences.each((model) => {
                (0, FenceView_1.createFenceView)(model);
            });
            me.players.each((model) => {
                new PlayerView_1.PlayerView({ model: model });
            });
            me.players.on('win', player => {
                const names = me.players.getPlayerNames();
                const message = names[player] + ' player ' + 'is winner. Do you want to start new game?';
                if (window.confirm(message)) {
                    document.location.reload();
                }
                else {
                    me.stop();
                }
            });
            this.drawBorders();
            const info = new InfoView_1.InfoView({
                model: me.infoModel,
            });
            info.render();
            new TimerView_1.TimerView({
                model: me.timerModel
            });
            new GameHistoryView_1.GameHistoryView({
                model: me.history
            });
            info.on('click', underscore_14.default.bind(this.move, this));
        }
    }
    exports.BoardView = BoardView;
});
define("models/urlParser", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.buildQuery = exports.parseUrl = void 0;
    function createUrlObject(url) {
        const a = document.createElement('a');
        a.href = url;
        return a;
    }
    const parseUrl = (url) => {
        const result = {};
        let queryString = url;
        let i;
        let s;
        let seg;
        const isArrayExp = /(\w+)\[(\d*)\]/;
        if (url.charAt(0) !== '?') {
            const a = createUrlObject(url);
            queryString = a.search;
        }
        seg = queryString.replace(/^\?/, '').split('&');
        for (i = 0; i < seg.length; i++) {
            if (!seg[i]) {
                continue;
            }
            s = seg[i].split('=');
            let paramName = decodeURIComponent(s[0]), paramValue = decodeURIComponent(s[1]);
            const isArrayItem = isArrayExp.test(paramName);
            if (isArrayItem || result[paramName]) {
                paramName = paramName.replace(isArrayExp, '$1');
                const oldVal = result[paramName];
                const newVal = oldVal ? (oldVal instanceof Array ? oldVal : [oldVal]) : [];
                newVal.push(paramValue);
                result[paramName] = newVal;
            }
            else {
                result[paramName] = paramValue;
            }
        }
        return result;
    };
    exports.parseUrl = parseUrl;
    function buildQuery(params) {
        return Object.keys(params).map(key => key + "=" + params[key]).join("&");
    }
    exports.buildQuery = buildQuery;
});
define("models/BoardSocketEvents", ["require", "exports", "underscore", "models/BoardValidation", "models/urlParser"], function (require, exports, underscore_15, BoardValidation_2, urlParser_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BoardSocketEvents = void 0;
    underscore_15 = __importDefault(underscore_15);
    let boardState = {
        activePlayer: 0,
        playersCount: 2,
        history: [],
    };
    const SERVICE_PATH = "https://api.jsonbin.io/v3";
    const accessToken = "$2b$10$YE9Sljt4vjsX7w1GzojOVOkibhD.DRrH7eAGncSpfhmStD6Dp/kPO";
    const saveData = (path, resourceID, data) => {
        const req = new XMLHttpRequest();
        if (resourceID) {
            req.open("PUT", `${path}/b/${resourceID}`, true);
            req.onreadystatechange = () => {
                if (req.readyState === XMLHttpRequest.DONE) {
                    console.log("Signalling data saved");
                }
            };
        }
        else {
            req.open("POST", `${path}/b`, true);
        }
        req.setRequestHeader("Content-type", "application/json");
        req.setRequestHeader("X-Access-Key", accessToken);
        req.setRequestHeader("X-Bin-Private", "true");
        req.send(JSON.stringify(data));
        return req;
    };
    const createData = (path, data) => {
        const req = saveData(path, "", data);
        return new Promise((resolve, reject) => {
            req.onreadystatechange = () => {
                if (req.readyState === XMLHttpRequest.DONE) {
                    console.log("Signalling data saved", req);
                    try {
                        resolve(JSON.parse(req.responseText).metadata.id);
                    }
                    catch (ex) {
                        reject(ex);
                    }
                }
            };
        });
    };
    const fetchGameState = (path, resourceID) => {
        return fetch(`${path}/b/${resourceID}/latest`, { headers: { "X-Access-Key": accessToken, "X-Bin-Meta": "false" } }).then(r => r.json());
    };
    class BoardSocketEvents extends BoardValidation_2.BoardValidation {
        isOnlineGame() {
            return true;
        }
        remoteEvents(currentPlayer) {
            const me = this;
            const gameId = me.get("roomId");
            if (gameId) {
                this.on('confirmturn', this.onTurnSendSocketEvent);
                this.on('change:activePlayer', this.updateActivePlayer, this);
                setInterval(() => {
                    fetchGameState(SERVICE_PATH, gameId).then(data => {
                        if (data.history && data.history.length && data.history.length !== me.history.get('turns').length) {
                            this.infoModel.set("isActive", true);
                            const lastMove = data.history[data.history.length - 1];
                            if (lastMove.t === "p") {
                                this.onSocketMovePlayer(lastMove);
                            }
                            else {
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
                    }
                    else {
                        boardState = data;
                    }
                    this.onStart(currentPlayer, boardState.activePlayer, boardState.history);
                });
            }
            else {
                createData(SERVICE_PATH, boardState).then((id) => {
                    this.set("roomId", id);
                    document.location =
                        location.origin
                            + location.pathname + "?"
                            + (0, urlParser_1.buildQuery)(Object.assign(Object.assign({}, (0, urlParser_1.parseUrl)(location.search)), { roomId: id }));
                });
            }
        }
        updateActivePlayer() {
            const gameId = this.get("roomId");
            boardState.activePlayer = this.get("activePlayer");
            saveData(SERVICE_PATH, gameId, boardState);
        }
        onTurnSendSocketEvent() {
            if (!this.isPlayerMoved && !this.isFenceMoved) {
                return;
            }
            boardState.history = this.history.get('turns').toJSON();
            if (this.isPlayerMoved) {
                boardState.history.push(Object.assign(Object.assign({}, this.getActivePlayer().pick('x', 'y')), { t: "p" }));
            }
            if (this.isFenceMoved) {
                const eventInfo = this.fences.getMovedFence().pick('x', 'y', 'orientation');
                boardState.history.push({
                    x: eventInfo.x,
                    y: eventInfo.y,
                    t: "f",
                    x2: eventInfo.orientation === "V" ? eventInfo.x : eventInfo.x + 1,
                    y2: eventInfo.orientation === "V" ? eventInfo.y + 1 : eventInfo.y,
                });
            }
            const gameId = this.get("roomId");
            this.infoModel.set("isActive", false);
            saveData(SERVICE_PATH, gameId, boardState);
        }
        onSocketMoveFence(pos) {
            const fence = this.fences.findWhere({
                type: pos.orientation,
                x: pos.x,
                y: pos.y
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
        onStart(currentPlayer, activePlayer, history) {
            const me = this;
            if (history.length) {
                me.history.get('turns').reset(history);
            }
            else {
                me.history.initPlayers();
            }
            const players = me.history.getPlayerPositions(), fences = me.history.getFencesPositions();
            (0, underscore_15.default)(players).each((playerInfo, i) => {
                const player = me.players.at(i);
                if (!underscore_15.default.isUndefined(playerInfo.x) && !underscore_15.default.isUndefined(playerInfo.y)) {
                    player.set({
                        x: playerInfo.x,
                        prev_x: playerInfo.x,
                        y: playerInfo.y,
                        prev_y: playerInfo.y,
                        fencesRemaining: player.get('fencesRemaining') - playerInfo.movedFences
                    });
                }
            });
            (0, underscore_15.default)(fences).each(fencePos => {
                var _a;
                const fence = me.fences.findWhere({
                    x: fencePos.x,
                    y: fencePos.y,
                    type: fencePos.t
                });
                fence === null || fence === void 0 ? void 0 : fence.trigger('movefence');
                (_a = me.fences.getSibling(fence)) === null || _a === void 0 ? void 0 : _a.trigger('movefence');
            });
            me.fences.setBusy();
            me.run(activePlayer, currentPlayer);
        }
        afterInitialize() {
            this.remoteEvents(this.get('currentPlayer'));
        }
    }
    exports.BoardSocketEvents = BoardSocketEvents;
});
define("app/app", ["require", "exports", "views/BoardView", "models/urlParser", "models/BoardValidation", "models/BoardSocketEvents"], function (require, exports, BoardView_1, urlParser_2, BoardValidation_3, BoardSocketEvents_1) {
    "use strict";
    var _a, _b, _c;
    Object.defineProperty(exports, "__esModule", { value: true });
    const params = (0, urlParser_2.parseUrl)(document.location.search);
    const options = {
        currentPlayer: +((_a = params.currentPlayer) !== null && _a !== void 0 ? _a : 0),
        playersCount: +((_b = params.playersCount) !== null && _b !== void 0 ? _b : 2),
        botsCount: +((_c = params.botsCount) !== null && _c !== void 0 ? _c : 0),
        boardSize: 9,
        activePlayer: 0,
        roomId: params.roomId
    };
    const boardModel = params.roomId !== undefined ? new BoardSocketEvents_1.BoardSocketEvents(options) : new BoardValidation_3.BoardValidation(options);
    window.boardModel = boardModel;
    const view = new BoardView_1.BoardView({ model: boardModel });
    view.render();
});
define("models/BotWorker", ["require", "exports", "models/Bot", "models/SmartBot", "models/MegaBot"], function (require, exports, Bot_3, SmartBot_3, MegaBot_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let bot;
    addEventListener('message', event => {
        if (event.data.eventName === 'create') {
            const id = event.data.id;
            const type = event.data.type || 'medium';
            if (type === 'simple') {
                bot = new Bot_3.Bot(id);
            }
            else if (type === 'medium') {
                bot = new SmartBot_3.SmartBot(id);
            }
            else if (type === 'super') {
                bot = new MegaBot_2.MegaBot(id);
            }
            bot.on('client_move_player', function () {
                postMessage({
                    eventName: 'client_move_player',
                    params: Array.prototype.slice.call(arguments, 0)
                });
            });
            bot.on('client_move_fence', function () {
                postMessage({
                    eventName: 'client_move_fence',
                    params: Array.prototype.slice.call(arguments, 0)
                });
            });
        }
        else {
            bot.trigger(event.data.eventName, event.data.params);
        }
    });
});
