const {io} = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
    console.log("Connected:", socket.id);
});

socket.on("robot:update", (robot) => {
    console.log("Robot update received:");
    console.log(robot);
});

socket.on("disconnect", () => {
    console.log("Disconnected");
});


socket.on("connect_error", (error) => {
    console.error("Connection error:", error.message);
});
