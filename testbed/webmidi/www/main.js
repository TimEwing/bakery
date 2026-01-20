/**
 * CONFIG & STATE
 */
const CONFIG = {
    BG_COLOR: "#0a0a0c",
    ACCENT_RGB: "0, 255, 157", // Matches CSS --accent
    GRID_COLS: 8
};

let midiState = {};
let mesh = null;

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const logEl = document.getElementById("log-output");

/**
 * INITIALIZATION
 */
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize Mesh with callbacks
    mesh = new Mesh(handleAppMessage, sendFullState, systemLog);
    mesh.init();

    setupMidi();
    animate();
}

function resizeCanvas() {
    const size = Math.min(window.innerWidth - 350, window.innerHeight - 100, 800);
    canvas.width = canvas.height = size;
}

/**
 * LOGGING & UI
 */
const systemLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    logEl.textContent += `[${time}] ${msg}\n`;
    logEl.scrollTop = logEl.scrollHeight;
};

// UI Actions
window.copyPeerId = () => {
    if (mesh.ready()) {
        navigator.clipboard.writeText(mesh.peerId());
        systemLog("ID copied to clipboard.");
    }
};

window.connectToPeer = () => {
    const input = document.getElementById("peer-id-input");
    mesh.connectToPeer(input.value.trim());
    input.value = "";
};

/**
 * MESH CALLBACKS
 */
function handleAppMessage(senderId, payload) {
    switch (payload.type) {
        case 'UPDATE':
            midiState[payload.note] = payload.velocity;
            break;
        case 'FULL_STATE':
            Object.assign(midiState, payload.data);
            break;
        default:
            // Ignore unknown types
            break;
    }
}

function sendFullState(targetPeerId) {
    // Called when a new peer connects. Sync our current state to them.
    mesh.sendToPeer(targetPeerId, { type: 'FULL_STATE', data: midiState });
}

/**
 * MIDI LOGIC
 */
function setupMidi() {
    if (!navigator.requestMIDIAccess) {
        systemLog("WebMIDI not supported in this browser.");
        return;
    }

    navigator.requestMIDIAccess().then(
        access => {
            systemLog("MIDI Access Granted.");
            access.inputs.forEach(input => {
                input.onmidimessage = handleMidiMessage;
            });
            
            // Handle hot-plugging
            access.onstatechange = (e) => {
                if(e.port.state === 'connected' && e.port.type === 'input') {
                   e.port.onmidimessage = handleMidiMessage;
                   systemLog(`MIDI Device Connected: ${e.port.name}`);
                }
            };
        },
        () => systemLog("MIDI Access Denied.")
    );
}

function handleMidiMessage(msg) {
    const [command, note, velocity] = msg.data;

    // Control Change (176)
    if (command === 176) {
        midiState[note] = velocity;
        mesh.broadcast({ type: 'UPDATE', note, velocity });
    }
}

/**
 * RENDERING
 */
function draw() {
    // Clear
    ctx.fillStyle = CONFIG.BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sortedNotes = Object.keys(midiState).sort((a, b) => a - b);
    const cellSize = canvas.width / CONFIG.GRID_COLS;

    sortedNotes.forEach((note, index) => {
        const col = index % CONFIG.GRID_COLS;
        const row = Math.floor(index / CONFIG.GRID_COLS);
        
        const x = col * cellSize;
        const y = row * cellSize;
        const val = midiState[note] / 127; // Normalized 0-1

        // Draw Cell
        ctx.fillStyle = `rgba(${CONFIG.ACCENT_RGB}, ${val})`;
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        
        const pad = 4;
        ctx.fillRect(x + pad, y + pad, cellSize - (pad*2), cellSize - (pad*2));
        ctx.strokeRect(x + pad, y + pad, cellSize - (pad*2), cellSize - (pad*2));
        
        // Note Label
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = `${cellSize / 5}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(note, x + cellSize / 2, y + cellSize / 2);
    });
}

function animate() {
    document.getElementById("my-id").textContent = mesh.peerId() ?? "Connecting...";
    document.getElementById("num-connections").textContent = `(${mesh.numConnections()})`;
    draw();
    requestAnimationFrame(animate);
}

window.addEventListener('load', init);