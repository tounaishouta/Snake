var capacity = 4;

var size;
var waitTime;
var initialLength;
var lengthenRate;
var tail;

setDefault();

var game = false;
var time = 0;
var intervalID;
var connect = new Array(capacity);
var snakes = {};
var deads = [];

var fs = require('fs');
var ejs = require('ejs');

var port = process.env.PORT || 8080;
var server = require('http').createServer(function(request, response) {
  response.writeHead(200, {'Contetn-Type': 'text/html'});
  response.write(ejs.render(fs.readFileSync('./index.html', 'utf-8'), {
    clientjs: fs.readFileSync('./client.js', 'utf-8')
  }));
  response.end();
}).listen(port, function () {
  console.log('Listening on %d', port);
});

var io = require('socket.io').listen(server);
io.on('connection', function(socket) {

  socket.emit('config', getSettings());

  var id = 0;
  while (connect[id])
    id++;
  if (!game && id < capacity) {
    connect[id] = true;
    snakes[id] = new Snake(id);
    emitUpdate();
    switch (id) {
      case 0: socket.emit('message', 'you <-- player0 (upper left, red)'); break;
      case 1: socket.emit('message', 'you <-- player1 (lower right, blue)'); break;
      case 2: socket.emit('message', 'you <-- player2 (upper right, yellow)'); break;
      case 3: socket.emit('message', 'you <-- player3 (lower left, cyan)'); break;
    }
    emitMessage('player'+ id +' > connect');
  }
  else {
    id = capacity;
    emitUpdate();
    socket.emit('message', 'you <- audience');
    emitMessage('audience > connect');
  }

  socket.on('disconnect', function() {
    if (id < capacity) {
      connect[id] = false;
      if (game)
        kill(snakes[id]);
      else
        delete snakes[id];
      emitUpdate();
      emitMessage('player'+ id +' > disconnect');
    }
    else {
      emitUpdate();
      emitMessage('audience > disconnect');
    }
  });

  socket.on('turn', function(direction) {
    if (id < capacity)
      turn(snakes[id], direction);
    emitUpdate();
  });

  socket.on('start', function() {
    if (!game && id < capacity) {
      game = true;
      time = 0;
      intervalID = setInterval(main, waitTime * 100);
      emitUpdate();
      emitMessage('start');
    }
  });

  socket.on('reset', function() {
    if (game) {
      snakes = {};
      for (var i = 0; i < capacity; i++) if (connect[i])
        snakes[i] = new Snake(i);
      game = false;
      clearInterval(intervalID);
      emitUpdate();
      emitMessage('reset');
    }
  });

  socket.on('config', function(settings) {
    if (game) {
      socket.emit('message', 'config is not available in game');
    }
    else {
      setSettings(settings);
      snakes = {};
      for (var i = 0; i < capacity; i++) if (connect[i])
        snakes[i] = new Snake(i);
      emitUpdate();
      io.sockets.emit('config', getSettings());
      emitMessage('config changed');
    }
  });

  socket.on('cancel', function() {
    socket.emit('config', getSettings());
  });

  socket.on('default', function() {
    if (game) {
      socket.emit('message', 'config is not available in game');
    }
    else {
      setDefault();
      snakes = {};
      for (var i = 0; i < capacity; i++) if (connect[i])
        snakes[i] = new Snake(i);
      emitUpdate();
      io.sockets.emit('config', getSettings());
      emitMessage('config changed to default');
    }
  });

  socket.on('message', function(message) {
    if (id < capacity)
      emitMessage('player'+ id +' > '+ message);
    else
      emitMessage('audience > '+ message);
  });
});

function emitUpdate() {
  io.sockets.emit('update', {size: size, snakes: snakes});
}

function emitMessage(message) {
  io.sockets.emit('message', message);
}

function getSettings() {
  return {
    size: size,
    waitTime: waitTime,
    initialLength: initialLength,
    lengthenRate: lengthenRate,
    tail: tail
  };
}

function setSettings(settings) {
  size = settings.size;
  waitTime = settings.waitTime;
  initialLength = settings.initialLength;
  lengthenRate = settings.lengthenRate;
  tail = settings.tail;
}

