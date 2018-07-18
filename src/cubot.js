
CubotGame.Cubot = new Phaser.Class({
    Extends: Phaser.GameObjects.Sprite,

    initialize: function (scene, x, y) {
        "use strict";
        Phaser.GameObjects.Sprite.call(this, scene, 0, 0, 'tiles', 0);
        this.cubotInit(x, y);
    },

    cubotInit: function (tileX, tileY) {
        "use strict";
        //this.tilePosition = new Phaser.Geom.Point(0, 4);
        this.tilePosition = new Phaser.Geom.Point(tileX, tileY);
        this.setPosition((this.tilePosition.x * CubotGame.TILE_SIZE) + CubotGame.TILE_SIZE/2, (this.tilePosition.y * CubotGame.TILE_SIZE) + CubotGame.TILE_SIZE/2);
        this.realPos = new Phaser.Geom.Point(this.x, this.y);
        this.yOffset = 0;

        // state stuff
        this.state = "stationary";
        this.stateData = {};

        // Constants
        this.ROLL_SPEED = 0.07;
        this.SLIDE_SPEED = 0.09;
        this.FALL_SPEED = 0.09;
        this.HYP = Math.sqrt((13*13) + (13*13));

        this.scene.events.on('update', this.update, this);
    },

    setState: function (stateName, data) {
        "use strict";
        this.state = stateName;
        switch (stateName) {
            case "rolling":
                this.stateData = {
                    direction: data.direction,
                    progress: 0,
                    originalX: this.x,
                    targetX: this.x + (CubotGame.TILE_SIZE * data.direction),
                };
                break;
            case "sliding":
                this.stateData = {
                    slideDir: data.direction,
                    slideAxis: data.axis,
                    targetPos: this[data.axis] + (CubotGame.TILE_SIZE * data.direction),
                };
                break;
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
            var tileBelow = this.getTileNextTo(0, 1);
            console.log("below me is: " + tileBelow);
            if (!this.scene.tileIsGround(tileBelow)) {
                this.setState("falling");
            }
        }
    },
    update: function (time, delta) {
        "use strict";
        if (!this.scene) {
            return; // why is it calling update after it removes the scene while it's restarting?
        }
        if (this.state === "stationary") {
            return;
        }
        var sd = this.stateData;
        if (this.state === "rolling") {
            this.x += sd.direction * (this.ROLL_SPEED * delta);
            if (this.x * sd.direction > sd.targetX * sd.direction) {
                this.x = sd.targetX;
                this.y = this.realPos.y;
                this.yOffset = 0;
                this.rotation = 0;
                this.setState("stationary");
            } else {
                sd.progress = (this.x - sd.originalX)/(sd.targetX - sd.originalX);
                this.rotation = (Math.PI/2) * sd.progress * sd.direction;

                // Calculate hight offset due to current rolling angle
                var smAngle = this.getSmallAngle(this.rotation); 
                this.yOffset = (Math.cos(smAngle) * this.HYP) - 13;

                this.y = this.realPos.y - this.yOffset;
            }
            this.updateTilePosition();
        } else if (this.state === "sliding") {
            this[sd.slideAxis] += sd.slideDir * this.SLIDE_SPEED * delta;
            this.updateTilePosition();
            if (this[sd.slideAxis] * sd.slideDir >= sd.targetPos * sd.slideDir) {
                this[sd.slideAxis] = sd.targetPos;
                this.setState("stationary");
            }
        } else if (this.state === "falling") {
            this.y += this.FALL_SPEED * delta;
            this.updateTilePosition();
            if (this.y >= sd.nextCheckY) {
                var tileUnder = this.getTileNextTo(0, 1);
                if (this.scene.tileIsGround(tileUnder)) {
                    this.y = sd.nextCheckY;
                    this.setState("stationary");
                } else {
                    console.log('not stopping falling: ' + tileUnder);
                    // Continue falling
                    sd.nextCheckY += CubotGame.TILE_SIZE;
                }
            }
        }
        this.realPos.setTo(this.x, this.y + this.yOffset);
    },
    canRoll: function (direction) {
        "use strict";
        // all these tiles have to be non-solid for me to roll
        if (this.scene.tileIsSolid(this.getTileNextTo(direction, 0))) { // tile next to me
            return false;
        }
        if (this.scene.tileIsSolid(this.getTileNextTo(direction, -1))) { // tile above the tile next to me
            return false;
        }
        if (this.scene.tileIsSolid(this.getTileNextTo(0, -1))) { // tile above me
            return false;
        }
        return true;
    },
    canSlide: function (direction, axis, surfaceDirection) {
        "use strict";
        axis = axis.toLowerCase();
        var checkX = axis === 'x' ? direction : 0;
        var checkY = axis === 'y' ? direction : 0;
        var surfaceX = axis === 'y' ? surfaceDirection : 0; // x and y inverted here, the surface is perpendicular to the slide
        var surfaceY = axis === 'x' ? surfaceDirection : 0;
        var surfCheck = (axis === 'x' && surfaceDirection === 1) ? t => this.scene.tileIsGround(t) : t => this.scene.tileIsSolid(t); // special case for using the ground to slide
        return (!this.scene.tileIsSolid(this.getTileNextTo(checkX, checkY)) && surfCheck(this.getTileNextTo(surfaceX, surfaceY)));
    },
    updateTilePosition: function () {
        "use strict";
        this.tilePosition = this.scene.getTilePosFromWorldPos(this.x, this.y);
    },
    getSmallAngle: function (angle) {
        "use strict";
        var modAngle = Math.abs(angle % (Math.PI/2));
        if (modAngle > Math.PI/4) {
            return modAngle - Math.PI/4;
        } else {
            return Math.PI/4 - modAngle;
        }
    },
    getTileNextTo: function (xDelta, yDelta) {
        "use strict";
        return this.scene.getCollisionTileAt(this.tilePosition.x + xDelta, this.tilePosition.y + yDelta);
    },
});
