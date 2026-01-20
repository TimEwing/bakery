
class Mesh {
    constructor(dataCallback, onPeerConnection, logFunc, enableReconnect=false) {
        this.dataCallback = dataCallback;           // Function to handle incoming data
        this.onOpenConnection = onPeerConnection;   // Function to call on new connection
        this.logFunc = logFunc;                     // Logging function
        this.peer = null;                           // PeerJS Peer instance
        this.connections = {};                      // Active connections (peerId -> {conn, peers, lastHeartbeat})
        this.enableReconnect = enableReconnect;     // Enable automatic reconnection
    }
    
    ready() {
        return this.peer && this.peer.id;
    }
    
    peerId() {
        return this.peer ? this.peer.id : null;
    }
    
    numConnections() {
        return Object.keys(this.connections).length;
    }
    
    reinit() {
        setTimeout(() => this.init(), 5000);
    }
    
    // Initialize PeerJS and setup event handlers
    init() {
        this.close();
        this.peer = new Peer({
            host: window.location.hostname,
            port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
            path: '/peerjs/mesh-signaling',
            secure: window.location.protocol === 'https:',
        });

        // New remote peer connection
        this.peer.on('open', id => {
            this.logFunc(`My Peer ID: ${id}`);
            
            // Announce to server every 10 seconds
            // if (this.announceInterval) clearInterval(this.announceInterval);
            // this.announceToServer();
            // this.announceInterval = setInterval(() => this.announceToServer(), 10000);
            
            this.requestServerPeerList();
        });

        this.peer.on('close', () => {
            this.logFunc(`Peer connection closed (server).`);
            if (this.enableReconnect) this.reinit();
        });
        
        this.peer.on('disconnected', () => {
            this.logFunc(`Peer disconnected (server).`);
            if (this.enableReconnect) {
                // if (this.conn.id) {
                //     this.peer.reconnect();
                // } else {
                    this.reinit();
                // }
            }
        });
        
        this.peer.on('error', (err) => {
            this.logFunc(`Peer error: ${err}`);
            // switch (err.type) {
            //     case 'network':
            //     case 'disconnected':
            //     cose 'socket-closed'
                if (this.enableReconnect) this.reinit();
            //         break;
            //     default:
            //         break;
            // }
        });

        // Incoming remote peer connection
        this.peer.on('connection',
            (incomingConn) => this.registerConnection(incomingConn)
        );
    }
    
    close() {
        // Close all connections
        Object.keys(this.connections).forEach(
            peerId => this.closePeerConnection(peerId)
        );
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        // if (this.announceInterval) {
        //     clearInterval(this.announceInterval);
        //     this.announceInterval = null;
        // }
    }

    async requestServerPeerList() {
        if (!this.ready()) return;
        try {
            const response = await fetch('/peers');
            const data = await response.json();
            this.handleIncomingData(this.peer.id, data);
        } catch (error) {
            this.logFunc(`Error getting server peers: ${error}`);
        }
        // Retry?
    }
    
    sendToPeer(peerId, payload) {
        const peer = this.connections[peerId];
        if (peer && peer.conn && peer.conn.open) {
            peer.conn.send({ type: 'DATA', data: payload });
        }
    }
    
    broadcast(payload) {
        this._broadcast({ type: 'DATA', data: payload });
    }

    _broadcast(payload) {
        Object.values(this.connections).forEach(({ conn }) => {
            if (conn && conn.open) {
                conn.send(payload);
            }
        });
    }
        
    // peerValid(peerId) {
    //     return peerId && this.connections[peerId] !== undefined;
    // }
    
    // peerConnected(peerId) {
    //     return this.peerValid(peerId) && this.connections[peerId]
    //         && this.connections[peerId].conn && this.connections[peerId].conn.open;
    // }
    
    connectToPeer(targetId) {
        if (!targetId || this.connections[targetId] || targetId === this.peer.id) return;
        // this.logFunc(`Connecting to peer: ${targetId}...`);
        const newConn = this.peer.connect(targetId);
        this.registerConnection(newConn);
    }
    
    // reconnectPeerConnection(peerId) {
    //     this.logFunc(`Reconnecting to peer: ${peerId}...`);
    //     if (this.connections[peerId]) {
    //         this.connections[peerId].reconnect();
    //     } else {
    //         this.connectToPeer(peerId);
    //     }
    // }
        
    closePeerConnection(peerId) {
        if (this.connections[peerId] !== undefined && this.connections[peerId].conn) {
            this.connections[peerId].conn.close();
            // this.connections[peerId].conn.destroy();
            // this.connections[peerId].conn = null;
        }
    }
    
    deletePeerConnection(peerId) {
        this.closePeerConnection(peerId);
        delete this.connections[peerId];
    }
    
    registerConnection(conn) {
        conn.on('open', () => {
            this.connections[conn.peer] = {
                conn: conn,
                peers: [],
                lastHeartbeat: Date.now(),
            };
            this.logFunc(`Connected to: ${conn.peer}`);
            // Broadcast current peer list
            const peerList = Object.keys(this.connections).concat([this.peer.id]);
            // console.log('Sending peer list:', peerList);
            this._broadcast({ type: 'PEER_LIST', data: peerList });
            // User can send initial data here if needed
            this.onOpenConnection(conn.peer);
        });
        
        conn.on('data', (msg) => this.handleIncomingData(conn.peer, msg));
        
        conn.on('disconnected', () => {
            this.logFunc(`Connection disconnected: ${conn.peer}`);
            // Attempt to reconnect
            conn.reconnect();
        });
        
        conn.on('close', () => {
            this.logFunc(`Connection closed: ${conn.peer}`);
            this.deletePeerConnection(conn.peer);
        });
        
        conn.on('error', (err) => {
            this.logFunc(`Connection error with ${conn.peer}: ${err}`);
            this.deletePeerConnection(conn.peer);
        });
    }
    
    handleIncomingData(peerId, msg) {
            const { type, data } = msg;
            // console.log(`Data received from ${conn.peer}:`, type, data);
            // this.connections[conn.peer].lastHeartbeat = Date.now();
            switch (type) {
                case 'PEER_LIST':
                    this.logFunc(`Received peer list from ${peerId === this.peerId() ? "server" : peerId}: ${data}`);
                    data.forEach(id => {
                        if (id !== this.peer.id && !this.connections[id]) {
                            this.logFunc(`Discovered peer: ${id}, connecting...`);
                            this.connectToPeer(id);
                        }
                    });
                    break;
                case 'DATA':
                    // Send data to user
                    this.dataCallback(peerId, data);
                    break;
            }
        
    }
}
