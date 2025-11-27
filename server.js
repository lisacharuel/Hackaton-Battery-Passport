// server.js
const express = require('express');
const neo4j = require('neo4j-driver');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

const NEO4J_URI = 'neo4j://localhost:7687';
const NEO4J_USER = 'neo4j';
const NEO4J_PASS = 'Password';

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASS));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

async function readCsvFallback() {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, 'batteries.csv'))
            .pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
            .on('data', (data) => {
                // simple normalize
                for (const k of Object.keys(data)) {
                    if (typeof data[k] === 'string') data[k] = data[k].trim().replace(/^"|"$/g, '') || null;
                }
                results.push(data);
            })
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
}

async function neo4jSession() {
    try {
        // simple test
        const session = driver.session();
        await session.run('RETURN 1');
        return session;
    } catch (e) {
        return null;
    }
}

// GET battery by serialNumber
app.get('/api/battery/:serialNumber', async (req, res) => {
    const serialNumber = req.params.serialNumber;
    const session = await neo4jSession();

    if (!session) {
        // fallback to CSV
        try {
            const rows = await readCsvFallback();
            const row = rows.find(r => r.serialNumber && r.serialNumber.includes(serialNumber));
            if (!row) return res.status(404).send({ error: 'Batterie non trouvée (fallback CSV).' });
            // Build simple response
            return res.send({
                staticInfo: {
                    serialNumber: row.serialNumber,
                    category: row.batteryCategory,
                    massKg: row.massKg,
                    composition: row.chemicalComposition,
                    initialCapacitykWh: row.initialCapacitykWh
                },
                passport: {
                    passportID: 'BP-' + row.serialNumber,
                    currentStatus: row.status
                },
                owner: { name: row.operator },
                location: { address: 'Fallback CSV location (unknown)' },
                performance: {
                    stateOfHealthPercent: row.stateOfHealthPercent,
                    fullCycles: row.fullCycles
                }
            });
        } catch (err) {
            return res.status(500).send({ error: 'Erreur fallback CSV', detail: err.message });
        }
    }

    try {
        const query = `
            MATCH (b:Battery {serialNumber: $serialNumber})-[:HAS_PASSPORT]->(bp:BatteryPassport)
            OPTIONAL MATCH (bp)-[:HAS_OWNER]->(owner:Actor)
            OPTIONAL MATCH (b)-[:LOCATED_AT]->(loc:Location)
            OPTIONAL MATCH (bp)-[:HAS_PERFORMANCE]->(p:Performance)
            RETURN b, bp, owner, loc, p
        `;
        const result = await session.run(query, { serialNumber });

        if (result.records.length === 0) {
            return res.status(404).send({ error: 'Batterie non trouvée.' });
        }

        const record = result.records[0];
        const bNode = record.get('b') ? record.get('b').properties : null;
        const bpNode = record.get('bp') ? record.get('bp').properties : null;
        const owner = record.get('owner') ? record.get('owner').properties : null;
        const loc = record.get('loc') ? record.get('loc').properties : null;
        const p = record.get('p') ? record.get('p').properties : null;

        res.send({
            staticInfo: bNode,
            passport: bpNode,
            owner,
            location: loc,
            performance: p
        });
    } catch (error) {
        console.error('Erreur API /api/battery:', error);
        res.status(500).send({ error: 'Erreur lors de la récupération des données.' });
    } finally {
        session && (await session.close());
    }
});

// GARAGISTE: declare waste (requests owner to change)
app.post('/api/garagiste/declare-waste', async (req, res) => {
    const { serialNumber, actorId } = req.body;
    if (!serialNumber || !actorId) return res.status(400).send({ error: 'serialNumber et actorId requis' });

    const session = await neo4jSession();
    const ts = new Date().toISOString();
    const eventID = 'EVT-' + uuid();

    if (!session) return res.status(500).send({ error: 'Neo4j non disponible (fallback non supporté pour action).' });

    const query = `
        MATCH (b:Battery {serialNumber: $serialNumber})-[:HAS_PASSPORT]->(bp:BatteryPassport)
        MATCH (garage:Actor {actorID: $actorId})
        OPTIONAL MATCH (owner:Actor)-[:HAS_OWNER]->(bp)
        CREATE (evt:Event {eventID: $eventID, timestamp: datetime($timestamp), description: $description})
        CREATE (garage)-[:PERFORMS]->(evt)
        CREATE (evt)-[:AFFECTS]->(bp)
        FOREACH (o IN CASE WHEN owner IS NULL THEN [] ELSE [owner] END |
            CREATE (garage)-[:REQUESTS_STATUS_CHANGE {requestedStatus: 'waste', timestamp: datetime($timestamp)}]->(o)
        )
        RETURN bp.passportID AS passportID
    `;

    try {
        const result = await session.run(query, {
            serialNumber,
            actorId,
            eventID,
            timestamp: ts,
            description: 'Diagnostic: Déclaration hors d’usage par Garagiste'
        });
        const passportID = (result.records[0] && result.records[0].get('passportID')) || null;
        res.send({ message: `Demande 'waste' créée pour ${serialNumber}.`, passportID });
    } catch (error) {
        console.error("Erreur Garagiste:", error);
        res.status(500).send({ error: "Erreur lors de la déclaration du statut 'waste'." });
    } finally {
        session && (await session.close());
    }
});

