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
// 4 batteries existantes pour l'aide à la décision
const decisionSamples = [
  {
    serialNumber: "BAT-EV-0039",
    owner: "Mercedes",
    location: "Düsseldorf (DE)",
    sohPercent: 92,
    defectsCount: 9,
    chemistry: "NCA",
    internalResistanceMilliohm: 230,
    capacityFadePercent: 9,
    manufacturingDate: "2022-06-01"
  },
  {
    serialNumber: "BAT-EV-0034",
    owner: "Nissan",
    location: "Kyushu (JP)",
    sohPercent: 80,
    defectsCount: 13,
    chemistry: "NMC",
    internalResistanceMilliohm: 175,
    capacityFadePercent: 7,
    manufacturingDate: "2020-07-01"
  },
  {
    serialNumber: "BAT-EV-0031",
    owner: "Tesla",
    location: "Fremont (US)",
    sohPercent: 85,
    defectsCount: 15,
    chemistry: "NCA",
    internalResistanceMilliohm: 200,
    capacityFadePercent: 8,
    manufacturingDate: "2020-02-01"
  },
  {
    serialNumber: "BAT-LMT-0008",
    owner: "Xiaomi",
    location: "Shenzhen (CN)",
    sohPercent: 0.4,   // très faible, pour test "waste"
    defectsCount: 6,
    chemistry: "LCO",
    internalResistanceMilliohm: 33,
    capacityFadePercent: 2.5,
    manufacturingDate: "2023-01-01"
  }
];


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
    const sample = decisionSamples.find(b => b.serialNumber === serialNumber);
    if (sample) {
        document.getElementById('dm-soh').value = sample.sohPercent;
        document.getElementById('dm-defects').value = sample.defectsCount;
        document.getElementById('dm-chem').value = sample.chemistry;
        document.getElementById('dm-manufacturingDate').value = sample.manufacturingDate;
        document.getElementById('dm-resistance').value = sample.internalResistanceMilliohm;
        document.getElementById('dm-capacityFade').value = sample.capacityFadePercent;

        // calculer automatiquement la recommandation
        document.getElementById('dm-run').click();
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
// function openRole(evt, roleName) {
//     const tabcontent = document.getElementsByClassName("tabcontent");
//     for (let i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";

//     const tablinks = document.getElementsByClassName("tablink");
//     for (let i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");

//     document.getElementById(roleName).style.display = "block";
//     evt.currentTarget.className += " active";
// }

// document.addEventListener("DOMContentLoaded", () => {
//     disableAllButtons();
// });

// ----------------- GESTION DES TABS -----------------
function openRole(evt, roleName) {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";

    const tablinks = document.getElementsByClassName("tablink");
    for (let i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");

    document.getElementById(roleName).style.display = "block";
    evt.currentTarget.className += " active";

    // NOUVEAU: Utiliser l'ID HTML correct 'CentreTri'
    if (roleName === 'CentreTri') { 
        if (typeof window.createDecisionPanel === 'function') {
            window.createDecisionPanel();
        }
    }
}


/* ---------------------------
   MODULE : Aide à la décision
   (ajout dynamique, ne modifie pas ton HTML existant)
   --------------------------- */

(function DecisionModule() {
    // --- Config initiale (poids par critère, modifiables par UI) ---
    const defaultWeights = {
        soh: 0.30,               // état de santé (SOH)
        defects: 0.20,           // indice défauts (0=no defect -> meilleur)
        chemistry: 0.10,         // compatibilité chimie pour reuse/repurpose
        ageYears: 0.15,          // âge (plus vieux -> moins réutilisable)
        internalResistance: 0.10,// résistance interne (plus faible = mieux)
        capacityFade: 0.10       // perte de capacité %
    };

    // --- Scoring profile par stratégie (valeurs relatives par critère) ---
    // Chaque stratégie multiplie la "favorabilité" d'un critère (0..1) par un facteur (importance relative).
    // Ces profils sont heuristiques — modifiables via UI dans la section "profil".
    const profiles = {
        Reuse:         { soh: 1.0, defects: 1.0, chemistry: 1.0, ageYears: 0.8, internalResistance: 1.0, capacityFade: 1.0 },
        Remanufacture: { soh: 0.7, defects: 0.6, chemistry: 0.9, ageYears: 0.6, internalResistance: 0.8, capacityFade: 0.7 },
        Repurpose:     { soh: 0.8, defects: 0.6, chemistry: 0.9, ageYears: 0.9, internalResistance: 0.7, capacityFade: 0.8 },
        Recycle:       { soh: 0.0, defects: 0.0, chemistry: 0.5, ageYears: 1.0, internalResistance: 1.0, capacityFade: 1.0 }
    };

    // Helper util : différence en années entre deux dates (ISO)
    function yearsBetween(dateString) {
        if (!dateString) return null;
        const d = new Date(dateString);
        if (isNaN(d)) return null;
        const now = new Date();
        return (now - d) / (1000 * 3600 * 24 * 365.25);
    }

    // Normalisation : transformer valeur naturelle en score 0..1 où 1 = favorable à la réutilisation
    function normalize(attributes) {
        // attributes : { sohPercent, defectsCount, chemistry, ageYears, internalResistanceMilliohm, capacityFadePercent }
        const res = {};

        // SOH : 0..100 => favorable = high
        res.soh = typeof attributes.sohPercent === 'number' ? Math.max(0, Math.min(1, attributes.sohPercent / 100)) : 0.0;

        // defects : count -> favorable = fewer defects; on mappe 0 defects -> 1 ; >=5 -> 0
        if (typeof attributes.defectsCount === 'number') {
            res.defects = Math.max(0, Math.min(1, 1 - (attributes.defectsCount / 5)));
        } else {
            res.defects = 1.0; // si inconnu, on suppose "pas de défauts" pour ne pas penaliser fortement
        }

        // chemistry : heuristic favorability (LFP best for reuse in many repurpose cases)
        // Accept typical strings, lowercase
        const chem = (attributes.chemistry || "").toLowerCase();
        if (chem.includes("lfp") || chem.includes("lto") || chem.includes("blade")) res.chemistry = 1.0;
        else if (chem.includes("nmc") || chem.includes("nca") || chem.includes("ncm") || chem.includes("ncm811")) res.chemistry = 0.7;
        else if (chem.includes("lco")) res.chemistry = 0.6;
        else if (!chem) res.chemistry = 0.5;
        else res.chemistry = 0.6;

        // ageYears -> favorable = jeune ; 0 years => 1 ; >=10 => 0
        if (typeof attributes.ageYears === 'number') {
            res.ageYears = Math.max(0, Math.min(1, 1 - (attributes.ageYears / 10)));
        } else res.ageYears = 0.6;

        // internalResistance (mΩ) -> favorable = lower; assume 0..200 mΩ range where <20 excellent
        if (typeof attributes.internalResistanceMilliohm === 'number') {
            const r = attributes.internalResistanceMilliohm;
            res.internalResistance = Math.max(0, Math.min(1, 1 - (r / 200)));
        } else res.internalResistance = 0.7;

        // capacityFadePercent -> favorable = low fade; 0% => 1 ; >=50% => 0
        if (typeof attributes.capacityFadePercent === 'number') {
            res.capacityFade = Math.max(0, Math.min(1, 1 - (attributes.capacityFadePercent / 50)));
        } else res.capacityFade = 0.7;

        return res;
    }

    // Calcul du score pour chaque stratégie
    function scoreStrategies(norm, weights, profiles) {
        const results = {};
        const strategies = Object.keys(profiles);
        strategies.forEach(strategy => {
            let s = 0;
            let weightSum = 0;
            for (const k in weights) {
                const w = weights[k] || 0;
                const profFactor = profiles[strategy][k] ?? 1.0;
                const val = norm[k] ?? 0;
                s += w * profFactor * val;
                weightSum += w;
            }
            // normaliser par somme des poids (pour garder 0..1)
            results[strategy] = weightSum > 0 ? s / weightSum : 0;
        });
        return results;
    }

    // Formatage recommandation + explication
    function buildRecommendationText(scores, norm, weights, profiles) {
        // Tri
        const entries = Object.entries(scores).sort((a,b)=> b[1]-a[1]);
        const best = entries[0];
        let html = `<h4>Recommandation : <strong>${best[0]}</strong> (score ${(best[1]*100).toFixed(0)}%)</h4>`;
        html += `<div class="rec-breakdown"><strong>Détails :</strong><ul>`;
        // pour chaque critère contribution
        for (const k of Object.keys(weights)) {
            const w = weights[k];
            html += `<li><strong>${k}</strong> — valeur normalisée: ${(norm[k] ?? 0).toFixed(2)} · poids: ${w.toFixed(2)}</li>`;
        }
        html += `</ul></div>`;

        html += `<div class="rec-scores"><strong>Scores:</strong><ul>`;
        entries.forEach(([name, val])=>{
            html += `<li>${name}: <strong>${(val*100).toFixed(0)}%</strong></li>`;
        });
        html += `</ul></div>`;

        // justification (top factors favoring the chosen decision)
        const chosen = best[0];
        html += `<div class="rec-justification"><strong>Justification :</strong><p>`;
        // compute per-criterion contribution for chosen
        const contributions = [];
        for (const k of Object.keys(weights)) {
            const contrib = (weights[k] || 0) * (profiles[chosen][k] ?? 1) * (norm[k] ?? 0);
            contributions.push({k, contrib});
        }
        contributions.sort((a,b)=> b.contrib - a.contrib);
        html += `Les facteurs principaux favorables : ${contributions.slice(0,3).map(c=>c.k).join(', ')}.`;
        html += `</p></div>`;

        return { html, best: best[0], scores: scores };
    }

    // Fonction principale : calcule recommandation à partir d'un objet "attributes"
    function computeRecommendation(attributes, weights = defaultWeights) {
        const norm = normalize(attributes);
        const scores = scoreStrategies(norm, weights, profiles);
        return {norm, scores, profiles, weights};
    }

    // --- UI injection (on the fly) ---
    function createDecisionPanel() {
        // si déjà présent, ne rien faire
        if (document.getElementById('decision-panel')) return;

        // const container = document.querySelector('.container');
        // if (!container) return; // sécurité

        const panel = document.createElement('div');
        panel.id = 'decision-panel';
        panel.className = 'card';
        panel.innerHTML = `
            <h2>📊 Aide à la décision — Centre de tri</h2>
            <p class="muted">Calcule une recommandation (Reuse / Remanufacture / Repurpose / Recycle) à partir d'un diagnostic.</p>

            <div class="decision-form">
                <div class="row">
                    <label>Capacité Initiale</label>
                    <input type="number" id="dm-soh" min="0" max="100" step="0.1" placeholder="ex: 92">
                </div>
                <div class="row">
                    <label>Défauts (count)</label>
                    <input type="number" id="dm-defects" min="0" step="1" placeholder="ex: 0">
                </div>
                <div class="row">
                    <label>Chimie</label>
                    <input type="text" id="dm-chem" placeholder="ex: LFP, NMC, NCA">
                </div>
                <div class="row">
                    <label>Date fabrication</label>
                    <input type="date" id="dm-manufacturingDate">
                </div>
                <div class="row">
                    <label>Résistance interne (mΩ)</label>
                    <input type="number" id="dm-resistance" min="0" step="0.1" placeholder="mΩ">
                </div>
                <div class="row">
                    <label>Capacity fade (%)</label>
                    <input type="number" id="dm-capacityFade" min="0" max="100" step="0.1" placeholder="ex: 8">
                </div>

                <div class="weights-block">
                    <h4>Poids des critères (configurable)</h4>
                    <div class="weights-row">
                        <label>SOH <span class="w-val" id="w-soh">0.30</span></label><input type="range" id="weight-soh" min="0" max="1" step="0.01" value="${defaultWeights.soh}">
                        <label>Defects <span class="w-val" id="w-defects">0.20</span></label><input type="range" id="weight-defects" min="0" max="1" step="0.01" value="${defaultWeights.defects}">
                        <label>Chemistry <span class="w-val" id="w-chemistry">0.10</span></label><input type="range" id="weight-chemistry" min="0" max="1" step="0.01" value="${defaultWeights.chemistry}">
                        <label>Age <span class="w-val" id="w-age">0.15</span></label><input type="range" id="weight-age" min="0" max="1" step="0.01" value="${defaultWeights.ageYears}">
                        <label>Resistance <span class="w-val" id="w-resistance">0.10</span></label><input type="range" id="weight-resistance" min="0" max="1" step="0.01" value="${defaultWeights.internalResistance}">
                        <label>CapacityFade <span class="w-val" id="w-fade">0.10</span></label><input type="range" id="weight-fade" min="0" max="1" step="0.01" value="${defaultWeights.capacityFade}">
                    </div>
                </div>

                <div class="actions">
                    <button id="dm-run">Générer recommandation</button>
                    <button id="dm-autofill">Remplir depuis passeport chargé</button>
                    <button id="dm-save" disabled>Enregistrer décision</button>
                </div>

                <div id="dm-result" class="dm-result"></div>
            </div>
        `;
        // append after battery-info card (if exists) else to container top
        // const batteryInfo = document.getElementById('battery-info');
        // if (batteryInfo && batteryInfo.parentNode) batteryInfo.parentNode.insertBefore(panel, batteryInfo.nextSibling);
        // else container.appendChild(panel);

        const triageTabContent = document.getElementById('CentreTri'); // <= CHANGEMENT ICI
        if (!triageTabContent) {
            console.error("Le conteneur de l'onglet 'CentreTri' est introuvable.");
            return;
        } 

        // Insère le panneau à la fin du contenu de l'onglet
        triageTabContent.appendChild(panel);

        // set up listeners
        setupDecisionListeners();
    }

    function getWeightsFromUI() {
        return {
            soh: parseFloat(document.getElementById('weight-soh').value),
            defects: parseFloat(document.getElementById('weight-defects').value),
            chemistry: parseFloat(document.getElementById('weight-chemistry').value),
            ageYears: parseFloat(document.getElementById('weight-age').value),
            internalResistance: parseFloat(document.getElementById('weight-resistance').value),
            capacityFade: parseFloat(document.getElementById('weight-fade').value)
        };
    }

    function updateWeightLabels() {
        document.getElementById('w-soh').textContent = parseFloat(document.getElementById('weight-soh').value).toFixed(2);
        document.getElementById('w-defects').textContent = parseFloat(document.getElementById('weight-defects').value).toFixed(2);
        document.getElementById('w-chemistry').textContent = parseFloat(document.getElementById('weight-chemistry').value).toFixed(2);
        document.getElementById('w-age').textContent = parseFloat(document.getElementById('weight-age').value).toFixed(2);
        document.getElementById('w-resistance').textContent = parseFloat(document.getElementById('weight-resistance').value).toFixed(2);
        document.getElementById('w-fade').textContent = parseFloat(document.getElementById('weight-fade').value).toFixed(2);
    }

    function setupDecisionListeners() {
        // weight sliders update labels
        ['weight-soh','weight-defects','weight-chemistry','weight-age','weight-resistance','weight-fade'].forEach(id=>{
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', updateWeightLabels);
        });
        updateWeightLabels();

        // run button
        document.getElementById('dm-run').addEventListener('click', () => {
            // lire inputs
            const attrs = {
                sohPercent: parseFloat(document.getElementById('dm-soh').value) || null,
                defectsCount: parseFloat(document.getElementById('dm-defects').value) || null,
                chemistry: (document.getElementById('dm-chem').value || '').trim(),
                manufacturingDate: document.getElementById('dm-manufacturingDate').value || null,
                ageYears: null,
                internalResistanceMilliohm: parseFloat(document.getElementById('dm-resistance').value) || null,
                capacityFadePercent: parseFloat(document.getElementById('dm-capacityFade').value) || null
            };
            if (attrs.manufacturingDate) attrs.ageYears = yearsBetween(attrs.manufacturingDate);
            const weights = getWeightsFromUI();

            const { norm, scores } = computeRecommendation(attrs, weights);
            const { html, best } = buildRecommendationText(scores, norm, weights, profiles);

            const resultNode = document.getElementById('dm-result');
            resultNode.innerHTML = html;

            // enable save
            const saveBtn = document.getElementById('dm-save');
            saveBtn.disabled = false;
            saveBtn.dataset.recommendation = best;
            saveBtn.dataset.payload = JSON.stringify({ attrs, norm, scores, weights, profiles });
        });

        // autofill button : remplir depuis currentBattery s'il existe
        document.getElementById('dm-autofill').addEventListener('click', () => {
            if (!window.currentBattery) {
                alert("Aucune batterie chargée (scan) actuellement.");
                return;
            }
            // try to map your currentBattery fields to the DM fields; tolerant to missing fields
            const cb = window.currentBattery;
            // staticInfo / performance naming from your app
            const soh = cb.performance?.stateOfHealthPercent ?? cb.performance?.soh ?? null;
            const defects = cb.diagnostics?.defectsCount ?? cb.staticInfo?.defectsCount ?? null;
            const chem = cb.staticInfo?.composition ?? cb.staticInfo?.chemicalComposition ?? cb.staticInfo?.chemistry ?? '';
            const mfg = cb.staticInfo?.manufacturingDate ?? cb.staticInfo?.manufacturingDateIso ?? cb.staticInfo?.manufacturedAt ?? '';
            const resistance = cb.performance?.internalResistanceMilliohm ?? cb.performance?.internalResistance ?? null;
            const capacityFade = cb.performance?.capacityFadePercent ?? cb.staticInfo?.capacityFadePercent ?? null;

            if (soh !== null) document.getElementById('dm-soh').value = soh;
            if (defects !== null) document.getElementById('dm-defects').value = defects;
            if (chem) document.getElementById('dm-chem').value = chem;
            if (mfg) {
                // ensure format yyyy-mm-dd if possible
                const d = new Date(mfg);
                if (!isNaN(d)) {
                    const iso = d.toISOString().slice(0,10);
                    document.getElementById('dm-manufacturingDate').value = iso;
                }
            }
            if (resistance !== null) document.getElementById('dm-resistance').value = resistance;
            if (capacityFade !== null) document.getElementById('dm-capacityFade').value = capacityFade;

            // auto-run a recommendation for convenience
            document.getElementById('dm-run').click();
        });

        // save button : enregistre via pushEvent (traçabilité), et POST optionnel vers API du triage
        document.getElementById('dm-save').addEventListener('click', async (e) => {
            const recommendation = e.currentTarget.dataset.recommendation || 'UNKNOWN';
            const payload = JSON.parse(e.currentTarget.dataset.payload || '{}');

            // pushEvent pour la traçabilité locale
            const desc = `DecisionCenter: ${recommendation} (weights=${JSON.stringify(payload.weights)})`;
            try {
                // utilise ta fonction pushEvent existante pour tracer localement
                if (typeof pushEvent === 'function') pushEvent(desc);
            } catch(err) {
                console.warn("pushEvent absent:", err);
            }

            // Option: POST vers serveur pour enregistrer (si tu veux)
            try {
                const serial = (window.currentBattery?.staticInfo?.serialNumber) || document.getElementById('scan-input')?.value || null;
                if (serial) {
                    await fetch('/api/triage/decision', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            serialNumber: serial,
                            recommendation,
                            payload,
                            timestamp: new Date().toISOString(),
                            actor: 'ACT-SORT'
                        })
                    }).catch(()=>{/* ignore */});
                }
            } catch(e) {
                // ignore
            }

            alert("Décision enregistrée (traçabilité locale).");
            e.currentTarget.disabled = true;
        });
    }

    window.createDecisionPanel = createDecisionPanel;


    document.addEventListener('DOMContentLoaded', () => {
        disableAllButtons(); 
        // L'appel à createDecisionPanel() est dans openRole()
    });

})();

