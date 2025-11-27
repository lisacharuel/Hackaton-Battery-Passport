let currentBattery = null;

// Fonction pour afficher les messages d'erreur
function displayMessage(msg, isError = false) {
    const display = document.getElementById('data-display');
    display.innerHTML = `<p style="color: ${isError ? 'red' : 'green'}">${msg}</p>`;
}

// Fonction qui rend la fiche batterie
function renderBatteryData(data) {
    currentBattery = data; // stocker les infos pour actions

    const display = document.getElementById('data-display');
    const status = data.passport.currentStatus || data.staticInfo.status || 'ORIGINAL';
    const statusClass = status.toUpperCase() === 'WASTE' ? 'status-waste' : 'status-original';

    // Activation boutons
    document.getElementById('declare-waste-btn').disabled = status.toUpperCase() !== 'ORIGINAL';
    document.getElementById('validate-waste-btn').disabled = !(status.toUpperCase() === 'WASTE_REQUESTED');
    document.getElementById('receive-btn').disabled = status.toUpperCase() !== 'WASTE';

    // Générer événements si non existants
    const events = data.events && data.events.length ? data.events : [];
    
    display.innerHTML = `
        <h3>Fiche Passeport</h3>
        <p><strong>N° Série:</strong> ${data.staticInfo.serialNumber}</p>
        <p><strong>Statut Actuel:</strong> <span class="${statusClass}">${status.toUpperCase()}</span></p>
        <p><strong>Propriétaire:</strong> ${data.owner?.name || "Inconnu"}</p>
        <p><strong>Localisation:</strong> ${data.location?.address || "Non renseignée"}</p>

        <h4>Caractéristiques (Statiques)</h4>
        <ul>
            <li><strong>Composition:</strong> ${data.staticInfo.composition || "---"}</li>
            <li><strong>Masse:</strong> ${data.staticInfo.massKg || "---"} kg</li>
            <li><strong>Capacité Initiale:</strong> ${data.staticInfo.initialCapacitykWh || "---"} kWh</li>
        </ul>

        <h4>Performance (Dynamiques)</h4>
        <ul>
            <li><strong>Santé (SOH):</strong> ${data.performance?.stateOfHealthPercent ?? "---"}%</li>
            <li><strong>Cycles Complétés:</strong> ${data.performance?.fullCycles ?? "---"}</li>
        </ul>

        <h4>Suivi des événements</h4>
        <ul>
            ${events.length
                ? events.map(ev => `<li>${ev.ts} - ${ev.desc}</li>`).join('')
                : '<li>Aucun événement</li>'
            }
        </ul>
    `;
}

// ----------------------------------------------------------------------
// Fetch Batterie
// ----------------------------------------------------------------------
async function fetchBatteryData() {
    const serialNumber = document.getElementById('scan-input').value.trim().toUpperCase();
    if (!serialNumber) return displayMessage("Veuillez entrer un numéro valide.", true);

    try {
        const response = await fetch(`/api/battery/${serialNumber}`);
        const data = await response.json();

        if (!response.ok) {
            displayMessage(data.error || "Batterie non trouvée.", true);
            currentBattery = null;
            return;
        }

        // Générer événements fallback si nécessaire
        if (!data.events) {
            const events = [];
            if (data.passport?.currentStatus === 'WASTE') {
                events.push({ ts: data.passport.wasteTimestamp || 'inconnu', desc: 'Garagiste déclare la batterie hors usage' });
                events.push({ ts: data.passport.validationTimestamp || 'inconnu', desc: 'Propriétaire valide le statut WASTE' });
                events.push({ ts: data.passport.receiveTimestamp || 'inconnu', desc: 'Centre de tri reçoit la batterie' });
            }
            data.events = events;
        }

        renderBatteryData(data);
    } catch (err) {
        console.error(err);
        displayMessage("Erreur de connexion au serveur.", true);
        currentBattery = null;
    }
}


function disableAllButtons() {
    document.getElementById("declare-waste-btn").disabled = true;
    document.getElementById("validate-waste-btn").disabled = true;
    document.getElementById("receive-btn").disabled = true;
}

function updateButtonsState(status) {
    const garage = document.getElementById("declare-waste-btn");
    const owner = document.getElementById("validate-waste-btn");
    const center = document.getElementById("receive-btn");

    if (status === "ORIGINAL") {
        garage.disabled = false;
        owner.disabled = true;
        center.disabled = true;
    }
    else if (status === "WASTE_REQUESTED") {
        garage.disabled = true;
        owner.disabled = false;
        center.disabled = true;
    }
    else if (status === "WASTE") {
        garage.disabled = true;
        owner.disabled = true;
        center.disabled = false;
    }
}

