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
        const session = driver.session();
        await session.run('RETURN 1');
        return session;
    } catch (e) {
        return null;
    }
}

// ----------------- GET BATTERY -----------------
app.get('/api/battery/:serialNumber', async (req, res) => {
    const serialNumber = req.params.serialNumber;
    const session = await neo4jSession();

    if (!session) {
        try {
            const rows = await readCsvFallback();
            const row = rows.find(r => r.serialNumber && r.serialNumber.includes(serialNumber));
            if (!row) return res.status(404).send({ error: 'Batterie non trouvée (fallback CSV).' });
            return res.send({
                staticInfo: {
                    serialNumber: row.serialNumber,
                    category: row.batteryCategory,
                    massKg: row.massKg,
                    composition: row.chemicalComposition,
                    initialCapacitykWh: row.initialCapacitykWh
                },
                passport: { passportID: 'BP-' + row.serialNumber, currentStatus: row.status },
                owner: { name: row.operator },
                location: { address: 'Fallback CSV location (unknown)' },
                performance: { stateOfHealthPercent: row.stateOfHealthPercent, fullCycles: row.fullCycles }
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

        if (result.records.length === 0) return res.status(404).send({ error: 'Batterie non trouvée.' });

        const record = result.records[0];
        res.send({
            staticInfo: record.get('b')?.properties || null,
            passport: record.get('bp')?.properties || null,
            owner: record.get('owner')?.properties || null,
            location: record.get('loc')?.properties || null,
            performance: record.get('p')?.properties || null
        });
    } catch (error) {
        console.error('Erreur API /api/battery:', error);
        res.status(500).send({ error: 'Erreur lors de la récupération des données.' });
    } finally {
        session && (await session.close());
    }
});

// ----------------- GARAGISTE -----------------
app.post('/api/garage/declare-waste', async (req, res) => {
    const { serialNumber, eventID, timestamp, description } = req.body;
    if (!serialNumber || !eventID || !timestamp || !description) {
        return res.status(400).send({ error: "Paramètres manquants" });
    }

    const session = driver.session();
    try {
        const query = `
            MATCH (b:Battery {serialNumber: $serialNumber})-[:HAS_PASSPORT]->(bp:BatteryPassport)
            SET bp.currentStatus = "WASTE"
            MERGE (e:Event {eventID: $eventID})
              SET e.timestamp = $timestamp, e.description = $description
            MERGE (bp)-[:HAS_EVENT]->(e)
            RETURN bp.currentStatus AS newStatus
        `;
        const result = await session.run(query, { serialNumber, eventID, timestamp, description });
        res.send({ newStatus: result.records[0].get('newStatus') });
    } catch (err) {
        console.error("Erreur Garagiste:", err);
        res.status(500).send({ error: err.message });
    } finally {
        await session.close();
    }
});

// ----------------- PROPRIETAIRE -----------------
app.post('/api/owner/validate-waste', async (req, res) => {
    const { passportID, ownerId, eventID, timestamp, description } = req.body;
    if (!passportID || !ownerId || !eventID || !timestamp || !description) {
        return res.status(400).send({ error: "Paramètres manquants" });
    }

    const session = driver.session();
    try {
        const query = `
            MATCH (bp:BatteryPassport {passportID: $passportID})-[:HAS_OWNER]->(owner:Actor {id: $ownerId})
            SET bp.currentStatus = "WASTE_VALIDATED"
            MERGE (e:Event {eventID: $eventID})
              SET e.timestamp = $timestamp, e.description = $description
            MERGE (bp)-[:HAS_EVENT]->(e)
            RETURN bp.currentStatus AS newStatus
        `;
        const result = await session.run(query, { passportID, ownerId, eventID, timestamp, description });
        res.send({ newStatus: result.records[0].get('newStatus') });
    } catch (err) {
        console.error("Erreur Propriétaire BP:", err);
        res.status(500).send({ error: err.message });
    } finally {
        await session.close();
    }
});

// ----------------- CENTRE DE TRI -----------------
app.post('/api/triage/receive-battery', async (req, res) => {
    const { passportID, centerId, eventID, timestamp, locationDescription } = req.body;
    if (!passportID || !centerId || !eventID || !timestamp || !locationDescription) {
        return res.status(400).send({ error: "Paramètres manquants" });
    }

    const session = driver.session();
    try {
        const query = `
            MATCH (bp:BatteryPassport {passportID: $passportID})
            MATCH (center:Actor {id: $centerId})
            MERGE (loc:Location {address: $locationDescription})
            MERGE (bp)-[:LOCATED_AT]->(loc)
            MERGE (e:Event {eventID: $eventID})
              SET e.timestamp = $timestamp, e.description = $locationDescription
            MERGE (bp)-[:HAS_EVENT]->(e)
            RETURN loc.address AS location
        `;
        const result = await session.run(query, { passportID, centerId, eventID, timestamp, locationDescription });
        res.send({ location: result.records[0].get('location') });
    } catch (err) {
        console.error("Erreur Centre de Tri:", err);
        res.status(500).send({ error: err.message });
    } finally {
        await session.close();
    }
});

// ----------------- SUIVI DE LA BATTERIE -----------------
app.get('/api/battery/:serialNumber/status', async (req, res) => {
    const serialNumber = req.params.serialNumber;
    const session = driver.session();

    try {
        const query = `
            MATCH (b:Battery {serialNumber: $serialNumber})-[:HAS_PASSPORT]->(bp:BatteryPassport)
            OPTIONAL MATCH (bp)-[:HAS_OWNER]->(owner:Actor)
            OPTIONAL MATCH (bp)-[:LOCATED_AT]->(loc:Location)
            OPTIONAL MATCH (bp)-[:HAS_EVENT]->(e:Event)
            RETURN bp.currentStatus AS status, owner.name AS owner, loc.address AS location, collect({desc: e.description, ts: e.timestamp}) AS events
        `;
        const result = await session.run(query, { serialNumber });
        if (result.records.length === 0) return res.status(404).send({ error: "Batterie non trouvée" });

        const record = result.records[0];
        res.send({
            status: record.get('status'),
            owner: record.get('owner'),
            location: record.get('location'),
            events: record.get('events')
        });
    } catch (err) {
        console.error("Erreur suivi batterie:", err);
        res.status(500).send({ error: err.message });
    } finally {
        await session.close();
    }
});


app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
