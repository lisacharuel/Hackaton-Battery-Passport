import express from "express";
import { session } from "../neo4j.js";

const router = express.Router();

router.post("/receive-battery", async (req, res) => {
    const { serialNumber, centerId } = req.body;

    const cypher = `
        MATCH (b:Battery {serialNumber: $serial})
        MATCH (b)-[:HAS_PASSPORT]->(bp:BatteryPassport {currentStatus: "WASTE"})
        MATCH (center:Actor {actorID: $center})
        SET bp.currentStatus = "RECYCLED"
        RETURN bp
    `;

    const s = session();
    try {
        const result = await s.run(cypher, { serial: serialNumber, center: centerId });

        if (result.records.length === 0)
            return res.status(404).json({ error: "Impossible de réceptionner." });

        res.json({ message: "Batterie reçue", status: "RECYCLED" });
    } catch {
        res.status(500).json({ error: "Erreur triage." });
    } finally {
        await s.close();
    }
});


export default router;
