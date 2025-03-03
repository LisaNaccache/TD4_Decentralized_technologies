import bodyParser from "body-parser";
import express, {Request, Response} from "express";
import {REGISTRY_PORT} from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
    nodeId: number;
    pubKey: string;
};

export type GetNodeRegistryBody = {
    nodes: Node[];
};

const nodes: Node[] = []; // Stocke les nœuds enregistrés

export async function launchRegistry() {
    const _registry = express();
    _registry.use(express.json());
    _registry.use(bodyParser.json());

    _registry.get("/status", (req, res) => {
        res.send("live");
    });

    // Permet aux nœuds de s'enregistrer
    _registry.post("/registerNode", (req, res) => {
        const {nodeId, pubKey} = req.body;

        if (!nodeId || !pubKey) {
            res.status(400).json({error: "Missing nodeId or pubKey"});
        }

        if (!nodes.find(n => n.nodeId === nodeId)) {
            nodes.push({nodeId, pubKey});
            console.log(`Node ${nodeId} registered`);
        }

        res.json({success: true});
        res.send("success");
    });

    _registry.get("/getNodeRegistry", (req: Request, res: Response) => {
        console.log("Current registered nodes:", nodes); // Debug log
        res.json({nodes});
    });

    _registry.post("/resetRegistry", (req: Request, res: Response) => {
        nodes.length = 0; // Vide le tableau
        res.json({ success: true });
    });

    const server = _registry.listen(REGISTRY_PORT, () => {
        console.log(`registry is listening on port ${REGISTRY_PORT}`);
    });

    return server;
}
