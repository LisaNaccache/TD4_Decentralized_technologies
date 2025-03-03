import bodyParser from "body-parser";
import express from "express";
import {BASE_ONION_ROUTER_PORT, BASE_USER_PORT} from "../config";
import {generateRsaKeyPair, exportPubKey, exportPrvKey} from "../crypto";

const privateKeys: { [key: number]: string } = {};

export async function simpleOnionRouter(nodeId: number) {
    const onionRouter = express();
    onionRouter.use(express.json());
    onionRouter.use(bodyParser.json());

    let lastReceivedEncryptedMessage: string | null = null;
    let lastReceivedDecryptedMessage: string | null = null;
    let lastMessageDestination: number | null = null;


    // Génération des clés RSA pour chaque nœud
    console.log(`🔑 Generating RSA key pair for node ${nodeId}...`);
    const {publicKey, privateKey} = await generateRsaKeyPair();
    const pubKeyStr = await exportPubKey(publicKey);
    const prvKeyStr = await exportPrvKey(privateKey);
    privateKeys[nodeId] = prvKeyStr || ""; // Stocker la clé privée

    onionRouter.get("/getPrivateKey", (req, res) => {
        res.json({result: privateKeys[nodeId]});
    });

    onionRouter.get("/status", (req, res) => {
        res.send("live");
    });

    // Get the last encrypted message received
    onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
        res.json({result: lastReceivedEncryptedMessage});
    });

    // Get the last decrypted message received
    onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
        res.json({result: lastReceivedDecryptedMessage});
    });

    // Get the destination of the last message received
    onionRouter.get("/getLastMessageDestination", (req, res) => {
        res.json({result: lastMessageDestination});
    });

    onionRouter.post("/message", async (req, res) => {
        const {message, circuit, index} = req.body;

        if (!message || !circuit || index === undefined) {
            res.status(400).json({error: "Invalid message format"});
        }

        console.log(`📩 Node ${nodeId} received message: ${message}`);

        lastReceivedEncryptedMessage = message;

        if (index < circuit.length - 1) {
            // Transférer au prochain nœud
            const nextNode = circuit[index + 1];
            console.log(`➡️ Forwarding to Node ${nextNode}`);

            await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + nextNode}/message`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({message, circuit, index: index + 1}),
            });
        } else {
            // Dernière étape, envoi au destinataire
            const destinationUserPort = BASE_USER_PORT + circuit[index];
            console.log(`🏁 Final destination: User ${circuit[index]}`);

            await fetch(`http://localhost:${destinationUserPort}/message`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({message}),
            });
        }

        res.json({success: true});
    });

    const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
        console.log(
            `Onion router ${nodeId} is listening on port ${
                BASE_ONION_ROUTER_PORT + nodeId
            }`
        );
    });

    return server;
}