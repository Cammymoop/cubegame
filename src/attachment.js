
CubotGame.Attachment = new Phaser.Class({
    Extends: Phaser.GameObjects.Sprite,

    initialize: function (scene, x, y) {
        "use strict";
        Phaser.GameObjects.Sprite.call(this, scene, 0, 0, 'tiles', 0);
        this.attachmentInit(x, y);
    },

    attachmentInit: function (tileX, tileY) {
        "use strict";

        this.scene.events.on('update', this.update, this);
    },

    update: function (time, delta) {
        "use strict";
    },
});
