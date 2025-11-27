import express from "express";
import { session } from "../neo4j.js";

const router = express.Router();

// Charger les infos d'une batterie
router.get("/:serialNumber", async (req, res) => {
    const serial = req.params.serialNumber;

    const cypher = `
        MATCH (b:Battery {serialNumber: $serial})
        MATCH (b)-[:HAS_PASSPORT]->(bp:BatteryPassport)
        MATCH (bp)-[:HAS_OWNER]->(owner:Actor)
        OPTIONAL MATCH (bp)-[:HAS_PERFORMANCE]->(perf:Performance)
        OPTIONAL MATCH (b)-[:LOCATED_AT]->(loc:Location)
        RETURN 
            b AS battery, 
            bp AS passport, 
            owner AS owner, 
            loc AS location,
            perf AS performance
    `;

    const s = session();
    try {
        const result = await s.run(cypher, { serial });

        if (result.records.length === 0)
            return res.status(404).json({ error: "Batterie non trouvée." });

        const rec = result.records[0];

        res.json({
            staticInfo: {
                serialNumber: rec.get("battery").properties.serialNumber,
                massKg: rec.get("battery").properties.massKg,
                composition: rec.get("battery").properties.composition,
                initialCapacitykWh: rec.get("battery").properties.initialCapacitykWh
            },
            passport: rec.get("passport").properties,
            owner: rec.get("owner").properties,
            location: rec.get("location")
                ? rec.get("location").properties
                : { type: "Unknown", address: "Unknown" },
            performance: rec.get("performance")
                ? rec.get("performance").properties
                : { stateOfHealthPercent: 0, fullCycles: 0 }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur." });
    } finally {
        await s.close();
    }
});

export default router;