let cameraStream = null;
let qrScanInterval = null;

// ----------------------------------------------------------------------
// QR CODE SCANNING
// ----------------------------------------------------------------------

function toggleScanMode(mode) {
    const textSection = document.getElementById('text-input-section');
    const cameraSection = document.getElementById('camera-section');
    const textModeBtn = document.getElementById('text-mode-btn');
    const cameraModeBtn = document.getElementById('camera-mode-btn');

    if (mode === 'text') {
        textSection.style.display = 'block';
        cameraSection.style.display = 'none';
        textModeBtn.classList.add('active');
        cameraModeBtn.classList.remove('active');
        stopCamera();
    } else {
        textSection.style.display = 'none';
        cameraSection.style.display = 'block';
        textModeBtn.classList.remove('active');
        cameraModeBtn.classList.add('active');
        startCamera();
    }
}

async function startCamera() {
    const cameraContainer = document.getElementById('camera-container');
    const cameraError = document.getElementById('camera-error');
    const video = document.getElementById('camera-feed');

    cameraContainer.style.display = 'block';
    cameraError.style.display = 'none';

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        video.srcObject = cameraStream;
        video.onloadedmetadata = () => {
            video.play();
            startQRCodeDetection();
        };
    } catch (error) {
        cameraError.style.display = 'block';
        cameraError.innerHTML = `Erreur caméra: ${error.message}. Vérifiez les permissions.`;
        cameraContainer.style.display = 'none';
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    if (qrScanInterval) {
        clearInterval(qrScanInterval);
        qrScanInterval = null;
    }
    document.getElementById('camera-container').style.display = 'none';
}

function startQRCodeDetection() {
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('qr-canvas');
    const ctx = canvas.getContext('2d');
    const qrStatus = document.getElementById('qr-status');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    qrScanInterval = setInterval(() => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (qrCode) {
                const data = qrCode.data;
                qrStatus.style.color = '#28a745';
                qrStatus.innerHTML = `✓ QR Code détecté: <strong>${data}</strong>`;
                
                // Auto-fill et fetch
                document.getElementById('scan-input').value = data;
                stopCamera();
                fetchBatteryData();
            } else {
                qrStatus.style.color = '#666';
                qrStatus.innerHTML = 'Pointez le QR code vers la caméra...';
            }
        } catch (error) {
            // Erreur de décodage, continue
        }
    }, 100);
}



// ----------------- GARAGISTE -----------------
function declareWaste() {
    const serialNumber = document.getElementById("scan-input").value.trim();
    if (!serialNumber) return alert("Scanner la batterie d'abord !");

    const eventID = "evt-" + Date.now();
    const timestamp = new Date().toISOString();
    const description = "Garagiste déclare la batterie hors usage";

    fetch('/api/garage/declare-waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumber, eventID, timestamp, description })
    })
    .then(res => res.json())
    .then(data => {
        alert("Déclaration hors usage envoyée !");
        fetchBatteryData();
    })
    .catch(err => console.error("Erreur declareWaste:", err));
}

// ----------------- PROPRIETAIRE BP -----------------
function validateWaste() {
    const serialNumber = document.getElementById("scan-input").value.trim();
    if (!serialNumber) return alert("Scanner la batterie d'abord !");

    const ownerId = "OP-Renault";

    fetch('/api/owner/validate-waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumber, ownerId })
    })
    .then(res => res.json())
    .then(data => {
        alert("Statut validé !");
        fetchBatteryData();
    });
}

// ----------------- CENTRE DE TRI -----------------
function receiveBattery() {
    const passportID = document.getElementById("scan-input").value.trim();
    if (!passportID) return alert("Scanner la batterie d'abord !");

    const centerId = "ACT-SORT";
    const eventID = "evt-" + Date.now();
    const timestamp = new Date().toISOString();
    const locationDescription = "Batterie reçue au centre de tri";

    fetch('/api/triage/receive-battery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passportID, centerId, eventID, timestamp, locationDescription })
    })
    .then(res => res.json())
    .then(data => {
        alert("Réception confirmée au centre de tri !");
        fetchBatteryData();
    })
    .catch(err => console.error("Erreur receiveBattery:", err));
}

// ----------------- GESTION DES TABS -----------------
function openRole(evt, roleName) {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";

    const tablinks = document.getElementsByClassName("tablink");
    for (let i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");

    document.getElementById(roleName).style.display = "block";
    evt.currentTarget.className += " active";
}

document.addEventListener("DOMContentLoaded", () => {
    disableAllButtons();
});
