

CubotGame.TILE_SIZE = 26;

CubotGame.BOTTOM_SIDE = 0;
CubotGame.LEFT_SIDE = 1;
CubotGame.TOP_SIDE = 2;
CubotGame.RIGHT_SIDE = 3;

CubotGame.GameScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
        "use strict";
        Phaser.Scene.call(this, { key: 'GameScene' });
    },

    preload: function () {
        "use strict";
        if (this.preloadDone) {
            return;
        }
        this.load.spritesheet('tiles', 'src/img/tiles.png', {frameWidth: 26, frameHeight: 26});
        this.load.spritesheet('slide_effect', 'src/img/slide_effect.png', {frameWidth: 28, frameHeight: 16});
        this.load.image('tiles_img', 'src/img/tiles.png');
        this.load.image('laser_projectile', 'src/img/laser_projectile.png');

        // levels
        this.preloadLevel('map1', 'map/map2.json');
        this.preloadLevel('map2', 'map/map3.json');
        this.preloadLevel('map3', 'map/map4.json');
        this.preloadLevel('mapLong', 'map/mapLong.json');
        this.preloadLevel('mapspacito', 'map/mapspacito.json');

        // audio
        this.load.audio('remove', [
            'src/audio/remove.ogg',
            'src/audio/remove.mp3'
        ]);
        this.load.audio('lasor', [
            'src/audio/lasor.ogg',
            'src/audio/lasor.mp3'
        ]);
        this.load.audio('shot-hit', [
            'src/audio/shot-hit.ogg',
            'src/audio/shot-hit.mp3'
        ]);
        this.load.audio('shot-hit-break', [
            'src/audio/shot-hit-break.ogg',
            'src/audio/shot-hit-break.mp3'
        ]);
        this.load.audio('shff', [
            'src/audio/shff.ogg',
            'src/audio/shff.mp3'
        ]);
        this.load.audio('foo', [
            'src/audio/foo.ogg',
            'src/audio/foo.mp3'
        ]);
    },

    preloadLevel: function (key, file) {
        if (!this.levels) {
            this.levels = [];
        }
        this.load.tilemapTiledJSON(key, file);
        this.levels.push(key);
    },

    create: function (data) {
        "use strict";
        this.preloadDone = true;

        this.cameras.main.setBackgroundColor('#0a0407');
        this.cameras.main.zoom = 3;

        if (data.hasOwnProperty('level')) {
            this.data.set('level', data.level);
        }
        if (!this.data.has('level')) {
            this.data.set('level', 1);
        }

        if (!this.data.has('muted')) {
            this.data.set('muted', false);
        }
        this.sound.mute = this.data.get('muted');

        // load the level
        this.levelLoaded = false;
        this.loadLevel(this.data.get('level'));

        // controls
        this.cursors = this.input.keyboard.createCursorKeys();
        
        this.input.keyboard.on('keydown_R', function (event) {
            this.scene.restart();
        }, this);
        
        this.input.keyboard.on('keydown_M', function (event) {
            this.data.set('muted', !this.data.get('muted'));
            this.sound.mute = this.data.get('muted');
        }, this);
        
        this.input.keyboard.on('keydown_P', function (event) {
            var curZoom = this.cameras.main.zoom;
            this.cameras.main.zoom = {3: 5, 5: 2, 2: 3}[curZoom];
        }, this);
        
        // advance level for debugging
        this.input.keyboard.on('keydown_ZERO', function (event) {
            this.scene.restart({level: this.data.get('level') + 1});
        }, this);

        /*
        this.slideLeftKey = this.input.keyboard.addKey('A');
        this.slideRightKey = this.input.keyboard.addKey('D');
        this.slideUpKey = this.input.keyboard.addKey('W');
        this.slideDownKey = this.input.keyboard.addKey('S');
        */
    },

    goToNextLevel: function () {
        this.scene.restart({ level: this.data.get('level') + 1 });
    },

    loadLevel: function (levelNum) {
        if (levelNum > this.levels.length) {
            console.log("that level doesn't exist, maybe");
            return;
        }
        this.currentLevel = levelNum;

        // the tilemap
        this.map = this.make.tilemap({key: this.levels[levelNum - 1]});
        var tiles = this.map.addTilesetImage('square_game_1', 'tiles_img');
        this.collisionLayer = this.map.createDynamicLayer('Tile Layer 1', tiles, 0, 0);
        this.collisionLayer.depth = 0;
        this.collisionLayer.setOrigin(0);

        this.foregroundLayer = false;
        for (let layer of this.map.layers) {
            if (layer.name !== "Tile Layer 2") {
                continue;
            }
            this.foregroundLayer = this.map.createDynamicLayer('Tile Layer 2', tiles, 0, 0);
            this.foregroundLayer.depth = 10;
            this.foregroundLayer.setOrigin(0);
        }

        // vertically lock the camera inside the map
        this.cameras.main.setBounds(-100000, 0, 200000, this.collisionLayer.height);


        // Tile entities
        // spawn entities
        this.tileEntities = [];
        var entityTileIndexes = [5, 18, 19, 20];
        for (var i of entityTileIndexes) {
            var tile = this.collisionLayer.findByIndex(i);
            while (tile) {
                var te = new CubotGame.TileEntity(this, tile.x, tile.y, i, tile.rotation/(Math.PI/2));
                this.tileEntities.push(te);
                this.setCollisionTile(tile.x, tile.y, null);
                tile = this.collisionLayer.findByIndex(i);
            }
        }

        // spawn the player
        var startingTile = this.collisionLayer.findByIndex(1);
        this.setCollisionTile(startingTile.x, startingTile.y, null);

        this.cubot = new CubotGame.Cubot(this, startingTile.x, startingTile.y);
        this.add.existing(this.cubot);
        this.tileEntities.push(this.cubot);

        this.cameras.main.startFollow(this.cubot.realPos, true);

        this.levelLoaded = true;
    },

    update: function (time, delta) {
        "use strict";
        if (!this.levelLoaded) {
            return;
        }
        
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

    buttonShot: function (tileX, tileY) {
        if (this.currentLevel === 4) {
            if (tileX === 20 && tileY === 10) {
                for (let i = 4; i <= 8; i++) {
                    this.setCollisionTile(25, i, null);
                }
            } else {
                if (!this.buttonsActivated) {
                    this.buttonsActivated = 0;
                }
                this.buttonsActivated++;
                if (this.buttonsActivated >= 3) {
                    this.setCollisionTile(6, 7, null);
                }
            }
        } else if (this.currentLevel === 5 && tileX === 5 && tileY === 6) {
            this.setCollisionTile(22, 2, null);
            this.setCollisionTile(22, 3, null);
        }
    },

    floorSwitchPress: function (tileX, tileY) {
        this.setCollisionTile(tileX, tileY, 29);
        if (this.currentLevel === 5 && tileX === 12 && tileY === 6) {
            this.setCollisionTile(7, 7, null);
            this.setCollisionTile(13, 1, null);
        }
    },

    getForegroundTileAt: function (tileX, tileY) {
        "use strict";
        if (!this.foregroundLayer || tileX < 0 || tileX >= this.map.width || tileY < 0 || tileY >= this.map.height) {
            return -1;
        }
        return this.foregroundLayer.getTileAt(tileX, tileY, true).index;
    },

    getCollisionTileAt: function (tileX, tileY) {
        "use strict";
        if (tileX < 0 || tileX >= this.map.width || tileY < 0 || tileY >= this.map.height) {
            return -1;
        }
        return this.collisionLayer.getTileAt(tileX, tileY, true).index;
    },

    collisionCheckIncludingEntities: function (tileX, tileY, side, collisionType) {
        "use strict";
        var collidable = {};
        var someCollision = false;
        collidable.entities = this.tileEntities.filter(function (te) {
            return (te.tilePosition.x === tileX && te.tilePosition.y === tileY && te.isSolid && te.sideIsSolid(side, collisionType));
        });
        if (collidable.entities.length < 1) {
            delete collidable.entities;
        } else {
            someCollision = true;
        }
        collidable.tile = this.getCollisionTileAt(tileX, tileY);
        if (!this.tileIsSolid(collidable.tile, side)) {
            delete collidable.tile;
        } else {
            someCollision = true;
        }
        return someCollision ? collidable : false;
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
    tileIsSolid: function (tileIndex, side) {
        "use strict";
        var solidTiles = [1, 3, 4, 12, 15, 16, 17, 18];
        if (side === CubotGame.TOP_SIDE) {
            solidTiles.push(13);
            solidTiles.push(9);
        } else if (side ===CubotGame.BOTTOM_SIDE) {
            solidTiles.push(10);
        }
        return solidTiles.includes(tileIndex);
    },

    // Can you sit on this tile?
    tileIsGround: function (tileIndex) {
        "use strict";
        return this.tileIsSolid(tileIndex) || [13].includes(tileIndex); // include all solid tiles
    },

    // Can you use this tile to slide
    tileHasFriction: function (tileIndex, side) {
        if (side === CubotGame.TOP_SIDE && tileIndex === 16) {
            return false;
        }
        if (tileIndex === 9) {
            return false;
        }
        return true;
    },

    // Can you use this collision set to slide
    collisionHasFriction: function (collision, side) {
        if (!collision) {
            return false;
        }
        if (collision.entities) {
            return true;
        }
        var fullSlippery = [9, 17];
        if (fullSlippery.includes(collision.tile) || (side === CubotGame.TOP_SIDE && collision.tile === 16)) {
            return false;
        }
        return true;
    },

    // Can you break this tile?
    tileIsDestructable: function (tileIndex) {
        "use strict";
        return [12, 15].includes(tileIndex);
    },

    getAttachmentByTileIndex: function (tileIndex) {
        if (!CubotGame.AttachmentTypes.has(tileIndex)) {
            return false;
        }
        return CubotGame.AttachmentTypes.get(tileIndex);
    },
});
