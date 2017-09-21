const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'content-type': 'text/html' });
  response.end(index);
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on port ${port}`);

const io = socketio(app);
const users = {};

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    users[data.name] = socket;

    const joinMsg = {
      name: 'server',
      msg: `There are ${Object.keys(users).length} users online`,
    };

    socket.name = data.name;
    socket.emit('msg', joinMsg);

    socket.join('room1');

    const response = {
      name: 'server',
      msg: `${data.name} has joined room.`,
    };
    socket.broadcast.to('room1').emit('msg', response);

    console.log(`${data.name} joined`);
    socket.emit('msg', { name: 'server', msg: 'You joined the room' });
  });
};

const onMsg = (sock) => {
  const socket = sock;

  socket.on('msgToServer', (data) => {
    let msg;
    const whisperMatch = /\/w ([^\s]+) (.*)/.exec(data.msg);
    if (data.msg === '/dance') {
      msg = { name: 'server', msg: `${socket.name} dances` };
      io.sockets.in('room1').emit('msg', msg);
    } else if (data.msg === '/roll') {
      msg = { name: 'server', msg: `${socket.name} rolls a 3` };
      io.sockets.in('room1').emit('msg', msg);
    } else if (whisperMatch) {
      const target = users[whisperMatch[1]];
      if (target) {
        msg = { name: socket.name, msg: whisperMatch[2] };
        target.emit('whisperFrom', msg);
        socket.emit('whisperTo', { name: target.name, msg: msg.msg });
      }
    } else {
      msg = { name: socket.name, msg: data.msg };
      io.sockets.in('room1').emit('msg', msg);
    }
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    socket.broadcast.to('room1').emit('msg', { name: 'server', msg: `${socket.name} has disconnected` });
    socket.leave('room1');
    delete users[socket.name];
  });
};

io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});

console.log('Websocket server started');
