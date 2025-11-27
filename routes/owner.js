import express from "express";
import { session } from "../neo4j.js";

const router = express.Router();

router.post("/validate-waste", async (req, res) => {
    const { serialNumber, ownerId } = req.body;

    const cypher = `
        MATCH (b:Battery {serialNumber: $serial})
        MATCH (b)-[:HAS_PASSPORT]->(bp:BatteryPassport {currentStatus: "WASTE_REQUESTED"})
        MATCH (bp)-[:HAS_OWNER]->(owner:Actor {actorID: $owner})
        SET bp.currentStatus = "WASTE"
        RETURN bp
    `;

    const s = session();
    try {
        const result = await s.run(cypher, { serial: serialNumber, owner: ownerId });

        if (result.records.length === 0)
            return res.status(403).json({ error: "Aucune demande ou mauvais propriétaire." });

        res.json({ message: "Statut confirmé : WASTE" });
    } catch {
        res.status(500).json({ error: "Erreur propriétaire." });
    } finally {
        await s.close();
    }
});

export default router;
