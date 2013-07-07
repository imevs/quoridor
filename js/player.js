function Player(name) {
    Player.number = Player.number || 1;
    var me = this;
    me.name = name;
    me.id = 'player_' + Player.number++;
    me.pos = null;
    me.fencesRemaining = null;
}