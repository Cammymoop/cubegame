
CubotGame.Attachment = new Phaser.Class({
    Extends: Phaser.GameObjects.Sprite,

    initialize: function (scene, cubot, attachmentType, side) {
        "use strict";
        Phaser.GameObjects.Sprite.call(this, scene, 0, 0, 'tiles', 21);
        this.attachmentInit(scene, cubot, attachmentType, side);
    },

    attachmentInit: function (scene, cubot, attachmentType, side) {
        "use strict";
        this.depth = -10;

        this.cubot = cubot;
        this.scene = scene;
        this.attachmentType = attachmentType;
        this.side = side;

        if (CubotGame.AttachmentFunctions.hasOwnProperty(attachmentType + "Primary")) {
            this.primaryFunction = CubotGame.AttachmentFunctions[attachmentType + "Primary"];
        }
        if (CubotGame.AttachmentFunctions.hasOwnProperty(attachmentType + "Secondary")) {
            this.secondaryFunction = CubotGame.AttachmentFunctions[attachmentType + "Secondary"];
        }

        // figure out spritesheet index by type
        for (let [k, v] of CubotGame.AttachmentTypes) {
            if (v === this.attachmentType) {
                this.setFrame(k - 1);
            }
        }

        //this.scene.events.on('update', this.update, this);
        this.scene.add.existing(this);
        console.log("attachment added");
    },

    moveSide: function (dir) {
        "use strict";
        this.side += dir;
        this.side = this.side % 4;
        if (this.side < 0) {
            this.side += 4;
        }
    },

    // stubs, each attachment does different things
    primaryFunction: function () {
        return null;
    },
    secondaryFunction: function () {
        return null;
    },

    update: function (time, delta) {
        "use strict";
        // called by the cubot it's attached to
        this.x = this.cubot.x;
        this.y = this.cubot.y;
        this.rotation = this.cubot.rotation + (Math.PI/2 * this.side);
    },
});

CubotGame.AttachmentFunctions = {
    // SLIDER
    sliderPrimary: function () {
        "use strict";
        var params = {};
        params.axis = [0, 2].includes(this.side) ? 'x' : 'y';
        params.direction = [2, 3].includes(this.side) ? 1 : -1;
        params.surfaceDirection = [0, 3].includes(this.side) ? 1 : -1;
        if (this.flipX) {
            params.direction *= -1;
        }
        if (this.cubot.canSlide(params.direction, params.axis, params.surfaceDirection)) {
            this.cubot.setState("sliding", params);
        }
    },
    sliderSecondary: function () {
        "use strict";
        this.flipX = !this.flipX;
    },

    // LASER
    laserPrimary: function () {
        "use strict";
        if (this.cubot.state !== 'stationary') {
            return;
        }
        this.cubot.shootLaser(this.side);
    },
};

CubotGame.AttachmentTypes = new Map([
    [22, 'slider'],
    [23, 'laser'],
]);
