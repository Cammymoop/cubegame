

CubotGame.TILE_SIZE = 26;

CubotGame.GameScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
        "use strict";
        Phaser.Scene.call(this, { key: 'GameScene' });
    },

    preload: function () {
        "use strict";
        this.load.spritesheet('tiles', 'src/img/tiles.png', {frameWidth: 26, frameHeight: 26});
        this.load.spritesheet('slide_effect', 'src/img/slide_effect.png', {frameWidth: 28, frameHeight: 16});
        this.load.image('tiles_img', 'src/img/tiles.png');
        this.load.image('laser_projectile', 'src/img/laser_projectile.png');
        this.load.tilemapTiledJSON('map1', 'map/map2.json');
        this.load.tilemapTiledJSON('map2', 'map/map3.json');
    },

    create: function () {
        "use strict";
        this.cameras.main.setBackgroundColor('#0a0407');

        // the level
        this.make.tilemap({key: 'map1'});
        this.map = this.make.tilemap({ key: 'map1' });
        var tiles = this.map.addTilesetImage('square_game_1', 'tiles_img');
        this.collisionLayer = this.map.createDynamicLayer('Tile Layer 1', tiles, 0, 0);
        this.collisionLayer.depth = 0;
        this.collisionLayer.setOrigin(0);

        var startingTile = this.collisionLayer.findByIndex(1);
        this.setCollisionTile(startingTile.x, startingTile.y, null);

        // the player
        this.cubot = new CubotGame.Cubot(this, startingTile.x, startingTile.y);
        this.add.existing(this.cubot);

        this.cameras.main.startFollow(this.cubot.realPos, true);

        // controls
        this.cursors = this.input.keyboard.createCursorKeys();
        
        this.input.keyboard.on('keydown_R', function (event) {
            this.scene.restart();
        }, this);
        
        this.input.keyboard.on('keydown_P', function (event) {
            this.cameras.main.zoom = this.cameras.main.zoom === 1 ? 3 : 1;
        }, this);

        /*
        this.slideLeftKey = this.input.keyboard.addKey('A');
        this.slideRightKey = this.input.keyboard.addKey('D');
        this.slideUpKey = this.input.keyboard.addKey('W');
        this.slideDownKey = this.input.keyboard.addKey('S');
        */
    },

    update: function (time, delta) {
        "use strict";
        
        if (this.cubot.state === "stationary") {
            if (this.cursors.right.isDown) {
                if (this.cubot.canRoll(1)) {
                    this.cubot.setState("rolling", {direction: 1});
                }
            } else if (this.cursors.left.isDown) {
                if (this.cubot.canRoll(-1)) {
                    this.cubot.setState("rolling", {direction: -1});
                }
            /*
            } else if (this.slideRightKey.isDown) {
                if (this.cubot.canSlide(1, 'x', 1)) {
                    this.cubot.setState("sliding", {direction: 1, axis: 'x', surfaceDirection: 1});
                }
            } else if (this.slideLeftKey.isDown) {
                if (this.cubot.canSlide(-1, 'x', 1)) {
                    this.cubot.setState("sliding", {direction: -1, axis: 'x', surfaceDirection: 1});
                }
            } else if (this.slideDownKey.isDown) {
                if (this.cubot.canSlide(1, 'y', -1)) {
                    this.cubot.setState("sliding", {direction: 1, axis: 'y', surfaceDirection: -1});
                }
            } else if (this.slideUpKey.isDown) {
                if (this.cubot.canSlide(-1, 'y', -1)) {
                    this.cubot.setState("sliding", {direction: -1, axis: 'y', surfaceDirection: -1});
                }
            */
            }
        }

        this.cubot.update(time, delta);
    },

    getCollisionTileAt: function (tileX, tileY) {
        "use strict";
        if (tileX < 0 || tileX >= this.map.width || tileY < 0 || tileY >= this.map.height) {
            return -1;
        }
        return this.collisionLayer.getTileAt(tileX, tileY, true).index;
    },

    setCollisionTile: function (tileX, tileY, newTileIndex) {
        "use strict";
        if (newTileIndex === null) {
            this.collisionLayer.removeTileAt(tileX, tileY);
        } else {
            this.collisionLayer.putTileAt(newTileIndex, tileX, tileY);
        }
    },

    getTilePosFromWorldPos: function (worldX, worldY) {
        "use strict";
        return new Phaser.Geom.Point(Math.floor(worldX/CubotGame.TILE_SIZE), Math.floor(worldY/CubotGame.TILE_SIZE));
    },

    // Do you collide with this tile?
    tileIsSolid: function (tileIndex) {
        "use strict";
        return [1, 3, 4, 12].includes(tileIndex);
    },

    // Can you sit on this tile?
    tileIsGround: function (tileIndex) {
        "use strict";
        return this.tileIsSolid(tileIndex) || [13].includes(tileIndex); // include all solid tiles
    },

    // Can you break this tile?
    tileIsDestructable: function (tileIndex) {
        "use strict";
        return [12].includes(tileIndex);
    },

    getAttachmentByTileIndex: function (tileIndex) {
        if (!CubotGame.AttachmentTypes.has(tileIndex)) {
            return false;
        }
        return CubotGame.AttachmentTypes.get(tileIndex);
    },
});
