var socket = io.connect();

socket.on('connect', function() { writeMessage('connect'); });

socket.on('disconnect', function() { writeMessage('disconnect'); });

socket.on('message', function(message) { writeMessage(message); });

socket.on('update', function(data) {
  drawCanvas(data);
  window.onresize = function() { drawCanvas(data) };
});

document.onkeydown = function(event) {
  switch (event.keyCode) {
    case 37: socket.emit('turn', 2); break;
    case 38: socket.emit('turn', 3); break;
    case 39: socket.emit('turn', 0); break;
    case 40: socket.emit('turn', 1); break;
  }
};

document.getElementById('start').onclick = function() { socket.emit('start'); };

document.getElementById('reset').onclick = function() { socket.emit('reset'); };

document.getElementById('form').onsubmit = function(event) {
  event.preventDefault();
  var input = document.getElementById('input');
  socket.emit('message', input.value);
  input.value = '';
};

function writeMessage(message) {
  var stdout = document.getElementById('stdout');
  stdout.innerHTML += message +'<br/>';
  stdout.scrollTop = stdout.scrollHeight;
}

function drawCanvas(data) {
  var size = data.size;
  var snakes = data.snakes;
  var canvas = document.getElementById('canvas');
  var context = canvas.getContext('2d');
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  var scale = Math.floor(Math.min(canvas.width / size, canvas.height / size) * .9);
  var offsetX = Math.floor((canvas.width - size * scale) / 2);
  var offsetY = Math.floor((canvas.height - size * scale) / 2);
  // draw field
  context.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  context.fillStyle = '#ccffcc';
  context.fillRect(0, 0, size, size);
  context.beginPath();
  context.rect(0, 0, size, size);
  for (var i = 1; i < size; i++) {
    context.moveTo(i, 0);
    context.lineTo(i, size);
    context.moveTo(0, i);
    context.lineTo(size, i);
  }
  context.lineWidth = .04;
  context.strokeStyle = '#006600';
  context.stroke();
  // draw snakes
  context.setTransform(scale, 0, 0, scale, offsetX + scale / 2, offsetY + scale / 2);
  for (var id in snakes) {
    var snake = snakes[id];
    // draw tail
    if (snake.length > snake.bodyLength) {
      context.beginPath();
      context.moveTo(snake.x[snake.bodyLength], snake.y[snake.bodyLength]);
      for (var i = snake.bodyLength; i < snake.length; i++) {
        context.lineTo(snake.x[i], snake.y[i]);
      }
      context.lineWidth = .5;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = snake.tailColor;
      context.stroke();
    }
    // draw body
    if (snake.bodyLength > 1) {
      context.beginPath();
      context.moveTo(snake.x[1], snake.y[1]);
      for (var i = 1; i < snake.bodyLength; i++) {
        context.lineTo(snake.x[i], snake.y[i]);
      }
      context.lineWidth = .5;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = snake.bodyColor;
      context.stroke();
    }
    // draw head
    context.beginPath();
    context.arc(snake.x[0], snake.y[0], .3, 0, 2 * Math.PI);
    context.fillStyle = '#ccffcc';
    context.fill();
    var theta = snake.direction * Math.PI / 2;
    var phi = Math.PI / 6;
    context.beginPath();
    context.moveTo(snake.x[0], snake.y[0]);
    context.arc(snake.x[0], snake.y[0], .4, theta + phi, theta - phi);
    context.closePath();
    context.fillStyle = snake.living ? snake.bodyColor : snake.tailColor;
    context.fill();
  }
}
