// Tiles
var tiles = {
    ')': { // Add column
        imgIndex: 0
    },
    '(': { // Remove column
        imgIndex: 1
    },
    '_': { // Add row
        imgIndex: 2
    },
    '^': { // Remove row
        imgIndex: 3
    },
    ' ': { // Blank tile
        imgIndex: 4
    },
    'w': { // wall
        imgIndex: 5
    },
    'b': { // block
        imgIndex: 6
    },
    'h': { // half wall
        imgIndex: 7
    },
    'B': { // bomb
        imgIndex: 8
    },
    'd': { // diamond
        imgIndex: 9
    },
    'v': { // bomb-in-block
        imgIndex: 10
    },
    'W': { // broken wall
        imgIndex: 11
    },
    '+': { // dynamite item
        imgIndex: 12
    },
    '0': { // player 1
        imgIndex: 13
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
    this.frame = 2;

    this.move = function (dirX, dirY) {
        this.x += dirX;
        this.y += dirY;
    }

    this.updateDirection = function (dirX, dirY) {
        if (dirY === -1)
            this.frame = 0;
        if (dirX === 1)
            this.frame = 1;
        if (dirY === 1)
            this.frame = 2;
        if (dirX === -1)
            this.frame = 3;
    }
}


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
    var moveHist = [];
    var numMoves = 0;
    var numDiamonds = 0;

    // Players
    var players = [];

    this.initMap = function () {
        numDiamonds = 0;
        players = [];

        for (var i = 0; i < mapTilesY; i++) {
            for (var j = 0; j < mapTilesX; j++) {
                var tile = that.getTile(j, i);
                if (tile >= '0' && tile <= '3')
                    players[tile - '0'] = new Player(j, i);
                if (tile === 'd')
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
        return (y * mapTilesX) + x;
    };

    var drawTile = function (x, y) {
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
        if (tileChar >= '0' && tileChar <= '3')
            canvasContext.drawImage(playersImg, 0, players[parseInt(tileChar)].frame * srcHeight, srcWidth, srcHeight, dest.left, dest.top, dest.width, dest.height);
        else
            canvasContext.drawImage(tilesImg, 0, srcOffset * srcHeight, srcWidth, srcHeight, dest.left, dest.top, dest.width, dest.height);

    };

    var moveTile = function (srcX, srcY, destX, destY) {
        that.setTile(destX, destY, that.getTile(srcX, srcY), true);
        that.setTile(srcX, srcY, ' ', true);
    };

    var addTile = function (x, y, letter) {
        var index = getLetterIndex(x, y);
        map = [map.slice(0, index), letter, map.slice(index)].join('');
    };

    var removeTile = function (x, y) {
        var index = getLetterIndex(x, y);
        map = [map.slice(0, index), map.slice(index + 1)].join('');
    };


    //
    // Privileged functions
    //
    this.setCamera = function () {
        var parent = $(canvas).parent();
        canvas.width = Math.floor(parent.width());
        canvas.height = Math.floor(parent.height());
        that.scale = Math.min(canvas.width / (mapTilesX * tilesImg.width), canvas.height / (mapTilesY * tilesImg.width));
    };

    this.clearCanvas = function () {
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
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
        moveHist = [];
        numMoves = 0;

        that.initMap();
        that.refreshMap();
    };

    this.refreshMap = function () {
        that.setCamera();
        that.drawMap();
    };

    this.drawMap = function () {
        that.clearCanvas();
        for (var i = 0; i < mapTilesY; i++)
            for (var j = 0; j < mapTilesX; j++)
                drawTile(j, i);
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
            return 'w';

        return map.charAt(getLetterIndex(x, y));
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
        if (map.charAt(index) != letter) {
            map = [map.slice(0, index), letter, map.slice(index + 1)].join('');
            drawTile(x, y);
        }
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
    }

    this.undoMove = function () {
        if (!numMoves) return;

        mapHist[numMoves] = [];
        numMoves--;
        var previous = moveHist[numMoves];
        players[previous.player].move(previous.dirX * -1, previous.dirY * -1);

        for (chg in mapHist[numMoves]) {
            that.setTile(mapHist[numMoves][chg].x, mapHist[numMoves][chg].y, mapHist[numMoves][chg].letter);
        }
    }

    this.redoMove = function () {
        var next = moveHist[numMoves];
        if (next === undefined) return;
        this.tryMove(next.player, next.dirX, next.dirY, true);
    }

    this.tryMove = function (p, dirX, dirY, isRedo) {
        var success = false;
        var srcX = players[p].x;
        var srcY = players[p].y;
        var destX = players[p].x + dirX;
        var destY = players[p].y + dirY;
        var blockDestX = srcX + (dirX * 2);
        var blockDestY = srcY + (dirY * 2);

        switch (that.getTile(destX, destY)) {
            case ' ':
                success = true;
                break;
            case 'd':
                numDiamonds--;
                if (numDiamonds === 0) {
                    this.restart(); // TODO: Call winning sequence.
                    return;
                }
                success = true;
                break;
            case 'b':

                switch (that.getTile(blockDestX, blockDestY)) {
                    case ' ':
                        that.setTile(blockDestX, blockDestY, 'b', true);
                        success = true;
                        break;
                    case 'B':
                    case 'v':
                        that.setTile(blockDestX, blockDestY, ' ', true);
                        success = true;
                        break;
                }
                break;
            case 'v':
                switch (that.getTile(blockDestX, blockDestY)) {
                    case ' ':
                        that.setTile(blockDestX, blockDestY, 'v', true);
                        success = true;
                        break;
                    case 'B':
                    case 'v':
                    case 'b':
                    case 'W':
                    case 'h':
                        that.setTile(blockDestX, blockDestY, ' ', true);
                        success = true;
						break;
                }
                break;
			case 'h':
                switch (that.getTile(blockDestX, blockDestY)) {
                    case ' ':
                        that.setTile(blockDestX, blockDestY, 'h', true);
                        success = true;
                        break;
                    case 'h':
                        that.setTile(blockDestX, blockDestY, 'w', true);
                        success = true;
                        break;
                    case 'B': 
                    case 'v':
                        that.setTile(blockDestX, blockDestY, ' ', true);
                        success = true;
                        break;
                }
                break;
        }

        players[p].updateDirection(dirX, dirY);

        if (success) {
            moveTile(srcX, srcY, destX, destY);
            players[p].move(dirX, dirY);

            if (!isRedo) {
                // Record the move and erase subsequent moves in the recording
                for (var i = numMoves; moveHist[i] != undefined; i++)
                    moveHist[i] = undefined;
                moveHist[numMoves] = { player: p, dirX: dirX, dirY: dirY };
            }

            numMoves++;
        }
    };
}
