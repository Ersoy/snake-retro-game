class Grid {
    constructor(canvas, cols, rows, blockSize) {
        this.canvas = canvas;
        this.width = cols * blockSize;
        this.height = rows * blockSize;
        this.blockSize = blockSize;

        canvas.width = this.width;
        canvas.height = this.height;

        this.cols = cols;
        this.rows = rows;
    }

    clear() {
        var ctx = this.canvas.getContext("2d");
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, this.width, this.height);
    }

    selectColor(x, y, color) {
        if (this.width / x < 1 || this.height / y < 1)
            return;
        var ctx = this.canvas.getContext("2d");
        ctx.fillStyle = color;
        ctx.fillRect(x * this.blockSize - 1, y * this.blockSize - 1, this.blockSize - 1, this.blockSize - 1);
    }

    select(x, y) {
        this.selectColor(x, y, "#00ff00");
    }

    unselect(x, y) {
        this.selectColor(x, y, "black");
    }

    write(text, color) {
        var ctx = this.canvas.getContext("2d");
        ctx.font = "3em Bungee";
        ctx.textAlign = "center";
        if (color)
            ctx.fillStyle = color;
        else
            ctx.fillStyle = "red";
        ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    }
}

class Snake {
    constructor(grid, size) {
        this.grid = grid;
        this.size = size;
        this.reset();
    }

    reset(x, y) {
        if (!x)
            x = Math.floor(this.grid.cols / 2) - 1;
        if (!y)
            y = Math.floor(this.grid.rows / 2) - this.size;

        this.grid.clear();

        this.growSize = 0;
        this.snake = [];
        this.direction = dDown;
        for (var i = 0; i < this.size; i++) {
            this.snake[i] = { x: x, y: y - i };
        }
    }

    pos() {
        return [this.snake[0].x, this.snake[0].y];
    }

    calculate() {
        switch (this.direction) {
            case dLeft:
                this.snake.unshift({ x: this.snake[0].x - 1, y: this.snake[0].y });
                break;
            case dRight:
                this.snake.unshift({ x: this.snake[0].x + 1, y: this.snake[0].y });
                break;
            case dDown:
                this.snake.unshift({ x: this.snake[0].x, y: this.snake[0].y + 1 });
                break;
            case dUp:
                this.snake.unshift({ x: this.snake[0].x, y: this.snake[0].y - 1 });
                break;
        }
        if (this.growSize > 0) {
            this.growSize--;
            return null;
        }
        else
            return this.snake.pop();
    }

    go(direction) {
        if (direction)
            this.direction = direction;

        var popped = this.calculate();

        if (this.collided())
            return;

        this.draw();
        if (popped)
            this.grid.unselect(popped.x, popped.y);
    }

    draw() {
        for (var i = 1; i < this.snake.length; i++) {
            this.grid.select(this.snake[i].x, this.snake[i].y);
        }
        this.grid.selectColor(this.snake[0].x, this.snake[0].y, "white");
    }

    grow(size) {
        if (!size)
            size = 1;
        this.growSize = size;
    }

    collided() {
        if (this.snake[0].x < 0 || this.snake[0].y < 0)
            return true;
        if (this.grid.cols <= this.snake[0].x || this.grid.rows <= this.snake[0].y)
            return true;

        for (var i = 1; i < this.snake.length; i++) {
            var p = this.snake[i];
            if (p.x == this.snake[0].x && p.y == this.snake[0].y)
                return true;
        }

        return false;
    }

    contains(x, y) {
        for (var i = 0; i < this.snake.length; i++) {
            var p = this.snake[i];
            if (p.x == x && p.y == y)
                return true;
        }
        return false;
    }
}

class Game {
    constructor(canvas, cols, rows, size, snakeSize) {
        this.grid = new Grid(canvas, cols, rows, size);
        this.snake = new Snake(this.grid, snakeSize);
        this.started = false;

        this.onGameOver = null;
        this.onTime = null;
        this.onScore = null;

        this.fish = null;
        this.score = 0;
        this.time = 0;

        this.scores = [];

        this.eatSound = new Audio("https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/water_droplet.mp3");
        this.collideSound = new Audio("https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/branch_break.mp3");
    }

    start() {
        if (this.started)
            return;

        this.started = true;
        this.snake.reset();

        this.fish = null;
        this.score = 0;
        this.time = 0;

        var self = this;

        var timer = window.setInterval(function () {
            self.time++;
            if (self.onTime)
                self.onTime(self.time);
        }, 1000);

        var fishTimer = window.setInterval(function () {
            self.drawFish();
            if (self.fish != null) {
                return;
            }
            self.generateFish();
        }, 130);

        var loop = window.setInterval(function () {
            if (self.snake.collided()) {
                window.clearInterval(loop);
                window.clearInterval(timer);
                window.clearInterval(fishTimer);

                self.started = false;

                self.collideSound.play();

                if (self.onGameOver)
                    self.onGameOver();

                if (self.score > 0) {
                    self.scores.push([self.score, self.time]);
                    self.scores = self.scores.sort().reverse();
                }

                return;
            }

            self.snake.go();

            if (self.eat()) {
                self.eatSound.currentTime = 0;
                self.eatSound.play();
            }
        }, 130);
    }

    eat() {
        var pos = this.snake.pos();
        if (pos[0] == this.fish[0] && pos[1] == this.fish[1]) {
            this.fish = null;
            this.score++;
            this.snake.grow();
            if (this.onScore)
                this.onScore(this.score);
            return true;
        }
        return false;
    }

    setDirection(direction) {
        this.snake.direction = direction;
    }

    getDirection() {
        return this.snake.direction;
    }

    drawFish() {
        if (this.fish == null)
            return;
        this.grid.selectColor(this.fish[0], this.fish[1], "red");
    }

    generateFish() {
        var x = 0;
        var y = 0;
        do {
            x = Math.floor(Math.random() * (this.grid.cols));
            y = Math.floor(Math.random() * (this.grid.rows));
        } while (this.snake.contains(x, y));
        this.fish = [x, y];
    }

    write(text, color) {
        this.grid.write(text, color);
    }

    clear() {
        this.grid.clear();
    }
}