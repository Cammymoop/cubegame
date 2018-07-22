
CubotGame.Projectile = new Phaser.Class({
    Extends: Phaser.GameObjects.Sprite,

    initialize: function (scene, x, y, angle, textureKey, frame) {
        "use strict";
        Phaser.GameObjects.Sprite.call(this, scene, x, y, textureKey, frame);
        this.isProjectile = true;

        // Projectile initialization
        this.depth = 5;

        this.rotation = angle;
        this.goingDown = false;
        if (this.rotation > Math.PI/4 && this.rotation < Math.PI/4 * 3) {
            this.goingDown = true;
        }

        this.projectileSpeed = 0.3;
        this.lifetime = 1500;

        this.collides = true;

        this.scene = scene;
        this.scene.events.on('update', this.update, this);
        this.scene.add.existing(this);
    },

    update: function (time, delta) {
        "use strict";
        if (!this.scene) {
            return;
        }
        this.x += this.projectileSpeed * delta * Math.cos(this.rotation);
        this.y += this.projectileSpeed * delta * Math.sin(this.rotation);

        this.lifetime -= delta;
        if (this.lifetime < 0) {
            this.die();
            return;
        }

        if (this.collides) {
            var tilePos = this.scene.getTilePosFromWorldPos(this.x, this.y);
            var tileHere = this.scene.getCollisionTileAt(tilePos.x, tilePos.y);
            if (this.goingDown) {
                if (this.scene.tileIsGround(tileHere)) {
                    this.hitTile(tilePos, tileHere);
                    return;
                }
            } else {
                if (this.scene.tileIsSolid(tileHere)) {
                    this.hitTile(tilePos, tileHere);
                    return;
                }
            }
        }
    },

    hitTile: function (tilePos, tileIndex) {
        "use strict";
        if (this.scene.tileIsDestructable(tileIndex)) {
            this.scene.setCollisionTile(tilePos.x, tilePos.y, null);
        }
        this.die();
    },

    die: function () {
        "use strict";
        this.scene.events.off('update', this.update, this);
        this.destroy();
    },
});
