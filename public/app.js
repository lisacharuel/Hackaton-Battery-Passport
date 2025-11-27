function fetchBatteryData() {
    const serialNumber = document.getElementById("scan-input").value.trim();
    if (!serialNumber) {
        alert("Veuillez entrer un serialNumber !");
        return;
    }

    fetch(`/api/battery/${serialNumber}/status`)
        .then(res => res.json())
        .then(data => {
            const display = document.getElementById("data-display");
            if (!data || !data.status) {
                display.innerHTML = `<p>Aucune donnée trouvée pour ${serialNumber}</p>`;
                return;
            }

            display.innerHTML = `
                <h4>Fiche Passeport</h4>
                <p><strong>N° Série:</strong> ${serialNumber}</p>
                <p><strong>Statut Actuel:</strong> ${data.status}</p>
                <p><strong>Propriétaire:</strong> ${data.owner || "Inconnu"}</p>
                <p><strong>Localisation:</strong> ${data.location || "Non renseignée"}</p>
                <h4>Suivi des événements</h4>
                <ul>
                    ${data.events.map(ev => `<li>${ev.ts} - ${ev.desc}</li>`).join('')}
                </ul>
            `;

            // Activer les boutons
            document.getElementById("declare-waste-btn").disabled = false;
            document.getElementById("validate-waste-btn").disabled = false;  // <<< AJOUT ICI
            document.getElementById("receive-btn").disabled = false;
        })
        .catch(err => console.error(err));
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
