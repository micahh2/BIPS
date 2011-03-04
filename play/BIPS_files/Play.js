$(function () {
    // handle keypresses
    $(document).keydown(function (event) {
        switch (event.keyCode) {
            case 37: // left arrow
            case 65: // 'A' key
                world.tryMove(0, -1, 0);
                break;
            case 38: // up arrow
            case 87: // 'W' key
                world.tryMove(0, 0, -1);
                break;
            case 39: // right arrow
            case 68: // 'D' key
                world.tryMove(0, 1, 0);
                break;
            case 40: // down arrow
            case 83: // 'S' key
                world.tryMove(0, 0, 1);
                break;
            case 85: // 'U' key
                world.undoMove();
                break;
            case 82: // 'R' key
                world.restart();
                break;
            case 79: // 'O' key
                world.redoMove();
                break;
            //default: alert(event.keyCode);        
        };
    });

    $('#restartButton').click(function () { world.restart() });
    $('#undoButton').click(world.undoMove);
    $('#redoButton').click(function () { world.redoMove() });
}); 