import bodyParser from "body-parser";
import express from "express";
import {BASE_ONION_ROUTER_PORT, BASE_USER_PORT, REGISTRY_PORT} from "../config";

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
        console.log(`📩 User ${userId} received message: ${message}`);
        res.json({ success: true });
    });

    _user.post("/sendMessage", async (req, res) => {
        try {
            const { message, destinationUserId } = req.body;

            if (!message || destinationUserId === undefined) {
                return res.status(400).json({ error: "Missing message or destinationUserId" });
            }

            console.log(`📩 User ${userId} sending message: "${message}" to User ${destinationUserId}`);

            const nodesResponse = await fetch(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`);
            const nodesData = (await nodesResponse.json()) as { nodes: { nodeId: number; pubKey: string }[] };
            const nodes = nodesData.nodes || [];

            if (nodes.length < 3) {
                return res.status(500).json({ error: "Not enough nodes to create a circuit" });
            }

            // Sélectionner 3 nœuds aléatoires
            const circuit: number[] = nodes
                .map((n) => n.nodeId)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);

            console.log(`Circuit choisi: ${circuit}`);

            // Stocker le message envoyé
            lastSentMessage = message;

            // Envoi au premier nœud du circuit
            const firstNode = circuit[0];
            const payload = { message, circuit, index: 0 };

            console.log(`Envoi au premier nœud: ${firstNode}`);

            const response = await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + firstNode}/message`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            console.log(`Reponse du nœud ${firstNode}:`, data);

            return res.json({ success: true, circuit });
        } catch (error) {
            console.error("Erreur dans /sendMessage:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    });

    const server = _user.listen(BASE_USER_PORT + userId, () => {
        console.log(
            `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
        );
    });

    return server;
}