// OWNER: validate waste
app.post('/api/owner/validate-waste', async (req, res) => {
    const { passportID, ownerId } = req.body;
    if (!passportID || !ownerId) return res.status(400).send({ error: 'passportID et ownerId requis' });

    const session = await neo4jSession();
    const ts = new Date().toISOString();
    const eventID = 'EVT-' + uuid();

    if (!session) return res.status(500).send({ error: 'Neo4j non disponible (fallback non supporté pour action).' });

    const query = `
        MATCH (bp:BatteryPassport {passportID: $passportID})
        MATCH (owner:Actor {actorID: $ownerId})
        SET bp.currentStatus = 'waste'
        CREATE (evt:Event {eventID: $eventID, timestamp: datetime($timestamp), description: $description})
        CREATE (owner)-[:PERFORMS]->(evt)
        CREATE (evt)-[:AFFECTS]->(bp)
        OPTIONAL MATCH (a:Actor)-[r:REQUESTS_STATUS_CHANGE]->(owner)
        DELETE r
        RETURN bp.currentStatus AS newStatus
    `;

    try {
        const result = await session.run(query, { passportID, ownerId, eventID, timestamp: ts, description: 'Statut mis à jour par Propriétaire: -> waste' });
        if (result.records.length === 0) return res.status(404).send({ error: 'Passport non trouvé.' });
        const newStatus = result.records[0].get('newStatus');
        res.send({ message: `Statut validé : ${newStatus}.` });
    } catch (error) {
        console.error('Erreur Propriétaire BP:', error);
        res.status(500).send({ error: "Erreur lors de la validation du statut." });
    } finally {
        session && (await session.close());
    }
});

// TRIAGE: receive battery
app.post('/api/triage/receive-battery', async (req, res) => {
    const { serialNumber, centerId, locationId } = req.body;
    if (!serialNumber || !centerId || !locationId) return res.status(400).send({ error: 'serialNumber, centerId et locationId requis' });

    const session = await neo4jSession();
    const ts = new Date().toISOString();
    const eventID = 'EVT-' + uuid();

    if (!session) return res.status(500).send({ error: 'Neo4j non disponible (fallback non supporté pour action).' });

    const query = `
        MATCH (b:Battery {serialNumber: $serialNumber})
        MATCH (loc_center:Location {locationID: $locationId})
        MATCH (center:Actor {actorID: $centerId})
        MATCH (bp:BatteryPassport)-[:HAS_PASSPORT]-(b)
        CREATE (evt:Event {eventID: $eventID, timestamp: datetime($timestamp), description: $description})
        CREATE (center)-[:PERFORMS]->(evt)
        CREATE (evt)-[:AFFECTS]->(bp)
        // remove old LOCATED_AT relationships
        OPTIONAL MATCH (b)-[old_loc:LOCATED_AT]->()
        DELETE old_loc
        CREATE (b)-[:LOCATED_AT {timestamp: datetime($timestamp)}]->(loc_center)
        RETURN bp.currentStatus AS status, loc_center.address AS address
    `;

    try {
        const result = await session.run(query, { serialNumber, centerId, locationId, eventID, timestamp: ts, description: 'Réception et vérification par Centre de tri' });
        if (result.records.length === 0) return res.status(404).send({ error: 'Batterie ou entités non trouvées.' });
        const record = result.records[0];
        res.send({
            message: `Réception confirmée pour ${serialNumber}.`,
            status: record.get('status'),
            location: record.get('address')
        });
    } catch (error) {
        console.error('Erreur Centre de Tri:', error);
        res.status(500).send({ error: "Erreur lors de la réception." });
    } finally {
        session && (await session.close());
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
