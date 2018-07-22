
CubotGame.Cubot = new Phaser.Class({
    Extends: Phaser.GameObjects.Sprite,

    initialize: function (scene, x, y) {
        "use strict";
        Phaser.GameObjects.Sprite.call(this, scene, 0, 0, 'tiles', 0);
        this.cubotInit(x, y);
    },

    cubotInit: function (tileX, tileY) {
        "use strict";
        this.depth = -20;

        this.tilePosition = new Phaser.Geom.Point(tileX, tileY);
        this.setPosition((this.tilePosition.x * CubotGame.TILE_SIZE) + CubotGame.TILE_SIZE/2, (this.tilePosition.y * CubotGame.TILE_SIZE) + CubotGame.TILE_SIZE/2);
        this.realPos = new Phaser.Geom.Point(this.x, this.y);
        this.yOffset = 0;

        // Attachments
        this.attachments = [];
        this.selectedAttachment = false;

        this.selectIndicator = this.scene.add.sprite(this.x, this.y, 'tiles', 1);
        this.selectIndicator.depth = -19;
        this.selectIndicator.setVisible(false);

        // state stuff
        this.state = "stationary";
        this.stateData = {};

        // Constants
        this.ROLL_SPEED = 0.07;
        this.SLIDE_SPEED = 0.09;
        this.FALL_SPEED = 0.09;
        this.HYP = Math.sqrt((13*13) + (13*13));

        // Particles
        this.scene.anims.create({
            key: 'slide_effect_anim',
            frames: this.scene.anims.generateFrameNumbers('slide_effect', {}),
        });
        this.slide_effect_settings = {
            key: 'slide_effect',
            x: 0,
            y: 0,
            anims: 'slide_effect_anim',
        };

        // Controls
        // cycle selected attachment
        this.scene.input.keyboard.on('keydown_C', function (e) { this.cycleSelectedAttachment(); }, this);

        // trigger selected attachment primary and secondary functions
        this.scene.input.keyboard.on('keydown_Z', function (e) { if (e.repeat || !this.selectedAttachment) { return; } this.selectedAttachment.primaryFunction(); }, this);
        this.scene.input.keyboard.on('keydown_X', function (e) { if (e.repeat || !this.selectedAttachment) { return; } this.selectedAttachment.secondaryFunction(); }, this);

        /*
        // testing laser
        this.laserDir = 3;
        this.scene.input.keyboard.on('keydown_SPACE', function (e) { if (e.repeat) { return; } this.shootLaser(this.laserDir); this.laserDir = (this.laserDir + 1) % 4; }, this);
        */

        this.scene.events.on('update', this.update, this);
    },

    cycleSelectedAttachment: function () {
        if (!this.selectedAttachment || this.attachments.length < 2) {
            return;
        }
        var side = this.selectedAttachment.side;
        var select = this.selectedAttachment;
        // loop through the sides clockwise from the side of the selected attachment, selecting the next attachment found
        for (let s of [(side + 1) % 4, (side + 2) % 4, (side + 3) % 4]) {
            for (let a of this.attachments) {
                if (a.side === s) {
                    select = a;
                }
            }
        }
        this.selectedAttachment = select;
    },

    shootLaser (side) {
        var pos = new Phaser.Math.Vector2(this.x, this.y);
        var offset = new Phaser.Math.Vector2(0, 0);
        var shotAngle = Math.PI/2 + (Math.PI/2 * side);
        offset.setToPolar(shotAngle, this.width/2 + 5);
        pos.add(offset);
        var projectile = new CubotGame.Projectile(this.scene, pos.x, pos.y, shotAngle, 'laser_projectile', 0);
    },

    spawnSlideParticle (direction, axis, surfaceDirection) {
        var particle = this.scene.make.sprite(this.slide_effect_settings);
        particle.depth = 0;

        var rotate = axis === 'y';
        var flipLeft = direction === (rotate ? 1 : -1);
        var flipUp = surfaceDirection === -1;
        particle.flipX = !flipLeft;
        particle.flipY = flipUp;
        particle.angle = rotate ? -90 : 0;
        particle.setOrigin(flipLeft ? 0 : 1, flipUp ? 0 : 1);
        particle.x = this.x + (rotate ? (this.width/2)*surfaceDirection : 0);
        particle.y = this.y + (rotate ? 0 : (this.height/2)*surfaceDirection);

        particle.on('animationcomplete', function () { this.destroy(); }, particle);
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
                    slideSurfaceDir: data.surfaceDirection,
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
            //console.log("below me is: " + tileBelow);
            if (!this.scene.tileIsGround(tileBelow)) {
                this.setState("falling");
                return;
            }

            var attachmentHere = this.scene.getAttachmentByTileIndex(this.getTileNextTo(0, 0));
            if (attachmentHere !== false) {
                // make the new attachment
                var attach = new CubotGame.Attachment(this.scene, this, attachmentHere, 0);
                // select this attachment if it's the only one
                if (!this.selectedAttachment || this.selectedAttachment.side === 0) {
                    this.selectedAttachment = attach;
                }
                // remove any attachments on the same side
                this.attachments = this.attachments.filter(function (att) {
                    if (att.side !== 0) {
                        return true;
                    }
                    att.destroy();
                    return false;
                });
                // then add the new one
                this.attachments.push(attach);

                // clear the attachment tile from the map
                this.scene.setCollisionTile(this.tilePosition.x, this.tilePosition.y, null);
            }
        } else if (this.state === "sliding") {
            var sd = this.stateData;
            this.spawnSlideParticle(sd.slideDir, sd.slideAxis, sd.slideSurfaceDir);
        }
    },
    update: function (time, delta) {
        "use strict";
        if (!this.scene) {
            return; // why is it calling update after it removes the scene while it's restarting?
        }
        var sd = this.stateData;
        if (this.state === "stationary") {
            // do nothing
        } else if (this.state === "rolling") {
            this.x += sd.direction * (this.ROLL_SPEED * delta);
            if (this.x * sd.direction > sd.targetX * sd.direction) {
                this.x = sd.targetX;
                this.y = this.realPos.y;
                this.yOffset = 0;
                this.rotation = 0;

                this.attachments.forEach(function (att) {
                    att.moveSide(sd.direction);
                });

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
                    // Continue falling
                    sd.nextCheckY += CubotGame.TILE_SIZE;
                }
            }
        }
        this.realPos.setTo(Math.floor(this.x), Math.floor(this.y + this.yOffset));

        this.indicatorUpdate();
        this.attachmentsUpdate();
    },

    indicatorUpdate: function () {
        this.selectIndicator.setPosition(this.x, this.y);
        if (this.selectedAttachment) {
            if (!this.selectIndicator.visible) {
                this.selectIndicator.setVisible(true);
            }
            this.selectIndicator.setRotation(this.rotation + (this.selectedAttachment.side * Math.PI/2));
        } else if (this.selectIndicator.visible) {
            this.selectIndicator.setVisible(false);
            this.selectIndicator.setVisible(false);
        }
    },

    attachmentsUpdate: function () {
        for (var i = 0; i < this.attachments.length; i++) {
            this.attachments[i].update();
        }
    },

    canRoll: function (direction) {
        "use strict";
        if (this.state !== "stationary") {
            return false;
        }

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

    // direction = positive or negative
    // axis = sliding horizontally (x) or vertically (y)
    // surfaceDirection = is the attachment on the positive or negative side (perpendicular to the slide direction)
    //  need to know this to check for "grip"
    canSlide: function (direction, axis, surfaceDirection) {
        "use strict";
        if (this.state !== "stationary") {
            return false;
        }

        axis = axis.toLowerCase();
        var checkX = axis === 'x' ? direction : 0;
        var checkY = axis === 'y' ? direction : 0;
        var surfaceX = axis === 'y' ? surfaceDirection : 0; // x and y inverted here, the surface is perpendicular to the slide
        var surfaceY = axis === 'x' ? surfaceDirection : 0;
        var surfCheck = (axis === 'x' && surfaceDirection === 1) ? t => this.scene.tileIsGround(t) : t => this.scene.tileIsSolid(t); // special case for using a ground tile as "grip" to slide
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

    die: function () {
        this.scene.events.off('update', this.update);
        this.destroy();
    },
});
