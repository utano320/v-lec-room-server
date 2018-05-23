const app = require("http").createServer(handler);
const io = require("socket.io").listen(app);
const fs = require("fs");
const moment = require("moment");
let store = {};
let roomMap = {};

app.listen(8080);

function handler(req, res) {
  fs.readFile(__dirname + "/index.html", function(err, data) {
    if (err) {
      res.writeHead(500);
      return res.end("Error");
    }
    res.writeHead(200);
    res.write(data);
    res.end();
  });
}

const emitRoomInfo = (socket, room, disconnect = false) => {
  socket.broadcast.to(room).emit("room", store[room]);
  if (!disconnect) socket.emit("room", store[room]);
};

io.sockets.on("connection", function(socket) {
  let ref = socket.request.headers.referer;
  let aOrM = ref.indexOf("admin") != -1 ? "admin" : "members";
  let sid = socket.id;

  socket.on("join", function(data) {
    let room = data.room;

    socket.join(room);

    if (!store.hasOwnProperty(room)) {
      store[room] = {
        admin: {},
        members: {},
        logs: []
      };
    }

    store[room][aOrM][sid] = {
      name: data.name,
      color: "white"
    };
    roomMap[sid] = room;

    console.log("[" + sid + "] join to " + room + " (" + aOrM + ")");

    emitRoomInfo(socket, room);
  });

  socket.on("send", function(data) {
    let room = data.room;

    store[room][aOrM][sid].name = data.name;

    emitRoomInfo(socket, room);

    let sendMessage =
      "[" + moment().format("HH:mm:ss") + "] " + data.name + "<br>" + data.msg;

    store[room]["logs"].push(sendMessage);

    socket.emit("message", sendMessage);
    socket.broadcast.to(room).emit("message", sendMessage);
    console.log(sendMessage);
  });

  socket.on("status", function(data) {
    let room = roomMap[sid];
    if (room === undefined) return;

    store[room]["members"][sid].color = data.color;

    emitRoomInfo(socket, room);
  });

  socket.on("disconnect", function() {
    let room = roomMap[sid];
    if (room === undefined) return;

    delete store[room][aOrM][sid];
    delete roomMap[sid];

    emitRoomInfo(socket, room, true);

    console.log("[" + sid + "] disconnected");
  });
});
