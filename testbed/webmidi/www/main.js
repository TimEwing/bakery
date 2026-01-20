/**
 * CONFIG & STATE
 */
const CONFIG = {
    FPS: 30,
    BG_COLOR: "#0a0a0c",
    ACCENT_RGB: "0, 255, 157" // Matches CSS --accent
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
    // !Responsive Canvas sizing
    const size = Math.min(window.innerWidth - 350, window.innerHeight - 100, 800);
    canvas.width = canvas.height = size;

    mesh = new Mesh(handleIncomingData, sendFullState, systemLog, true);
    mesh.init();
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

let copyPeerId = () => !mesh.ready() ? null : navigator.clipboard.writeText(mesh.peerId());
let connectToPeer = () => mesh.connectToPeer(document.getElementById("peer-id-input").value);

function handleIncomingData(senderId, payload) {
    switch (payload.type) {
        case 'UPDATE':
            midiState[payload.note] = payload.velocity;
            break;
        case 'FULL_STATE':
            Object.assign(midiState, payload.data);
            break;
        default:
            systemLog(`Unknown payload type: ${payload.type} from ${senderId}`);
    }
}

function sendFullState(peerId) {
    mesh.sendToPeer(peerId, { type: 'FULL_STATE', data: midiState });
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

        // Sync to peers
        // broadcast({ type: 'UPDATE', note, velocity });
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
    // Update PeerID display
    document.getElementById("my-id").textContent = mesh.peerId() ?? "Not connected";
    // Update connection count
    document.getElementById("num-connections").textContent = mesh.numConnections();
    draw();
    requestAnimationFrame(animate);
}

window.addEventListener('load', init);

// API Gererator curry function
// const Message = (myId, 




// const _MeshAPI = (dataCallback) => {


//     // Message factory and parser
//     return ({
//         create: (id) => ({
//             data: (payload) => ({
//                 src: id,
//                 type: "DATA",
//                 data: payload,
//             }),
//             heartbeat: () => ({
//                 src: id,
//                 type: "HEARTBEAT",
//                 data: null,
//             }),
//             peerList: (peers) => ({
//                 src: id,
//                 type: "PEER_LIST",
//                 data: peers,
//             }),
//         }),
//         parse: ({ src, type, data }) => {
//             switch (type) {
//                 case "DATA":
//                     return dataCallback(src, data);
//                 case "HEARTBEAT":
//                     return;
//                 case "PEER_LIST":
//                     return;
//                 default:
//                     console.warn(`Unknown message type: ${type} from ${src}`);
//             }
//         },
//     });
// };

// const Message = ({
//     create: (id) => ({
//         data: (payload) => ({
//             src: id,
//             type: "DATA",
//             data: payload,
//         }),
//         heartbeat: () => ({
//             src: id,
//             type: "HEARTBEAT",
//             data: null,
//         }),
//         peerList: (peers) => ({
//             src: id,
//             type: "PEER_LIST",
//             data: peers,
//         }),
//     }),
//     parse: ({ src, type, data }) => {
//         switch (type) {
//             case "DATA":
//                 return handleIncomingData(src, data);
//             case "HEARTBEAT":
//                 return;
//             case "PEER_LIST":
//                 return;
//             default:
//                 console.warn(`Unknown message type: ${type} from ${src}`);
//         }
//     },
// });

// Message.create(peer.id).data({ note: 60, velocity: 127 });
// Message.create(peer.id).heartbeat();
// Message.create(peer.id).peerList(['peer1', 'peer2']);

// {
//     src: peer.id,
// }