var capacity = 4;

var size;
var waitTime;
var initialLength;
var lengthenRate;

setDefault();

var nextID = 0;
var state = 'start';
var intervalID;
var time = 0;
var turnCount = 0;
var entries = [];
var snakes = [];
var names = [];
var dying = [];
var vanishing = [];

var port = process.env.PORT || 5000;

var server = require('http').createServer(function(request, response) {
  var fs = require('fs');
  var ejs = require('ejs');
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

  var id = nextID++;
  var name = 'Anonymous'+ id;
  names[id] = name;

  socket.emit('update', getScreen());
  socket.emit('config', getSettings());
  socket.emit('enter your name');

  socket.on('disconnect', function() {
    io.sockets.emit('message', 'host > '+ name +' log out');
  });

  socket.on('regist my name', function(string) {
    if (string) {
      name = string;
      names[id] = name;
    }
    socket.emit('message', 'host > welcome, '+ name +'!');
    socket.broadcast.emit('message', 'host > '+ name +' log in');
  });

  socket.on('turn', function(direction) {
    for (var i in entries) {
      if (entries[i] == id) {
        turn(snakes[i], direction);
        io.sockets.emit('update', getScreen());
      }
    }
  });

  socket.on('zombie', function() {
    if (state == 'play') {
      for (var i in entries) {
        if (entries[i] == id && snakes[i].state == 'dead') {
          zombie(snakes[i]);
          io.sockets.emit('update', getScreen());
          io.sockets.emit('message', 'host > '+ name +' is revived as a zombie');
        }
      }
    }
  });

  socket.on('entry', function() {
    if (state == 'start') {
      var entried = false;
      for (var i in entries)
        if (entries[i] == id)
          entried = true;
      if (entried)
        socket.emit('message', 'host > already entried');
      else {
        var i = 0;
        while (i in entries)
          i++;
        if (i < capacity) {
          entries[i] = id;
          snakes[i] = new Snake(i);
          io.sockets.emit('update', getScreen());
          switch (i) {
            case 0: io.sockets.emit('message', 'host > '+ name +' plays read'); break;
            case 1: io.sockets.emit('message', 'host > '+ name +' plays blue'); break;
            case 2: io.sockets.emit('message', 'host > '+ name +' plays yellow'); break;
            case 3: io.sockets.emit('message', 'host > '+ name +' plays cyan'); break;
          }
        }
        else
          socket.emit('message', 'host > capacity over');
      }
    }
    else
      socket.emit('message', 'host > entry is available before start');
  });

  socket.on('start', function() {
    if (state == 'start' || state == 'pause')
      start();
    else
      socket.emit('message', 'host > start is available after reset');
  });

  socket.on('stop', function() {
    if (state == 'play')
      stop();
    else
      socket.emit('message', 'host > stop is available in game');
  });

  socket.on('reset', function() {
    if (state == 'play')
      socket.emit('message', 'host > reset is not available in game');
    else
      reset();
  });

  socket.on('config', function(settings) {
    if (state == 'play')
      socket.emit('message', 'host > config is not available in game');
    else {
      setSettings(settings);
      io.sockets.emit('config', getSettings());
      io.sockets.emit('message', 'host > config changed');
      reset();
    }
  });

  socket.on('cancel', function() {
    socket.emit('config', getSettings());
  });

  socket.on('default', function() {
    if (state == 'play')
      socket.emit('message', 'host > config is not available in game');
    else {
      setDefault();
      io.sockets.emit('config', getSettings());
      io.sockets.emit('message', 'host > config changed to default');
      reset();
    }
  });

  socket.on('message', function(message) {
    io.sockets.emit('message', name +' > '+ message);
  });
});

function start() {
  state = 'play';
  intervalID = setInterval(main, waitTime * 100);
  io.sockets.emit('message', 'host > game start');
}

function stop() {
  state = 'pause';
  clearInterval(intervalID);
  io.sockets.emit('message', 'host > game stop');
}

function over() {
  state = 'over';
  clearInterval(intervalID);
  io.sockets.emit('message', 'host > game over');
}

function reset() {
  state = 'start';
  time = 0;
  turnCount = 0;
  entries = [];
  snakes = [];
  io.sockets.emit('update', getScreen());
  io.sockets.emit('message', 'host > reset');
}

function getScreen() {
  return {
    size: size,
    snakes: snakes,
  };
}

function getSettings() {
  return {
    size: size,
    waitTime: waitTime,
    initialLength: initialLength,
    lengthenRate: lengthenRate,
  };
}

function setSettings(settings) {
  size = settings.size;
  waitTime = settings.waitTime;
  initialLength = settings.initialLength;
  lengthenRate = settings.lengthenRate;
}

function setDefault() {
  setSettings({
    size: 10,
    waitTime: 8,
    initialLength: 10,
    lengthenRate: 3,
  });
}

function main() {
  time++;
  if (lengthenRate > 0 && time % lengthenRate == 0)
    for (var i in snakes)
      if (snakes[i].state == 'living')
        lengthen(snakes[i]);
  for (var i in snakes)
    if (snakes[i].state == 'living' || snakes[i].state == 'zombie')
      ahead(snakes[i])
  var touch = [];
  for (var i in snakes)
    if (snakes[i].state == 'living' || snakes[i].state == 'zombie')
      touch[i] = touchWall(snakes[i]) || touchSnakes(snakes[i]);
  dying = [];
  vanishing = [];
  for (var i in snakes)
    if (touch[i])
      shorten(snakes[i]);
  io.sockets.emit('update', getScreen());
  if (dying.length == 1)
    io.sockets.emit('message', 'host > '+ dying[0] +' dies');
  else if (dying.length > 1)
    io.sockets.emit('message', 'host > '+ dying.join(', ') +' die');
  if (vanishing.length == 1)
    io.sockets.emit('message', 'host > '+ vanishing[0] +' vanishes');
  else if (vanishing.length > 1)
    io.sockets.emit('message', 'host > '+ vanishing.join(', ') +' vanish');
  var living = false;
  for (var i in snakes)
    living |= snakes[i].state == 'living';
  if (!living)
    over();
}

function Snake(entryNum) {
  this.bodyLength = initialLength;
  this.length = this.bodyLength;
  this.x = [];
  this.y = [];
  switch (entryNum) {
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
  this.turn = turnCount++;
  this.state = 'living';
  this.name = names[entries[entryNum]];
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
  snake.turn = turnCount++;
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
               (snake.turn > snakes[i].turn ||
                snakes[i].state == 'dead'));
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
  switch (snake.state) {
    case 'living':
      if (snake.bodyLength == 1) {
        snake.state = 'dead';
        dying.push(snake.name);
      }
      break;
    case 'zombie':
      snake.bodyLength = 1;
      if (snake.length == 0) {
        snake.state = 'vanished';
        vanishing.push(snake.name);
      }
      break;
  }
}

function lengthen(snake) {
  snake.length++;
}

function zombie(snake) {
  snake.state = 'zombie';
}
