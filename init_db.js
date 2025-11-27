// init_db.js
const neo4j = require('neo4j-driver');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const driver = neo4j.driver(
    'neo4j://localhost:7687',
    neo4j.auth.basic('neo4j', 'Password')
);

function parseCSV(filePath) {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

function sanitizeId(str) {
    if (!str) return 'UNKNOWN';
    return String(str).trim().replace(/[^a-zA-Z0-9-_]/g, '-');
}

function cleanRow(raw) {
    // Trim all values and remove surrounding quotes if present
    const row = {};
    for (const k of Object.keys(raw)) {
        let v = raw[k];
        if (typeof v === 'string') {
            v = v.trim();
            if (v.startsWith('"') && v.endsWith('"')) {
                v = v.slice(1, -1);
            }
        }
        row[k.trim()] = v === '' ? null : v;
    }
    // Ensure required fields
    if (!row.serialNumber) return null;
    // Normalize dates (if null, will be left null)
    return {
        serialNumber: row.serialNumber,
        operator: row.operator || 'UNKNOWN',
        manufacturingPlace: row.manufacturingPlace || 'UNKNOWN',
        manufacturingDate: row.manufacturingDate || null,
        commissioningDate: row.commissioningDate || null,
        warrantyDurationYears: row.warrantyDurationYears || null,
        batteryCategory: row.batteryCategory || null,
        massKg: row.massKg || null,
        status: row.status || 'unknown',
        recyclingSymbol: row.recyclingSymbol || null,
        wastePreventionInfo: row.wastePreventionInfo || null,
        initialCapacitykWh: row.initialCapacitykWh || null,
        chemicalComposition: row.chemicalComposition || null,
        expectedLifetimeCycles: row.expectedLifetimeCycles || null,
        capacityFadePercent: row.capacityFadePercent || null,
        stateOfHealthPercent: row.stateOfHealthPercent || null,
        originalPowerkW: row.originalPowerkW || null,
        minVoltageV: row.minVoltageV || null,
        nominalVoltageV: row.nominalVoltageV || null,
        maxVoltageV: row.maxVoltageV || null,
        fullCycles: row.fullCycles || null
    };
}

async function initializeDatabase() {
    const session = driver.session();
    try {
        console.log("Démarrage de l'initialisation de la base de données...");

        // CLEAN
        console.log("1. Nettoyage de la base...");
        await session.run('MATCH (n) DETACH DELETE n');

        // CONSTRAINTS
        console.log("2. Création des contraintes...");
        await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (b:Battery) REQUIRE b.serialNumber IS UNIQUE');
        await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (bp:BatteryPassport) REQUIRE bp.passportID IS UNIQUE');
        await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (a:Actor) REQUIRE a.actorID IS UNIQUE');
        await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (l:Location) REQUIRE l.locationID IS UNIQUE');

        // Create default actors & locations
        console.log("3. Création des Acteurs et Lieux de workflow...");
        const actorsLocationsQuery = `
            MERGE (g:Actor {actorID: 'ACT-GARAGE'}) ON CREATE SET g.name = 'Garage MecaTech', g.role = 'Garagiste'
            MERGE (s:Actor {actorID: 'ACT-SORT'}) ON CREATE SET s.name = 'Centre Tri Vert', s.role = 'CentreDeTri'
            MERGE (lg:Location {locationID: 'LOC-GARAGE'}) ON CREATE SET lg.address = '123 Rue de la Réparation', lg.type = 'Garage'
            MERGE (ls:Location {locationID: 'LOC-SORTING'}) ON CREATE SET ls.address = '456 Avenue du Recyclage', ls.type = 'SortingCenter'
            RETURN 1
        `;
        await session.run(actorsLocationsQuery);

        // Read CSV
        console.log("4. Lecture et importation des données du CSV...");
        const raw = await parseCSV(path.join(__dirname, 'batteries.csv'));
        const cleaned = raw
            .map(cleanRow)
            .filter(r => r !== null);

        if (cleaned.length === 0) {
            console.log("Aucune ligne valide à importer.");
            return;
        }

        // Prepare rows further (IDs)
        const prepared = cleaned.map(r => ({
            ...r,
            operatorId: 'OP-' + sanitizeId(r.operator),
            manufacturingLocId: 'LOC-' + sanitizeId(r.manufacturingPlace),
            passportID: 'BP-' + r.serialNumber
        }));

        const importQuery = `
            UNWIND $rows AS row

            // Actor (Owner / Operator)
            MERGE (op:Actor {actorID: row.operatorId})
            ON CREATE SET op.name = row.operator, op.role = 'Propriétaire BP'

            // Manufacturing Location
            MERGE (loc_manuf:Location {locationID: row.manufacturingLocId})
            ON CREATE SET loc_manuf.address = row.manufacturingPlace, loc_manuf.type = 'ManufacturingPlant'

            // Battery (merge to avoid dup)
            MERGE (b:Battery {serialNumber: row.serialNumber})
            SET b.category = row.batteryCategory,
                b.massKg = CASE WHEN row.massKg IS NOT NULL THEN toFloat(row.massKg) ELSE NULL END,
                b.composition = row.chemicalComposition,
                b.initialCapacitykWh = CASE WHEN row.initialCapacitykWh IS NOT NULL THEN toFloat(row.initialCapacitykWh) ELSE NULL END,
                b.manufacturingDate = CASE WHEN row.manufacturingDate IS NOT NULL THEN date(row.manufacturingDate) ELSE NULL END,
                b.recyclingSymbol = row.recyclingSymbol

            // Passport
            MERGE (bp:BatteryPassport {passportID: row.passportID})
            SET bp.currentStatus = row.status,
                bp.commissioningDate = CASE WHEN row.commissioningDate IS NOT NULL THEN date(row.commissioningDate) ELSE NULL END,
                bp.warrantyDurationYears = CASE WHEN row.warrantyDurationYears IS NOT NULL THEN toInteger(row.warrantyDurationYears) ELSE NULL END,
                bp.version = coalesce(bp.version, 1)

            // Performance snapshot
            CREATE (p:Performance {
                stateOfHealthPercent: CASE WHEN row.stateOfHealthPercent IS NOT NULL THEN toFloat(row.stateOfHealthPercent) ELSE NULL END,
                originalPowerkW: CASE WHEN row.originalPowerkW IS NOT NULL THEN toFloat(row.originalPowerkW) ELSE NULL END,
                fullCycles: CASE WHEN row.fullCycles IS NOT NULL THEN toInteger(row.fullCycles) ELSE NULL END,
                timestamp: datetime()
            })

            // Relations
            MERGE (b)-[:HAS_PASSPORT]->(bp)
            MERGE (bp)-[:HAS_OWNER]->(op)
            MERGE (b)-[:MANUFACTURED_AT]->(loc_manuf)
            CREATE (bp)-[:HAS_PERFORMANCE {asOf: datetime()}]->(p)

            // Default location (garage) for every battery
            WITH b
            MATCH (defaultLoc:Location {locationID: 'LOC-GARAGE'})
            MERGE (b)-[:LOCATED_AT {timestamp: datetime()}]->(defaultLoc)

            RETURN b.serialNumber AS sn
        `;

        const tx = session.beginTransaction();
        const res = await tx.run(importQuery, { rows: prepared });
        await tx.commit();

        console.log(`Import terminé. ${res.records.length} batteries traitées.`);
    } catch (error) {
        console.error("Erreur fatale lors de l'initialisation de la base de données:", error);
    } finally {
        await session.close();
        await driver.close();
    }
}

initializeDatabase();
