var socket = io.connect();

document.onkeydown = function(event) {
  switch (event.keyCode) {
    case 37: socket.emit('turn', 2); break;
    case 38: socket.emit('turn', 3); break;
    case 39: socket.emit('turn', 0); break;
    case 40: socket.emit('turn', 1); break;
    case 90: if (event.shiftKey && event.ctrlKey) socket.emit('zombie'); break;
  }
};

var touches = {};
var swipe = 30;

window.ontouchstart = function(event) {
  for (var i = 0; i < event.changedTouches.length; i++) {
    var touch = event.changedTouches[i];
    touches[touch.identifier] = {
      x: touch.clientX,
      y: touch.clientY
    };
  }
};

window.ontouchmove = function(event) {
  event.preventDefault();
  for (var i = 0; i < event.changedTouches.length; i++) {
    var touch = event.changedTouches[i];
    if (touch.clientX > touches[touch.identifier].x + swipe) {
      socket.emit('turn', 0);
      touches[touch.identifier].x += swipe;
    }
    if (touch.clientY > touches[touch.identifier].y + swipe) {
      socket.emit('turn', 1);
      touches[touch.identifier].y += swipe;
    }
    if (touch.clientX < touches[touch.identifier].x - swipe) {
      socket.emit('turn', 2);
      touches[touch.identifier].x -= swipe;
    }
    if (touch.clientY < touches[touch.identifier].y - swipe) {
      socket.emit('turn', 3);
      touches[touch.identifier].y -= swipe;
    }
  }
};

window.ontouchend = function(event) {
  for (var i = 0; i < event.changedTouches.length; i++) {
    var touch = event.changedTouches[i];
    delete touches[touch.identifier];
  }
};

window.ontouchcancel = window.ontouchend;

document.getElementById('entry').onclick = function() { socket.emit('entry'); };

document.getElementById('start').onclick = function() { socket.emit('start'); };

document.getElementById('stop').onclick = function() { socket.emit('stop'); };

document.getElementById('reset').onclick = function() { socket.emit('reset'); };

document.getElementById('config').onsubmit = function(event) {
  event.preventDefault();
  socket.emit('config', {
    size: Number(document.getElementById('size').value),
    waitTime: Number(document.getElementById('waitTime').value),
    initialLength: Number(document.getElementById('initialLength').value),
    lengthenRate: Number(document.getElementById('lengthenRate').value),
  });
};

document.getElementById('cancel').onclick = function() { socket.emit('cancel'); };

document.getElementById('default').onclick = function() { socket.emit('default'); };

document.getElementById('chat').onsubmit = function(event) {
  event.preventDefault();
  var chatText = document.getElementById('chatText');
  socket.emit('message', chatText.value);
  chatText.value = '';
};

socket.on('connect', function() { writeMessage('connect'); });

socket.on('disconnect', function() { writeMessage('disconnect'); });

socket.on('enter your name', function() {
  socket.emit('regist my name', prompt('Enter your name.'));
});

socket.on('update', function(data) {
  drawCanvas(data);
  window.onresize = function() { drawCanvas(data) };
});

socket.on('config', function(settings) {
  document.getElementById('size').value = settings.size;
  document.getElementById('waitTime').value = settings.waitTime;
  document.getElementById('initialLength').value = settings.initialLength;
  document.getElementById('lengthenRate').value = settings.lengthenRate;
});

socket.on('message', function(message) { writeMessage(message); });

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
    if (snake.state != 'vanished') {
      // draw tail
      if (snake.length > snake.bodyLength) {
        context.beginPath();
        context.arc(snake.x[snake.bodyLength], snake.y[snake.bodyLength], .25, 0, 2 * Math.PI);
        context.fillStyle = snake.tailColor;
        context.fill();
        context.beginPath();
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
        context.arc(snake.x[1], snake.y[1], .25, 0, 2 * Math.PI);
        context.fillStyle = snake.bodyColor;
        context.fill();
        context.beginPath();
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
      context.arc(snake.x[0], snake.y[0], .4, 0, 2 * Math.PI);
      context.fillStyle = '#ccffcc';
      context.fill();
      var theta = snake.direction * Math.PI / 2;
      var phi = Math.PI / 6;
      context.beginPath();
      context.moveTo(snake.x[0], snake.y[0]);
      context.arc(snake.x[0], snake.y[0], .4, theta + phi, theta - phi);
      context.closePath();
      context.fillStyle = snake.state == 'living' ? snake.bodyColor : snake.tailColor;
      context.fill();
    }
  }
}

function writeMessage(message) {
  var stdout = document.getElementById('stdout');
  stdout.innerHTML += message +'<br/>';
  stdout.scrollTop = stdout.scrollHeight;
}
