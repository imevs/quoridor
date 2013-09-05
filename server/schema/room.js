var mongoose = require('mongoose');

var RoomSchema = new mongoose.Schema({
    id: { 'type': Number },
    title: { 'type': String, 'default': '' },
    boardSize: { 'type': Number },
    playersCount: { 'type': Number }
});
var RoomStore = mongoose.model('Room', RoomSchema);