import bodyParser from "body-parser";
import express from "express";
import {BASE_ONION_ROUTER_PORT, REGISTRY_PORT} from "../config";
import {exportPrvKey, exportPubKey, generateRsaKeyPair} from "@/src/crypto";

const privateKeys: { [key: number]: string } = {};

export async function simpleOnionRouter(nodeId: number) {
    const onionRouter = express();
    onionRouter.use(express.json());
    onionRouter.use(bodyParser.json());

    let lastReceivedEncryptedMessage: string | null = null;
    let lastReceivedDecryptedMessage: string | null = null;
    let lastMessageDestination: number | null = null;

    /*
      // Génération des clés RSA pour chaque nœud
      console.log(`🔑 Generating RSA key pair for node ${nodeId}...`);
      const { publicKey, privateKey } = await generateRsaKeyPair();
      const pubKeyStr = await exportPubKey(publicKey);
      const prvKeyStr = await exportPrvKey(privateKey);
      privateKeys[nodeId] = prvKeyStr || ""; // Stocker la clé privée
    */

    // TODO implement the status route
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

    async function registerNode(nodeId: number, pubKeyStr: string) {
        let success = false;
        for (let i = 0; i < 5; i++) { // Essaye 5 fois au cas où le registre n'est pas prêt
            try {
                const response = await fetch(`http://localhost:${REGISTRY_PORT}/registerNode`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({nodeId, pubKey: pubKeyStr}),
                });

                if (response.ok) {
                    console.log(`✅ Node ${nodeId} successfully registered`);
                    success = true;
                    break;
                } else {
                    console.error(`❌ Node ${nodeId} registration failed. Retrying...`);
                }
            } catch (error) {
                console.error(`❌ Error registering node ${nodeId}:`, error);
            }
            await new Promise((res) => setTimeout(res, 1000)); // Attends 1 seconde avant de réessayer
        }

        if (!success) {
            console.error(`❌ Node ${nodeId} could not register after multiple attempts.`);
        }
    }

    const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
        console.log(
            `Onion router ${nodeId} is listening on port ${
                BASE_ONION_ROUTER_PORT + nodeId
            }`
        );
    });

    return server;
}