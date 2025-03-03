import bodyParser from "body-parser";
import express from "express";
import {BASE_USER_PORT} from "../config";

export async function user(userId: number) {
    const _user = express();
    _user.use(express.json());
    _user.use(bodyParser.json());

    let lastReceivedMessage: string | null = null;
    let lastSentMessage: string | null = null;

    // Route to check that the server is active
    _user.get("/status", (req, res) => {
        res.send("live");
    });

    // Get the last encrypted message received
    _user.get("/getLastReceivedMessage", (req, res) => {
        res.json({result: lastReceivedMessage});
    });

    // Get the last message sent
    _user.get("/getLastSentMessage", (req, res) => {
        res.json({result: lastSentMessage});
    });

    _user.post("/message", (req, res) => {
        const {message} = req.body;
        if (!message) {
            res.status(400).json({error: "Message is required"});
        }

        lastReceivedMessage = message;
        res.send("success");
    });


    const server = _user.listen(BASE_USER_PORT + userId, () => {
        console.log(
            `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
        );
    });

    return server;
}