/**
 * CONFIG & STATE
 */
const CONFIG = {
    FPS: 30,
    // CELL_SIZE: 40,
    BG_COLOR: "#0a0a0c",
    ACCENT_RGB: "0, 255, 157" // Matches CSS --accent
};

let midiState = {};
let peer, conn, myPeerId;

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const logEl = document.getElementById("log-output");

/**
 * INITIALIZATION
 */
function init() {
    // Responsive Canvas sizing
    const size = Math.min(window.innerWidth - 350, window.innerHeight - 100, 800);
    canvas.width = canvas.height = size;

    setupPeer();
    setupMidi();
    animate();
}

/**
 * LOGGING & UTILS
 */
const systemLog = (msg) => {
    logEl.textContent += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
    logEl.scrollTop = logEl.scrollHeight;
};

let copyPeerId = () => navigator.clipboard.writeText(myPeerId);

/**
 * WEBRTC LOGIC
 */
function setupPeer() {
    peer = new Peer();

    peer.on('open', id => {
        myPeerId = id;
        document.getElementById("my-id").textContent = id;
        systemLog("PeerJS Ready.");
    });

    peer.on('connection', (incomingConn) => {
        handleConnection(incomingConn);
    });
}

function connectToPeer() {
    const remoteId = document.getElementById("peer-id-input").value;
    if (!remoteId) return;
    
    const newConn = peer.connect(remoteId);
    handleConnection(newConn);
}

function handleConnection(connection) {
    conn = connection;
    systemLog(`Connecting to: ${conn.peer}...`);

    conn.on('open', () => {
        systemLog("Connected!");
        conn.send({ type: 'FULL_STATE', data: midiState });
    });

    conn.on('data', (payload) => {
        if (payload.type === 'UPDATE') {
            midiState[payload.note] = payload.velocity;
        } else if (payload.type === 'FULL_STATE') {
            // midiState = payload.data;
            Object.assign(midiState, payload.data);
        }
    });
}

/**
 * MIDI LOGIC
 */
function setupMidi() {
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(
            access => {
                systemLog("MIDI Access Granted.");
                access.inputs.forEach(input => {
                    input.onmidimessage = handleMidiMessage;
                });
            },
            () => systemLog("MIDI Access Denied.")
        );
    }
}

function handleMidiMessage(msg) {
    const [command, note, velocity] = msg.data;

    // We specifically look for Control Change (176)
    if (command === 176) {
        midiState[note] = velocity;

        // Sync to peer
        if (conn && conn.open) {
            conn.send({ type: 'UPDATE', note, velocity });
        }
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
    // const cols = Math.floor(canvas.width / CONFIG.CELL_SIZE);
    const cols = 8;
    const cell_size = canvas.width / cols;

    sortedNotes.forEach((note, index) => {
        const x = (index % cols) * cell_size;
        const y = Math.floor(index / cols) * cell_size;
        const val = midiState[note] / 127; // Normalized 0-1

        ctx.fillStyle = `rgba(${CONFIG.ACCENT_RGB}, ${val})`;
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        
        ctx.fillRect(x + 2, y + 2, cell_size - 4, cell_size - 4);
        ctx.strokeRect(x + 2, y + 2, cell_size - 4, cell_size - 4);
        
        // Note Label inside cell
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = `${cell_size / 5}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(note, x + cell_size / 2, y + cell_size / 2 + cell_size / 10);
    });
}

function animate() {
    draw();
    requestAnimationFrame(animate);
}

window.addEventListener('load', init);