function setDefault() {
  setSettings({
    size: 10,
    waitTime: 8,
    initialLength: 10,
    lengthenRate: 3,
    tail: true
  });
}

function main() {
  time++;
  deads = [];
  if (time % lengthenRate == 0)
    for (var i in snakes)
      if (snakes[i].living)
        lengthen(snakes[i]);
  for (var i in snakes)
    if (snakes[i].living)
      ahead(snakes[i])
  var touch = {};
  for (var i in snakes)
    if (snakes[i].living)
      touch[i] = touchWall(snakes[i]) || touchSnakes(snakes[i]);
  for (var i in snakes)
    if (snakes[i].living && touch[i])
      shorten(snakes[i]);
  emitUpdate();
  if (deads.length > 0) {
    emitMessage('player'+ deads.join(', player') +' > dead');
  }
  var allDead = true;
  for (var i in snakes)
    allDead &= !snakes[i].living;
  if (allDead) {
    game = false;
    clearInterval(intervalID);
  }
}

var lastTurned = 0;
function Snake(id) {
  this.id = id;
  this.bodyLength = initialLength;
  this.length = this.bodyLength;
  this.x = [];
  this.y = [];
  switch (id) {
    case 0: {
      this.bodyColor = '#cc0000';
      this.tailColor = '#660000';
      for (var i = 0; i < this.length; i++) {
        this.x[i] = 0;
        this.y[i] = 0;
      }
      this.direction = 0;
    } break;
    case 1: {
      this.bodyColor = '#0000cc';
      this.tailColor = '#000066';
      for (var i = 0; i < this.length; i++) {
        this.x[i] = size - 1;
        this.y[i] = size - 1;
      }
      this.direction = 2;
    } break;
    case 2: {
      this.bodyColor = '#cccc00';
      this.tailColor = '#666600';
      for (var i = 0; i < this.length; i++) {
        this.x[i] = size - 1;
        this.y[i] = 0;
      }
      this.direction = 1;
    } break;
    case 3: {
      this.bodyColor = '#00cccc';
      this.tailColor = '#006666';
      for (var i = 0; i < this.length; i++) {
        this.x[i] = 0;
        this.y[i] = size - 1;
      }
      this.direction = 3;
    } break;
  }
  this.turned = lastTurned++;
  this.living = true;
}

function ahead(snake) {
  for (var i = snake.length - 1; i > 0; i--) {
    snake.x[i] = snake.x[i - 1];
    snake.y[i] = snake.y[i - 1];
  }
  switch (snake.direction) {
    case 0: snake.x[0]++; break;
    case 1: snake.y[0]++; break;
    case 2: snake.x[0]--; break;
    case 3: snake.y[0]--; break;
  }
}

function turn(snake, direction) {
  snake.direction = direction;
  snake.turned = lastTurned++;
}

function touchWall(snake) {
  return (snake.x[0] < 0 ||
          snake.y[0] < 0 ||
          snake.x[0] >= size ||
          snake.y[0] >= size);
}

function touchSnakes(snake) {
  var touch = false;
  for (var i in snakes) {
    if (!touch) {
      touch = (snake.x[0] == snakes[i].x[0] &&
               snake.y[0] == snakes[i].y[0] &&
               snake.turned > snakes[i].turned);
      for (var j = 1; !touch && j < snakes[i].length; j++) {
        touch = (snake.x[0] == snakes[i].x[j] &&
                 snake.y[0] == snakes[i].y[j]);
      }
    }
  }
  return touch;
}

function shorten(snake) {
  snake.bodyLength--;
  snake.length--;
  for (var i = 0; i < snake.length; i++) {
    snake.x[i] = snake.x[i + 1];
    snake.y[i] = snake.y[i + 1];
  }
  if (snake.bodyLength < 2) {
    snake.living = false;
    deads.push(snake.id);
  }
}

function lengthen(snake) {
  snake.length++;
  if (!tail)
    snake.bodyLength++;
}

function kill(snake) {
  snake.bodyLength = 1;
  snake.living = false;
}
