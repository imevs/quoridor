var mongoose = require('mongoose');

var RoomSchema = new mongoose.Schema({
    id: { 'type': Number },
    title: { 'type': String, 'default': '' },
    players: {'type': Array },
    fences: {'type': Array },
    boardSize: { 'type': Number },
    playersCount: { 'type': Number },
    playerNumber: { 'type': Number }
});
var RoomStore = mongoose.model('Room', RoomSchema);