// Tiles
var tiles = {
    ') ': { // Add column
        imgIndex: 0
    },
    '( ': { // Remove column
        imgIndex: 1
    },
    '_ ': { // Add row
        imgIndex: 2
    },
    '^ ': { // Remove row
        imgIndex: 3
    },
    '  ': { // Blank tile
        imgIndex: 4
    },
    'w ': { // wall
        imgIndex: 5
    },
    'b ': { // block
        imgIndex: 6
    },
    'bw': { // wall-forming block
        imgIndex: 7
    },
    'B ': { // bomb
        imgIndex: 8
    },
    'd ': { // diamond
        imgIndex: 9
    },
    'bB': { // explosive block
        imgIndex: 10
    },
    'W ': { // damaged wall
        imgIndex: 11
    },
    '+ ': { // dynamite item
        imgIndex: 12
    },
    ' 0': { // player 1
        imgIndex: 13
    },
    'b(': { // slider block, left
        imgIndex: 14
    },
    'b)': { // slider block, left
        imgIndex: 15
    },
    'b^': { // slider block, left
        imgIndex: 16
    },
    'b_': { // slider block, left
        imgIndex: 17
    }
}

function getImageChar(idx) {
    for (t in tiles) {
        if (tiles[t].imgIndex === idx) return t;
    }
}

// Player
function Player(x, y) {
    this.x = x;
    this.y = y;
    this.frame = 0;

    this.nextMoveX = 0;
    this.nextMoveY = 0;

    this.idleAtTick = -1;
    this.idlePeriod = 16;
    this.moveAtTick = -1;
    this.movePeriod = 4;

    this.move = function (dirX, dirY) {
        this.x += dirX;
        this.y += dirY;

        if (dirY === -1)
            this.frame = 1;
        if (dirX === 1)
            this.frame = 2;
        if (dirY === 1)
            this.frame = 3;
        if (dirX === -1)
            this.frame = 4;

        world.drawTile(this.x, this.y);
    };
};

