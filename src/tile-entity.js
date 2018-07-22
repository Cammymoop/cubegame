
CubotGame.TileEntity = new Phaser.Class({
    Extends: Phaser.GameObjects.Sprite,

    initialize: function (scene, x, y, tileIndex, orientation) {
        "use strict";
        Phaser.GameObjects.Sprite.call(this, scene, 0, 0, 'tiles', tileIndex - 1);
        this.entityInit(x, y, orientation);
    },

    entityInit: function (tileX, tileY, orientation) {
        "use strict";
        this.depth = -10;

        this.tilePosition = new Phaser.Geom.Point(tileX, tileY);
        this.setPosition((this.tilePosition.x * CubotGame.TILE_SIZE) + CubotGame.TILE_SIZE/2, (this.tilePosition.y * CubotGame.TILE_SIZE) + CubotGame.TILE_SIZE/2);

        this.collides = true;

        this.orientation = orientation;
        this.rotation = Math.PI/2 * orientation;

        // state stuff
        this.state = "stationary";
        this.stateData = {};

        // Constants
        this.FALL_SPEED = 0.09;

        this.scene.events.on('update', this.update, this);
        this.scene.add.existing(this);
    },

    sideIsSolid: function (side) {
        return true;
    },

    setState: function (stateName, data) {
        "use strict";
        this.state = stateName;
        switch (stateName) {
            case "falling":
                this.stateData = {
                    nextCheckY: this.y + CubotGame.TILE_SIZE,
                };
                break;
            default:
                this.stateData = {};
        }
        this.onStateChange();
    },
    onStateChange: function () {
        "use strict";
        if (this.state === "stationary") {
            // nothing here
        }
    },
    update: function (time, delta) {
        "use strict";
        if (!this.scene) {
            return; // why is it calling update after it removes the scene while it's restarting?
        }
        var sd = this.stateData;
        if (this.state === "stationary") {
            var tileBelow = this.getCollisionNextTo(0, 1);
            if (!tileBelow) {
                this.setState("falling");
                return;
            }
        } else if (this.state === "falling") {
            this.y += this.FALL_SPEED * delta;
            this.updateTilePosition();
            if (this.y >= sd.nextCheckY) {
                var tileUnder = this.getCollisionNextTo(0, 1, CubotGame.TOP_SIDE);
                if (tileUnder) {
                    this.y = sd.nextCheckY;
                    this.setState("stationary");
                } else {
                    // Continue falling
                    sd.nextCheckY += CubotGame.TILE_SIZE;
                }
            }
        }
    },

    canMove: function (direction, axis) {
        "use strict";
        if (this.state !== "stationary") {
            return false;
        }

        axis = axis.toLowerCase();
        var checkX = axis === 'x' ? direction : 0;
        var checkY = axis === 'y' ? direction : 0;
        return !this.getCollisionNextTo(checkX, checkY);
    },

    updateTilePosition: function () {
        "use strict";
        this.tilePosition = this.scene.getTilePosFromWorldPos(this.x, this.y);
    },
    getCollisionNextTo: function (xDelta, yDelta, side) {
        "use strict";
        return this.scene.collisionCheckIncludingEntities(this.tilePosition.x + xDelta, this.tilePosition.y + yDelta, side);
    },
    getTileNextTo: function (xDelta, yDelta) {
        "use strict";
        return this.scene.getCollisionTileAt(this.tilePosition.x + xDelta, this.tilePosition.y + yDelta);
    },

    die: function () {
        this.scene.events.off('update', this.update);
        this.destroy();
    },
});
