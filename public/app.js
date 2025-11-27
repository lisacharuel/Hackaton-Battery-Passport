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
        // if (!data.events) {
        //     const events = [];
        //     if (data.passport?.currentStatus === 'WASTE') {
        //         events.push({ ts: data.passport.wasteTimestamp || 'Retour Garagiste', desc: 'Garagiste déclare la batterie hors usage' });
        //         events.push({ ts: data.passport.validationTimestamp || 'Retour Propriétaire', desc: 'Propriétaire valide le statut WASTE' });
        //         events.push({ ts: data.passport.receiveTimestamp || 'Statut Batterie', desc: 'Centre de tri reçoit la batterie' });
        //     }
        //     data.events = events;
        // }

        renderBatteryData(data);
    } catch (err) {
        console.error(err);
        displayMessage("Erreur de connexion au serveur.", true);
        currentBattery = null;
    }
}

function pushEvent(desc) {
    if (!currentBattery.events) currentBattery.events = [];
    const ts = new Date().toISOString();
    currentBattery.events.push({ ts, desc });
    renderBatteryData(currentBattery); // Rafraîchit uniquement la fiche
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

// Liste simplifiée de batteries pour l'exemple (tu peux coller tes 50 batteries ici)
// ------------------------------------------------------------
// Liste complète des batteries
// ------------------------------------------------------------
const batteriesList = [
  { serialNumber:"BAT-EV-0001" },{ serialNumber:"BAT-EV-0002" },
  { serialNumber:"BAT-LMT-0003" },{ serialNumber:"BAT-EV-0004" },
  { serialNumber:"BAT-EV-0005" },{ serialNumber:"BAT-IND-0006" },
  { serialNumber:"BAT-EV-0007" },{ serialNumber:"BAT-LMT-0008" },
  { serialNumber:"BAT-EV-0009" },{ serialNumber:"BAT-EV-0010" },
  { serialNumber:"BAT-EV-0011" },{ serialNumber:"BAT-EV-0012" },
  { serialNumber:"BAT-LMT-0013" },{ serialNumber:"BAT-EV-0014" },
  { serialNumber:"BAT-EV-0015" },{ serialNumber:"BAT-IND-0016" },
  { serialNumber:"BAT-EV-0017" },{ serialNumber:"BAT-LMT-0018" },
  { serialNumber:"BAT-EV-0019" },{ serialNumber:"BAT-EV-0020" },
  { serialNumber:"BAT-EV-0021" },{ serialNumber:"BAT-EV-0022" },
  { serialNumber:"BAT-LMT-0023" },{ serialNumber:"BAT-EV-0024" },
  { serialNumber:"BAT-EV-0025" },{ serialNumber:"BAT-IND-0026" },
  { serialNumber:"BAT-EV-0027" },{ serialNumber:"BAT-LMT-0028" },
  { serialNumber:"BAT-EV-0029" },{ serialNumber:"BAT-EV-0030" },
  { serialNumber:"BAT-EV-0031" },{ serialNumber:"BAT-EV-0032" },
  { serialNumber:"BAT-EV-0033" },{ serialNumber:"BAT-EV-0034" },
  { serialNumber:"BAT-EV-0035" },{ serialNumber:"BAT-EV-0036" },
  { serialNumber:"BAT-EV-0037" },{ serialNumber:"BAT-EV-0038" },
  { serialNumber:"BAT-EV-0039" },{ serialNumber:"BAT-EV-0040" },
  { serialNumber:"BAT-EV-0041" },{ serialNumber:"BAT-EV-0042" },
  { serialNumber:"BAT-EV-0043" },{ serialNumber:"BAT-EV-0044" },
  { serialNumber:"BAT-EV-0045" },{ serialNumber:"BAT-EV-0046" },
  { serialNumber:"BAT-EV-0047" },{ serialNumber:"BAT-EV-0048" },
  { serialNumber:"BAT-EV-0049" },{ serialNumber:"BAT-EV-0050" }
];

// ------------------------------------------------------------
// Remplissage du select au chargement
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const batterySelect = document.getElementById('battery-select');
    batteriesList.forEach(b => {
        const option = document.createElement('option');
        option.value = b.serialNumber;
        option.textContent = b.serialNumber;
        batterySelect.appendChild(option);
    });

    disableAllButtons();
});

// ------------------------------------------------------------
// Charger la batterie sélectionnée
// ------------------------------------------------------------
function loadSelectedBattery() {
    const batterySelect = document.getElementById('battery-select');
    const serialNumber = batterySelect.value.trim();
    if (!serialNumber) {
        alert("Veuillez sélectionner une batterie !");
        return;
    }

    // Mettre à jour le scan-input pour rester compatible
    const scanInput = document.getElementById('scan-input');
    scanInput.value = serialNumber;

    // Appel de la fonction existante
    fetchBatteryData();
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
        // Mettre à jour le statut local pour activer le bouton du propriétaire
        if (currentBattery && currentBattery.passport) {
            currentBattery.passport.currentStatus = "WASTE_REQUESTED";
        }

        pushEvent(description);
        alert("Déclaration hors usage envoyée !");
        // fetchBatteryData(); // facultatif
    })
    .catch(err => console.error("Erreur declareWaste:", err));
}

function validateWaste() {
    const serialNumber = document.getElementById("scan-input").value.trim();
    if (!serialNumber) return alert("Scanner la batterie d'abord !");

    const ownerId = "OP-Renault";
    const description = "Propriétaire valide le statut WASTE";

    fetch('/api/owner/validate-waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumber, ownerId })
    })
    .then(res => res.json())
    .then(data => {
        // Mettre à jour le statut local pour activer le bouton du centre de tri
        if (currentBattery && currentBattery.passport) {
            currentBattery.passport.currentStatus = "WASTE";
        }

        pushEvent(description);
        alert("Statut validé !");
        // fetchBatteryData(); // facultatif si tu veux rafraîchir autres infos
    });
}

function receiveBattery() {
    const passportID = document.getElementById("scan-input").value.trim();
    if (!passportID) return alert("Scanner la batterie d'abord !");

    const centerId = "ACT-SORT";
    const eventID = "evt-" + Date.now();
    const timestamp = new Date().toISOString();
    const description = "Centre de tri reçoit la batterie";

    fetch('/api/triage/receive-battery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passportID, centerId, eventID, timestamp, locationDescription: description })
    })
    .then(res => res.json())
    .then(data => {
        pushEvent(description);
        alert("Réception confirmée au centre de tri !");
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
