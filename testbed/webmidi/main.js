// Constants

const BACKGROUND = "#101010";
const FOREGROUND = "#EFEFEF";
const FPS = 30;
const HEADERSIZE = 50;

// Globals

// --- SHARED MIDI STATE ---
let midiState = new Map();

// --- LOGGING ---
const log = msg => document.getElementById("log").textContent += msg + "\n";

// --- WEBRTC SETUP ---
let pc;
let dc;

function setupPeerConnection(isHost) {
    pc = new RTCPeerConnection();

    if (isHost) {
        dc = pc.createDataChannel("midi");
        setupDataChannel();
    } else {
        pc.ondatachannel = e => {
            dc = e.channel;
            setupDataChannel();
        };
    }

    pc.onicecandidate = e => {
        if (!e.candidate) {
            log("Copy this SDP to the other client:\n");
            log(JSON.stringify(pc.localDescription));
        }
    };
}

function setupDataChannel() {
    dc.onopen = () => log("Data channel open");
    dc.onmessage = e => {
        const data = JSON.parse(e.data);
        Object.assign(midiState, data);
        log("Received update: " + JSON.stringify(data));
    };
}

async function host() {
    setupPeerConnection(true);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
}

async function join() {
    const sdp = prompt("Paste host SDP");
    setupPeerConnection(false);
    await pc.setRemoteDescription(JSON.parse(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
}

function syncMidiState() {
    if (dc && dc.readyState === "open") {
        dc.send(JSON.stringify(midiState));
    }
}

// Canvas Setup

console.log(game)
const width = Math.max(400, Math.min(window.innerWidth, window.innerHeight));
game.width = game.height = width;
const ctx = game.getContext("2d");
console.log(ctx);

function clear() {
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, game.width, game.height);
}

function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

// MIDI State

// let midiState = new Map();

function serializeMidiState() {
    return JSON.stringify(Array.from(midiState.entries()));
}

function applyRemoteMidiState(serialized) {
    const entries = JSON.parse(serialized);
    midiState = new Map(entries);
    console.log("Updated midiState from peer:", midiState);
    draw();
}

console.log("MIDI State initialized:", midiState);

// Drawing

const noteRectWidth = width / 16;
const maxRects = Math.floor(width / noteRectWidth);

function draw() {
    clear();

    const sortedNotes = Array.from(midiState.keys()).sort((a, b) => a - b);
    sortedNotes.forEach((note, index) => {
        const x = index % maxRects;
        const y = Math.floor(index / maxRects);
        const velocity = midiState.get(note);
        const noteColor = `rgb(${Math.floor(velocity / 127 * 255)}, ${Math.floor(velocity / 127 * 255)}, 0)`;
        rect(x * noteRectWidth, HEADERSIZE + y * noteRectWidth, noteRectWidth - 2, noteRectWidth - 2, noteColor);
    });

    const text = "WebMidi Testbed";
    ctx.font = "24px Arial";
    ctx.textBaseline = "top";
    ctx.fillStyle = FOREGROUND;
    ctx.fillText(text, width / 2 - ctx.measureText(text).width / 2, 15);
}

setInterval(draw, 1000 / 30);

// WebMidi Setup

function onMIDISuccess(midiAccess) {
    console.log("MIDI ready!");
    const inputs = midiAccess.inputs;
    console.log(inputs);
    inputs.forEach((input) => {
        console.log("Input port : [type:'" + input.type + "'] id:'" + input.id +
            "' manufacturer:'" + input.manufacturer + "' name:'" + input.name + "' version:'" + input.version + "'");
        input.onmidimessage = (msg) => getMIDIMessage(input, msg);
    });
}

function onMIDIFailure(msg) {
    console.log("Failed to get MIDI access - " + msg);
}

function getMIDIMessage(input, midiMessage) {
    const command = midiMessage.data[0];
    const note = midiMessage.data[1];
    const velocity = midiMessage.data[2];
    const inputId = `${input.id} (${input.manufacturer} ${input.name})`;
    // console.log("MIDI message received " + inputId + ": " + [command, note, velocity]);
    if (command === 176) { // control change
        midiState = midiState.set(note, velocity);
        syncMidiState();
        // for (const id in dataChannels) {
        //     const dc = dataChannels[id];
        //     if (dc && dc.readyState === "open") {
        //         dc.send(serializeMidiState());
        //     }
        // }
    }
}

if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
} else {
    console.log("No MIDI support in your browser.");
}


// WebRTC Setup
document.getElementById("hostBtn").onclick = host;
document.getElementById("joinBtn").onclick = join;
