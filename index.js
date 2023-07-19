const express = require("express");
const app = express();
const http = require("http").Server(app);
const cors = require("cors");
// const { Socket } = require("socket.io");
require("dotenv").config();
app.use(cors());
const path = require("path");



const io = require("socket.io")(http, {
  cors: {
    origin: ["http://localhost:3000/"],
    // origin: ["https://online-ide-frontend.vercel.app/"],
    origin: "*",
  },
});

const port = process.env.PORT || 5000;

app.use(express.json());

app.use("/", require("./route"));

// app.use("/",require("./socket"))

let joinedMembersDetails = new Map();
let membersRoom = new Map();

io.on("connection", (Socket) => {
  Socket.on("join", (data) => {


    const { roomID, username } = data;

    if (!roomID) {
      return;
    }

    Socket.join(roomID);
    data.socketId = Socket.id;
    membersRoom.set(Socket.id, roomID);
    if (joinedMembersDetails[roomID]) {
      joinedMembersDetails[roomID].push(data);
    } else {
      joinedMembersDetails[roomID] = [data];
    }

    io.to(roomID).emit("get-joined-members", {
      joinedusername: username,
      MembersDetails: joinedMembersDetails[roomID],
    });
  });
  Socket.on("disconnect", () => {
    let roomID = membersRoom.get(Socket.id);
    if (roomID) {
      let room = joinedMembersDetails[roomID];

      if (room) {
        let index = room.findIndex((member) => member.socketId === Socket.id);

        if (index !== -1) {
          let user = room[index];
          // console.log("user", user);
          user.roomID = roomID;
          Socket.broadcast.emit("user-disconnected", user);
          room.splice(index, 1);
          joinedMembersDetails[roomID] = room;
          // console.log("room", room);
          io.to(roomID).emit("joined-members-list", room);
        }
      }
    }
    membersRoom.delete(Socket.id);
  });

  
  Socket.on("codeChange", ({roomID,value}) => {

    Socket.broadcast.emit("codeChangeListen", {
      roomID,
      value
    });
  });
  Socket.on("inputChange", ({roomID,newValue}) => {
    // Broadcast the input change event to all connected clients
    // console.log("here " ,newValue);
    
    Socket.broadcast.emit("inputChangeListen", {
      roomID,
      newValue
    });
  });
  Socket.on('outputChange', ({roomID,output}) => {

    // Broadcast the input change event to all connected clients
    Socket.broadcast.emit("outputChangeListen", {
      roomID,
      output
    });
    
  });


});
if (process.env.NODE_ENV === "production") {
  console.log("In production stage");
  app.use(express.static(path.resolve(__dirname, "../", "client", "build")));
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../", "client", "build", "index.html"));
  });
}

http.listen(port, () => {
  console.log(`connection is successful at ${port}`);
});
