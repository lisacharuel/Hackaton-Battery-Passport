// public/app.js

const API_BASE = '/api';
let currentBattery = null; // <-- stockera la batterie chargée

// ----------------------------------------------------------------------
// UI
// ----------------------------------------------------------------------

function openRole(evt, roleName) {
    const tabcontents = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontents.length; i++) {
        tabcontents[i].style.display = "none";
    }
    const tablinks = document.getElementsByClassName("tablink");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(roleName).style.display = "block";
    evt.currentTarget.className += " active";
}

document.addEventListener('DOMContentLoaded', () => {
    openRole({ currentTarget: document.querySelector('.tablink') }, 'Garagiste');
});

function displayMessage(message, isError = false) {
    const display = document.getElementById('data-display');
    display.innerHTML = `<p style="color: ${isError ? 'red' : 'green'};"><strong>${isError ? 'ERREUR' : 'SUCCÈS'} :</strong> ${message}</p>`;
    if (!isError) fetchBatteryData();
}

function renderBatteryData(data) {
    currentBattery = data; // <-- stocker les infos pour les actions

    const display = document.getElementById('data-display');
    const status = data.passport.currentStatus;
    const statusClass = status === 'waste' ? 'status-waste' : 'status-original';

    document.getElementById('declare-waste-btn').disabled = status !== 'original';
    document.getElementById('receive-btn').disabled = status !== 'waste';

    display.innerHTML = `
        <h3>Fiche Passeport</h3>
        <p><strong>N° Série:</strong> ${data.staticInfo.serialNumber}</p>
        <p><strong>Statut Actuel:</strong> <span class="${statusClass}">${status.toUpperCase()}</span></p>
        <p><strong>Propriétaire:</strong> ${data.owner.name} (${data.owner.role})</p>
        <p><strong>Localisation:</strong> ${data.location.type} (${data.location.address})</p>
        
        <h4>Caractéristiques (Statiques)</h4>
        <ul>
            <li><strong>Composition:</strong> ${data.staticInfo.composition}</li>
            <li><strong>Masse:</strong> ${data.staticInfo.massKg} kg</li>
            <li><strong>Capacité Initiale:</strong> ${data.staticInfo.initialCapacitykWh} kWh</li>
        </ul>
        
        <h4>Performance (Dynamiques)</h4>
        <ul>
            <li><strong>Santé (SOH):</strong> ${data.performance.stateOfHealthPercent}%</li>
            <li><strong>Cycles Complétés:</strong> ${data.performance.fullCycles}</li>
        </ul>
    `;
}

// ----------------------------------------------------------------------
// API
// ----------------------------------------------------------------------

async function fetchBatteryData() {
    const serialNumber = document.getElementById('scan-input').value.trim().toUpperCase();
    if (!serialNumber) return displayMessage("Veuillez entrer un numéro valide.", true);

    try {
        const response = await fetch(`${API_BASE}/battery/${serialNumber}`);
        const data = await response.json();

        if (response.ok) {
            renderBatteryData(data);
        } else {
            displayMessage(data.error, true);
            currentBattery = null;
        }
    } catch {
        displayMessage("Erreur de connexion au serveur API.", true);
    }
}

// ---------------- GARAGISTE ----------------
async function declareWaste() {
    if (!currentBattery) return displayMessage("Charge une batterie d'abord.", true);

    try {
        const response = await fetch(`${API_BASE}/garagiste/declare-waste`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serialNumber: currentBattery.staticInfo.serialNumber,
                actorId: 'ACT-GARAGE'
            })
        });

        const result = await response.json();
        response.ok ? displayMessage(result.message) : displayMessage(result.error, true);

    } catch {
        displayMessage("Erreur réseau.", true);
    }
}

// ---------------- PROPRIÉTAIRE ----------------
async function validateWaste() {
    if (!currentBattery) return displayMessage("Charge une batterie d'abord.", true);

    try {
        const response = await fetch(`${API_BASE}/owner/validate-waste`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                passportID: currentBattery.passport.passportID,
                ownerId: currentBattery.owner.actorID   // <-- DYNAMIQUE
            })
        });

        const result = await response.json();
        response.ok ? displayMessage(result.message) : displayMessage(result.error, true);

    } catch {
        displayMessage("Erreur réseau.", true);
    }
}

// ---------------- CENTRE DE TRI ----------------
async function receiveBattery() {
    if (!currentBattery) return displayMessage("Charge une batterie d'abord.", true);

    try {
        const response = await fetch(`${API_BASE}/triage/receive-battery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serialNumber: currentBattery.staticInfo.serialNumber,
                centerId: 'ACT-SORT',
                locationId: 'LOC-SORTING'
            })
        });

        const result = await response.json();
        response.ok
            ? displayMessage(`${result.message} Nouveau statut: ${result.status.toUpperCase()}.`)
            : displayMessage(result.error, true);

    } catch {
        displayMessage("Erreur réseau.", true);
    }
}
