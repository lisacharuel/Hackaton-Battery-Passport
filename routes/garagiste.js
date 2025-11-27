import express from "express";
import { session } from "../neo4j.js";
import neo4j from "neo4j-driver";

const router = express.Router();

// Garagiste déclare la batterie hors d'usage
router.post("/declare-waste", async (req, res) => {
    const { serialNumber } = req.body;

    const cypher = `
        MATCH (b:Battery {serialNumber: $serial})
        MATCH (b)-[:HAS_PASSPORT]->(bp:BatteryPassport)
        SET bp.currentStatus = "WASTE_REQUESTED"
        RETURN bp
    `;

    const s = session();
    try {
        const result = await s.run(cypher, { serial: serialNumber });

        if (result.records.length === 0)
            return res.status(404).json({ error: "Batterie introuvable." });

        res.json({ message: "Statut demandé : WASTE_REQUESTED" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erreur garage." });
    } finally {
        await s.close();
    }
});


export default router;
