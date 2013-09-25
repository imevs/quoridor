var mongoose = require('mongoose');

var RoomSchema = new mongoose.Schema({
    id: { 'type': String },
    state: { 'type': String },
    title: { 'type': String, 'default': '' },
    history: {'type': Array },
    boardSize: { 'type': Number },
    playersCount: { 'type': Number },
    createDate: { 'type': Date },
    activePlayer: { 'type': Number }
});
mongoose.model('Room', RoomSchema);