// World
function World(canvas) {
    var that = this;

    // Tile images
    var tilesImg = document.getElementById('tilesImg');
    var playersImg = document.getElementById('playersImg');
    tilesImg.onload = imageLoaded;
    playersImg.onload = imageLoaded;

    var imagesRemainingToLoad = 2;
    function imageLoaded() {
        imagesRemainingToLoad--;

        if (imagesRemainingToLoad == 0) {
            $(window).resize(function () {
                that.refreshMap();
            });
        }
    }

    //
    // Private variables
    //
    var tick;
    var updateCallback;

    var map;
    var startingMap;
    var canvas = canvas;
    var canvasContext = canvas.getContext && canvas.getContext('2d');
    canvas.width = window.innerWidth * 0.88; //TODO: set canvas size somewhere
    canvas.height = window.innerHeight - 104;

    var mapTilesX;
    var mapTilesY;

    var scale = 1;
    var cameraX = 0; //TODO: allow moving camera
    var cameryY = 0;

    var mapHist = [];
    var numMoves = 0;
    var numDiamonds = 0;

    var sliderAtTick;
    var sliderPeriod = 2;

    var players = [];

    this.initMap = function () {
        numDiamonds = 0;
        players = [];

        for (var i = 0; i < mapTilesY; i++) {
            for (var j = 0; j < mapTilesX; j++) {
                var tile = that.getTile(j, i);
                if (tile == ' 0')
                    players[0] = new Player(j, i);
                if (tile === 'd ')
                    numDiamonds++;
            }
        }
    };

    //
    // Private functions
    //
    var isTileOutsideBounds = function (x, y) {
        return (x < 0 || y < 0 || x >= mapTilesX || y >= mapTilesY);
    };

    var getLetterIndex = function (x, y) {
        return ((y * mapTilesX) + x) * 2;
    };

    var moveTile = function (srcX, srcY, destX, destY) {
        that.setTile(destX, destY, that.getTile(srcX, srcY), true);
        that.setTile(srcX, srcY, '  ', true);
    };

    var addTile = function (x, y, letters) {
        var index = getLetterIndex(x, y);
        map = [map.slice(0, index), letters, map.slice(index)].join('');
    };

    var removeTile = function (x, y) {
        var index = getLetterIndex(x, y);
        map = [map.slice(0, index), map.slice(index + 2)].join('');
    };


    //
    // Privileged functions
    //

    this.update = function () {
        tick++;
        // Player activities
        for (var a in players) {
            // Set player frame to "idle"
            if (tick == players[a].idleAtTick) {
                players[a].frame = 0;
                that.drawTile(players[a].x, players[a].y);
            }

            // Move player if "nextMove" set
            if (tick >= players[a].moveAtTick) {
                if (players[a].nextMoveX || players[a].nextMoveY) {
                    numMoves++;
                    if (that.tryMove(players[a].x, players[a].y, players[a].nextMoveX, players[a].nextMoveY)) {
                        moveTile(players[a].x, players[a].y, players[a].x + players[a].nextMoveX, players[a].y + players[a].nextMoveY);
                        players[a].move(players[a].nextMoveX, players[a].nextMoveY);
                    }
                    else
                        numMoves--;

                    players[a].nextMoveX = 0;
                    players[a].nextMoveY = 0;
                    players[a].moveAtTick = players[a].movePeriod + tick;
                    players[a].idleAtTick = players[a].idlePeriod + tick;
                }
            }
        }

        // Sliders
        if (tick >= sliderAtTick) {
            sliderAtTick = tick + sliderPeriod;
            for (var i = 0; i < mapTilesY; i++) {
                for (var j = 0; j < mapTilesX; j++) {
                    switch (that.getTile(j, i)) {
                        case 'b(': that.tryMove(j, i, -1, 0); break;
                        case 'b)': that.tryMove(j, i, 1, 0); break;
                        case 'b^': that.tryMove(j, i, 0, -1); break;
                        case 'b_': that.tryMove(j, i, 0, 1); break;
                    }
                }
            }
        }
    };

    this.start = function () {
        updateCallback = setInterval(that.update, 50);
    };

    this.pause = function () {
        clearInterval(updateCallback);
    };

    this.drawTile = function (x, y) {
        if (isTileOutsideBounds(x, y))
            throw "Tile drawn out of range: x = " + x.toString() + "; y = " + y.toString();
        var tile = tiles[that.getTile(x, y)];
        if (tile === undefined)
            throw "Attempted to draw undefined tile: letter = " + that.getTile(x, y) + "; x = " + x.toString() + "; y = " + y.toString();

        var srcWidth = tilesImg.width;
        var srcHeight = srcWidth;
        var srcOffset = tile.imgIndex;
        var dest = that.getBounds(x, y);
        canvasContext.clearRect(dest.left, dest.top, dest.width, dest.height);
        var tileChar = getImageChar(srcOffset);
        if (tileChar == ' 0')
            canvasContext.drawImage(playersImg, 0, players[0].frame * srcHeight, srcWidth, srcHeight, dest.left, dest.top, dest.width, dest.height);
        else
            canvasContext.drawImage(tilesImg, 0, srcOffset * srcHeight, srcWidth, srcHeight, dest.left, dest.top, dest.width, dest.height);

    };

    this.setCamera = function () {
        var parent = $(canvas).parent();
        canvas.width = Math.floor(parent.width());
        canvas.height = Math.floor(parent.height());
        that.scale = Math.min(canvas.width / (mapTilesX * tilesImg.width), canvas.height / (mapTilesY * tilesImg.width));
    };

    this.clearCanvas = function () {
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        //canvasContext.fillStyle = '#A0A0A0';
        //canvasContext.fillRect(0, 0, canvas.width, canvas.height);
    };

    this.getMap = function () {
        return {
            letters: map,
            w: mapTilesX,
            h: mapTilesY
        };
    };

    this.setMap = function (chars, w, h) {
        // Ensure that tiles image has been loaded. If not, retry soon
        if (imagesRemainingToLoad > 0) {
            setTimeout(function () { that.setMap(chars, w, h) }, 50);
            return;
        }

        startingMap = chars;
        map = chars;
        mapTilesX = w;
        mapTilesY = h;
        mapHist = [];
        numMoves = 0;
        tick = 0;
        sliderAtTick = 0;

        that.initMap();
        that.refreshMap();
        that.pause();
        that.start();
    };

    this.refreshMap = function () {
        that.setCamera();
        that.drawMap();
    };

    this.drawMap = function () {
        that.clearCanvas();
        for (var i = 0; i < mapTilesY; i++)
            for (var j = 0; j < mapTilesX; j++)
                that.drawTile(j, i);
    };

    this.getBounds = function (x, y) {

        return {
            left: (canvas.width / 2) + ((x - (mapTilesX / 2)) * (tilesImg.width * that.scale)),
            top: (canvas.height / 2) + ((y - (mapTilesY / 2)) * (tilesImg.width * that.scale)),
            width: tilesImg.width * that.scale,
            height: tilesImg.width * that.scale
        }
    };

    this.getCoordsFromPixel = function (pixelX, pixelY) {
        return {
            x: Math.floor((pixelX - ((canvas.width / 2) - ((mapTilesX * tilesImg.width * that.scale) / 2))) / (tilesImg.width * that.scale)),
            y: Math.floor((pixelY - ((canvas.height / 2) - ((mapTilesY * tilesImg.width * that.scale) / 2))) / (tilesImg.width * that.scale))
        }
    };

    this.getTile = function (x, y) {
        if (isTileOutsideBounds(x, y))
            return 'w ';

        return map.substr(getLetterIndex(x, y), 2);
    };

    this.setTile = function (x, y, letter, record) {
        if (isTileOutsideBounds(x, y))
            return;

        // Record the old state of the map, in case of undo
        if (record) {
            if (mapHist[numMoves] === undefined) mapHist[numMoves] = [];
            mapHist[numMoves].push({ x: x, y: y, letter: that.getTile(x, y) });
        }

        var index = getLetterIndex(x, y);
        map = [map.slice(0, index), letter, map.slice(index + 2)].join('');
        that.drawTile(x, y);
    };

    this.setTileAtPixel = function (x, y, letter) {
        var coords = that.getCoordsFromPixel(x, y);
        setTile(coords.x, coords.y, letter);
    };

    this.addRow = function (y) {
        for (var i = mapTilesX - 1; i >= 0; i--)
            addTile(mapTilesX, y, that.getTile(i, y));

        mapTilesY++;
        that.refreshMap();
    };

    this.removeRow = function (y) {
        for (var i = mapTilesX - 1; i >= 0; i--)
            removeTile(0, y);

        mapTilesY--;
        that.refreshMap();
    };

    this.addColumn = function (x) {
        for (var i = mapTilesY - 1; i >= 0; i--)
            addTile(x, i, that.getTile(x, i));

        mapTilesX++;
        that.refreshMap();
    };

    this.removeColumn = function (x) {
        for (var i = mapTilesY - 1; i >= 0; i--)
            removeTile(x, i);

        mapTilesX--;
        that.refreshMap();
    };

    this.restart = function () {
        this.setMap(startingMap, mapTilesX, mapTilesY);
    };

    this.undoMove = function () {
        if (!numMoves) return;

        for (var chg = mapHist[numMoves].length - 1; chg >= 0; chg--) {
            that.setTile(mapHist[numMoves][chg].x, mapHist[numMoves][chg].y, mapHist[numMoves][chg].letter, false);
        }

        mapHist[numMoves] = [];
        numMoves--;
        this.initMap();

        for (var i = 0; i < players.length; i++)
            that.drawTile(players[i].x, players[i].y);
    };

    this.setPlayerMove = function (p, dirX, dirY) {
        players[p].nextMoveX = dirX;
        players[p].nextMoveY = dirY;
    };

    this.tryMove = function (srcX, srcY, dirX, dirY) {
        var destX = srcX + dirX;
        var destY = srcY + dirY;

        var sourceTile = that.getTile(srcX, srcY);
        switch (sourceTile) {
            case ' 0':
                switch (that.getTile(destX, destY)) {
                    case '  ':
                        return true;
                    case 'd ':
                        numDiamonds--;
                        if (numDiamonds === 0) {
                            this.restart(); // TODO: Call winning sequence.
                        }
                        return true;
                    case 'b ':
                    case 'bB':
                    case 'bw':
                    case 'b(':
                    case 'b)':
                    case 'b^':
                    case 'b_':
                        return that.tryMove(destX, destY, dirX, dirY);
                }
                break;
            case 'b ':
            case 'b(':
            case 'b)':
            case 'b^':
            case 'b_':
                switch (that.getTile(destX, destY)) {
                    case '  ':
                        that.setTile(destX, destY, sourceTile, true);
                        that.setTile(srcX, srcY, '  ', true);
                        return true;
                    case 'B ':
                    case 'bB':
                        that.setTile(destX, destY, '  ', true);
                        that.setTile(srcX, srcY, '  ', true);
                        return true;
                }
                break;
            case 'bB':
                switch (that.getTile(destX, destY)) {
                    case '  ':
                        that.setTile(destX, destY, 'bB', true);
                        return true;
                    case 'B ':
                    case 'bB':
                    case 'b ':
                    case 'W ':
                    case 'bw':
                    case 'b(':
                    case 'b)':
                    case 'b^':
                    case 'b_':
                        that.setTile(destX, destY, '  ', true);
                        return true;
                }
                break;
            case 'bw':
                switch (that.getTile(destX, destY)) {
                    case '  ':
                        that.setTile(destX, destY, 'bw', true);
                        return true;
                    case 'bw':
                        that.setTile(destX, destY, 'w ', true);
                        return true;
                    case 'B ':
                    case 'bB':
                        that.setTile(destX, destY, '  ', true);
                        return true;
                }
                break;
        };

        return false;
    };
}