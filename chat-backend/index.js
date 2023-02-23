const Redis = require("ioredis");
const redisClient = new Redis();

const { Server } = require("socket.io");
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const { v4: uuidv4 } = require("uuid");
const Joi = require("joi");

const chatMessageSchema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    message: Joi.string().min(1).max(1000).required()
});

app.get("/", (req, res) => {
    res.send("hello world");
});

io.on("connection", async(socket) => {
    console.log("user connected");

    // redisClient is the place to store data so it is possible to change to postgres or something else
    // lrange is fetch all data from redisClient
    const existingMessages = await redisClient.lrange("chat_messages", 0, -1);
    const parsedMessages = existingMessages.map((item) => JSON.parse(item));
    socket.emit("messages", parsedMessages);

    socket.on("message", (data) => {
        console.log(data);

        // validate message before it saves to db
        const {value, error} = chatMessageSchema.validate(data);

        if (error) {
            console.log("Invalid message, error occured", error);
            socket.emit("error", error);
            return;
        }

        const newMessage = {
            id: uuidv4(),
            username: value.username,
            message: value.message,
            created: new Date().getTime()
        };

        // push stringify messages to redisClient
        redisClient.lpush("chat_messages", JSON.stringify(newMessage));

        io.emit("message", newMessage);
    })
});

server.listen(3000, () => {
    console.log("App started on port 3000");
})