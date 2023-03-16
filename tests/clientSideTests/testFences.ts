import { assert } from 'chai';
import { BoardValidation as BoardModel } from '../../src/models/BoardValidation';
import { iter } from '../../src/models/utils';

describe('Test fences', function () {

    let board: BoardModel;

    beforeEach(function () {
        board = new BoardModel({
            playersCount: 2,
            currentPlayer: 0,
            botsCount: 0,
            boardSize: 9,
            activePlayer: 0,
        });
        board.run(0, 0);
    });

    afterEach(() => {
        board.stop();
    });

    it("testCountFencesForTwoPlayers", function () {
        assert.equal(10, board.players.at(0).get('fencesRemaining'));
        assert.equal(10, board.players.at(1).get('fencesRemaining'));
    });

    it("testCountFencesForFourPlayers", function () {
        board = new BoardModel({
            playersCount: 4,
            currentPlayer: 0,
            botsCount: 0,
            boardSize: 9,
            activePlayer: 0
        });
        assert.equal(5, board.players.at(0).get('fencesRemaining'));
        assert.equal(5, board.players.at(1).get('fencesRemaining'));
        assert.equal(5, board.players.at(2).get('fencesRemaining'));
        assert.equal(5, board.players.at(3).get('fencesRemaining'));
    });

    it("testCountFencesAfterTurn", function () {
        var fence = board.fences.findWhere({x: 4, y: 1, orientation: 'V'})!;
        fence.trigger('selected', fence);
        board.trigger('maketurn');
        assert.isTrue(board.fences.isBusy(fence));
        assert.equal(9, board.players.at(0).get('fencesRemaining'));
    });

    it("testCanNotPlaceFenceIfPlayerHasNotFences", function () {
        board.players.at(0).set('fencesRemaining', 0);
        board.players.at(1).set('fencesRemaining', 0);

        var fence = board.fences.findWhere({x: 4, y: 1, orientation: 'V'})!;
        fence.trigger('selected', fence);

        assert.isFalse(board.fences.isBusy(fence));
    });

    it("testTryPlaceFenceOnSamePositionTwiceSameType", function () {
        var fence = board.fences.findWhere({x: 4, y: 1, orientation: 'V'})!;
        fence.trigger('selected', fence);
        fence.trigger('selected', fence);
        board.trigger('maketurn');
        assert.equal(9, board.players.at(0).get('fencesRemaining'));
        assert.equal(10, board.players.at(1).get('fencesRemaining'));
    });

    it("testTryPlaceFenceOnSamePositionTwiceDifferentType", function () {
        var fenceV = board.fences.findWhere({x: 4, y: 1, orientation: 'V'})!;
        var fenceH = board.fences.findWhere({x: 4, y: 1, orientation: 'H'})!;
        fenceV.trigger('selected', fenceV);
        board.trigger('maketurn');
        fenceH.trigger('selected', fenceH);
        board.trigger('maketurn');
        assert.equal(9, board.players.at(0).get('fencesRemaining'));
        assert.equal(9, board.players.at(1).get('fencesRemaining'));
    });

    it("testHasFencesTrue", function () {
        assert.isTrue(board.players.at(0).hasFences());
    });

    it("testHasFencesFalse", function () {
        iter([5, 2], function (i, j) {
            var fence = board.fences.findWhere({x: i, y: j * 2 + 1, orientation: 'V'})!;
            fence.trigger('selected', fence);
            board.trigger('maketurn');
        });
        iter([4, 3], function (i, j) {
            var fence = board.fences.findWhere({x: i * 2 + 1, y: j + 4, orientation: 'H'})!;
            fence.trigger('selected', fence);
            board.trigger('maketurn');
        });

        assert.equal(0, board.players.at(0).get('fencesRemaining'));
        assert.equal(0, board.players.at(1).get('fencesRemaining'));
        assert.isFalse(board.players.at(0).hasFences());
        assert.isFalse(board.players.at(1).hasFences());
    });

    it("test place fence on the board'", function () {
        var fence1 = board.fences.findWhere({x: 4, y: 0, orientation: 'H'})!;
        var fence2 = board.fences.findWhere({x: 3, y: 0, orientation: 'H'})!;

        fence1.trigger('selected', fence1);
        board.trigger('maketurn');

        assert.isTrue(board.fences.isBusy(fence1));
        assert.isTrue(board.fences.isBusy(fence2));
        assert.isFalse(board.fences.validateAndTriggerEventOnFenceAndSibling(fence1, ""));
    });

    it("test Try To place crossed Fence - Not allowed'", function () {
        var fence1 = board.fences.findWhere({x: 4, y: 1, orientation: 'V'})!;
        var fence2 = board.fences.findWhere({x: 5, y: 0, orientation: 'H'})!;

        fence1.trigger('selected', fence1);
        board.trigger('maketurn');
        fence2.trigger('selected', fence2);
        board.trigger('maketurn');

        assert.isTrue(board.fences.isBusy(fence1));
        // TODO fix: assert.isFalse(board.fences.isBusy(fence2));
    });

    it("test Try To place crossed Fence - Allowed (left)'", function () {
        var fence1 = board.fences.findWhere({x: 4, y: 1, orientation: 'V'})!;
        var fence2 = board.fences.findWhere({x: 4, y: 0, orientation: 'H'})!;

        fence1.trigger('selected', fence1);
        board.trigger('maketurn');
        fence2.trigger('selected', fence2);
        board.trigger('maketurn');

        assert.isTrue(board.fences.isBusy(fence1));
        assert.isTrue(board.fences.isBusy(fence2));
    });

    it("test Try To place crossed Fence - Allowed (right)'", function () {
        var fence1 = board.fences.findWhere({x: 4, y: 1, orientation: 'V'})!;
        var fence2 = board.fences.findWhere({x: 6, y: 0, orientation: 'H'})!;

        fence1.trigger('selected', fence1);
        board.trigger('maketurn');
        fence2.trigger('selected', fence2);
        board.trigger('maketurn');

        assert.isTrue(board.fences.isBusy(fence1));
        assert.isTrue(board.fences.isBusy(fence2));
    });

    // для прохождения теста нужно задать координаты пешек
    it("_test Place Fence on the line'", function () {
        board = new BoardModel({
            boardSize: 3,
            currentPlayer: 0,
            botsCount: 0,
            playersCount: 2,
            activePlayer: 0,
        });
        board.run(0, 0);

        var fence1 = board.fences.findWhere({x: 0, y: 0, orientation: 'H'})!;
        var fence2 = board.fences.findWhere({x: 1, y: 0, orientation: 'H'})!;
        var fence3 = board.fences.findWhere({x: 2, y: 0, orientation: 'H'})!;

        fence2.trigger('selected', fence2);
        board.isFenceMoved = true;
        board.trigger('maketurn');

        assert.isTrue(board.fences.isBusy(fence1));
        assert.isTrue(board.fences.isBusy(fence2));

        assert.isFalse(board.fences.isBusy(fence3));
        assert.isFalse(board.fences.validateAndTriggerEventOnFenceAndSibling(fence3, ""));
    });

    it("test Place Fence on the line - check pass - ok'", function () {
        board = new BoardModel({
            boardSize: 5,
            currentPlayer: 0,
            botsCount: 0,
            playersCount: 2,
            activePlayer: 0
        });
        var fence2 = board.fences.findWhere({x: 1, y: 0, orientation: 'H'})!;
        var fence4 = board.fences.findWhere({x: 3, y: 0, orientation: 'H'})!;

        fence2.trigger('selected', fence2);

        assert.isTrue(board.fences.validateAndTriggerEventOnFenceAndSibling(fence4, ""));
    });

});