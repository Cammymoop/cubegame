
CubotGame.Projectile = new Phaser.Class({
    Extends: Phaser.GameObjects.Sprite,

    initialize: function (scene, x, y, angle, textureKey, frame) {
        "use strict";
        Phaser.GameObjects.Sprite.call(this, scene, x, y, textureKey, frame);
        this.isProjectile = true;

        // Projectile initialization
        this.depth = 5;

        this.rotation = angle;
        this.orientation = CubotGame.RIGHT_SIDE;
        if (this.rotation >= Math.PI/4 && this.rotation < Math.PI/4 * 3) {
            this.orientation = CubotGame.BOTTOM_SIDE;
        } else if (this.rotation >= Math.PI/4 * 3 && this.rotation < Math.PI + Math.PI/4) {
            this.orientation = CubotGame.LEFT_SIDE;
        } else if (this.rotation >= Math.PI + Math.PI/4 && this.rotation < Math.PI/4 * 7) {
            this.orientation = CubotGame.TOP_SIDE;
        }

        this.collisionOffset = new Phaser.Math.Vector2(0, 0);
        this.collisionOffset.setToPolar(this.rotation, 6);

        this.projectileSpeed = 0.25;
        this.lifetime = 1500;

        this.collides = true;

        // SFX
        this.shotHitSfx = this.scene.sound.add('shot-hit');
        this.shotHitBreakSfx = this.scene.sound.add('shot-hit-break');

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

        this.collide();
    },

    collide: function () {
        if (!this.collides) {
            return;
        }

        // collide with solid tiles and entities
        var collideX = this.x + this.collisionOffset.x;
        var collideY = this.y + this.collisionOffset.y;
        var tilePos = this.scene.getTilePosFromWorldPos(collideX, collideY);
        var collisionHere = this.scene.collisionCheckIncludingEntities(tilePos.x, tilePos.y, (this.orientation + 2) % 4);
        if (collisionHere) {
            if (collisionHere.hasOwnProperty('tile')) {
                this.hitTile(tilePos, collisionHere.tile);
            } else {
                var die = false;
                for (let entity of collisionHere.entities) {
                    if (!entity.intersects(collideX, collideY)) {
                        continue;
                    }
                    entity.onProjectileHit();
                    die = true;
                }
                if (die) {
                    this.die();
                }
            }
        }
    },

    hitTile: function (tilePos, tileIndex) {
        "use strict";
        if (this.scene.tileIsDestructable(tileIndex)) {
            this.scene.setCollisionTile(tilePos.x, tilePos.y, null);
            this.shotHitBreakSfx.play();
        } else {
            this.shotHitSfx.play();
        }
        this.die();
    },

    die: function () {
        "use strict";
        this.scene.events.off('update', this.update, this);
        this.destroy();
    },
});
