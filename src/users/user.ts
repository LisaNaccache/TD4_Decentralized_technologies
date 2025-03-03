import bodyParser from "body-parser";
import express from "express";
import {BASE_ONION_ROUTER_PORT, BASE_USER_PORT} from "../config";

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

    _user.post("/sendMessage", async (req, res) => {
        const {message, destinationUserId} = req.body;

        if (!message || destinationUserId === undefined) {
            res.status(400).json({error: "Missing message or destinationUserId"});
        }

        console.log(`📩 User ${userId} sending message: ${message} to User ${destinationUserId}`);

        // Simulation d'un circuit (on utilisera 3 nœuds aléatoires)
        const circuit = [0, 1, 2].map(() => Math.floor(Math.random() * 10)); // 3 nœuds aléatoires
        console.log(`🔀 Circuit chosen: ${circuit}`);

        // Stocker le circuit pour les tests
        lastSentMessage = message;

        // Envoyer le message au premier nœud
        await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + circuit[0]}/message`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({message, circuit, index: 0}),
        });

        res.json({success: true});
    });


    const server = _user.listen(BASE_USER_PORT + userId, () => {
        console.log(
            `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
        );
    });

    return server;
}