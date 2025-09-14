
// =============================================================================
// == server.js          DominoM  -  August 27 by DAM Productions              ==
// =============================================================================
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const analytics = require('./analytics');

const app = express();

// =============================================================================
// == RENDER-ONLY AVATAR SYSTEM - Creates avatars that exist only on server ==
// =============================================================================

// Create avatars directory if it doesn't exist
const serverAvatarsDir = path.join(__dirname, 'assets', 'icons');
const serverDefaultsDir = path.join(__dirname, 'assets', 'defaults');

if (!fs.existsSync(serverAvatarsDir)) {
    fs.mkdirSync(serverAvatarsDir, { recursive: true });
}
if (!fs.existsSync(serverDefaultsDir)) {
    fs.mkdirSync(serverDefaultsDir, { recursive: true });
}

// Generate SVG avatar for a given name and color
function generateSVGAvatar(initials, color) {
    return `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="${color}"/>
        <text x="20" y="26" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">${initials}</text>
    </svg>`;
}

// Server-side avatar endpoint - creates avatars on-demand
app.get('/assets/icons/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(serverAvatarsDir, filename);
    
    // If file exists, serve it
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }
    
    // If it's an avatar request, generate one dynamically
    const match = filename.match(/^([A-Za-z0-9]+)(?:_avatar)?\.(jpg|png|svg)$/);
    if (match) {
        const username = match[1].toUpperCase();
        const initials = username.substring(0, 2);
        
        // Color based on username hash
        const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#fd7e14', '#20c997'];
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = colors[Math.abs(hash) % colors.length];
        
        // Generate SVG avatar
        const svgContent = generateSVGAvatar(initials, color);
        
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        return res.send(svgContent);
    }
    
    // File not found
    res.status(404).send('Avatar not found');
});

// Default jugador avatars endpoint
app.get('/assets/defaults/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(serverDefaultsDir, filename);
    
    // If file exists, serve it
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }
    
    // Generate default jugador avatar
    const match = filename.match(/^jugador(\d+)_avatar\.(jpg|png|svg)$/);
    if (match) {
        const playerNum = parseInt(match[1]);
        const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545'];
        const color = colors[(playerNum - 1) % colors.length];
        const initials = `J${playerNum}`;
        
        const svgContent = generateSVGAvatar(initials, color);
        
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.send(svgContent);
    }
    
    res.status(404).send('Default avatar not found');
});

// Endpoint to get active rooms and their player counts
app.get('/active-rooms', (req, res) => {
    const rooms = [];
    for (let [roomId, room] of gameRooms) {
        const connectedCount = room.jugadores.filter(p => p.isConnected).length;
        rooms.push({
            roomId,
            connectedCount
        });
    }
    res.json({ rooms });
});

// Analytics endpoints
app.get('/analytics-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'analytics-dashboard.html'));
});

app.get('/analytics', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const analyticsData = await analytics.getAnalyticsData(days);
        const quickStats = await analytics.getQuickStats();
        
        res.json({
            success: true,
            data: analyticsData,
            quickStats: quickStats
        });
    } catch (error) {
        console.error('Analytics endpoint error:', error);
        res.status(500).json({ success: false, error: 'Analytics unavailable' });
    }
});
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname));

// Serve avatars from persistent storage
app.use('/assets/icons', express.static(global.AVATAR_ICONS_PATH || path.join(__dirname, 'assets', 'icons')));

// Serve individual avatar files from memory storage
app.get('/assets/icons/:filename', (req, res) => {
    const filename = req.params.filename;
    
    // Try to get from memory storage first
    const avatarData = getAvatar(filename);
    
    if (avatarData) {
        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.send(avatarData);
    } else {
        res.status(404).json({ error: 'Avatar not found' });
    }
});

// =============================================================================
// == ENSURE REQUIRED DIRECTORIES EXIST ON SERVER STARTUP                    ==
// =============================================================================

// =============================================================================
// == AVATAR STORAGE CONFIGURATION - PERSISTENT ACROSS DEPLOYMENTS          ==
// =============================================================================

function setupAvatarStorage() {
    // Check if we're on Render with persistent disk
    const persistentPath = process.env.RENDER_PERSISTENT_DISK_PATH;
    
    if (persistentPath) {
        // 🎯 PRODUCTION: Use Render persistent disk
        console.log('🔄 [AVATAR-STORAGE] Using Render persistent disk:', persistentPath);
        
        global.AVATAR_ICONS_PATH = path.join(persistentPath, 'avatars');
        global.AVATAR_DEFAULTS_PATH = path.join(__dirname, 'assets', 'defaults');
        
        // Create persistent avatar directory
        if (!fs.existsSync(global.AVATAR_ICONS_PATH)) {
            fs.mkdirSync(global.AVATAR_ICONS_PATH, { recursive: true });
            console.log('✅ [AVATAR-STORAGE] Created persistent avatars:', global.AVATAR_ICONS_PATH);
        } else {
            const existingFiles = fs.readdirSync(global.AVATAR_ICONS_PATH);
            console.log(`🎉 [AVATAR-STORAGE] Persistent avatars found: ${existingFiles.length} files`);
        }
    } else {
        // 🔧 FALLBACK: Use in-memory avatar storage (database approach)
        console.log('🔄 [AVATAR-STORAGE] Using in-memory storage with database backup');
        
        global.AVATAR_STORAGE = new Map(); // In-memory avatar storage
        global.AVATAR_ICONS_PATH = path.join(__dirname, 'assets', 'icons');
        global.AVATAR_DEFAULTS_PATH = path.join(__dirname, 'assets', 'defaults');
        
        // Create local directories for fallback
        if (!fs.existsSync(global.AVATAR_ICONS_PATH)) {
            fs.mkdirSync(global.AVATAR_ICONS_PATH, { recursive: true });
            console.log('✅ [AVATAR-STORAGE] Created local avatars directory');
        }
        
        // Load any existing avatars into memory
        loadAvatarsIntoMemory();
    }
    
    // Always ensure defaults directory exists
    if (!fs.existsSync(global.AVATAR_DEFAULTS_PATH)) {
        fs.mkdirSync(global.AVATAR_DEFAULTS_PATH, { recursive: true });
        console.log('✅ [AVATAR-STORAGE] Created defaults directory');
    }
    
    console.log('📁 [AVATAR-STORAGE] Paths configured:', {
        icons: global.AVATAR_ICONS_PATH,
        defaults: global.AVATAR_DEFAULTS_PATH,
        persistent: !!persistentPath,
        inMemoryStorage: !persistentPath
    });
}

// Load existing avatars into memory storage
function loadAvatarsIntoMemory() {
    try {
        if (fs.existsSync(global.AVATAR_ICONS_PATH)) {
            const files = fs.readdirSync(global.AVATAR_ICONS_PATH);
            files.forEach(filename => {
                if (filename.endsWith('_avatar.jpg')) {
                    const filepath = path.join(global.AVATAR_ICONS_PATH, filename);
                    const data = fs.readFileSync(filepath, 'base64');
                    global.AVATAR_STORAGE.set(filename, data);
                }
            });
            console.log(`📦 [AVATAR-STORAGE] Loaded ${global.AVATAR_STORAGE.size} avatars into memory`);
        }
    } catch (error) {
        console.error('❌ [AVATAR-STORAGE] Failed to load avatars into memory:', error);
    }
}

// Save avatar to memory and try to write to disk
function saveAvatar(filename, imageBuffer) {
    if (global.AVATAR_STORAGE) {
        // Store in memory first
        const base64Data = imageBuffer.toString('base64');
        global.AVATAR_STORAGE.set(filename, base64Data);
        console.log(`💾 [AVATAR-STORAGE] Saved ${filename} to memory storage`);
    }
    
    // Also try to save to disk (will be lost on deployment but that's ok)
    const filepath = path.join(global.AVATAR_ICONS_PATH, filename);
    fs.writeFileSync(filepath, imageBuffer);
}

// Get avatar from memory or disk
function getAvatar(filename) {
    if (global.AVATAR_STORAGE && global.AVATAR_STORAGE.has(filename)) {
        return Buffer.from(global.AVATAR_STORAGE.get(filename), 'base64');
    }
    
    // Fallback to disk
    const filepath = path.join(global.AVATAR_ICONS_PATH, filename);
    if (fs.existsSync(filepath)) {
        return fs.readFileSync(filepath);
    }
    
    return null;
}

// List all avatars from memory storage
function listAvatars() {
    if (global.AVATAR_STORAGE) {
        return Array.from(global.AVATAR_STORAGE.keys());
    }
    
    // Fallback to disk listing
    if (fs.existsSync(global.AVATAR_ICONS_PATH)) {
        return fs.readdirSync(global.AVATAR_ICONS_PATH).filter(f => f.endsWith('_avatar.jpg'));
    }
    
    return [];
}

// Initialize avatar storage
setupAvatarStorage();

// Legacy support - remove these after updating all references
// Create avatars directory if it doesn't exist
const iconsDir = global.AVATAR_ICONS_PATH || path.join(__dirname, 'assets', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
    console.log(`🚀 [STARTUP] Created avatars directory: ${iconsDir}`);
} else {
    console.log(`✅ [STARTUP] Avatars directory exists: ${iconsDir}`);
}

// Create defaults directory for default avatars
const defaultsDir = global.AVATAR_DEFAULTS_PATH || path.join(__dirname, 'assets', 'defaults');
if (!fs.existsSync(defaultsDir)) {
    fs.mkdirSync(defaultsDir, { recursive: true });
    console.log(`🚀 [STARTUP] Created defaults directory: ${defaultsDir}`);
} else {
    console.log(`✅ [STARTUP] Defaults directory exists: ${defaultsDir}`);
}

// =============================================================================
// == GLOBAL VARIABLES & GAME STATE MANAGEMENT                                ==
// =============================================================================

const POINTS_TO_WIN_MATCH = 20;

// Room management system for multiple simultaneous games
const gameRooms = new Map(); // roomId -> { jugadores, gameState, roomId }
let nextRoomId = 1;

/**
 * (ROUTINE) Creates the initial array of four player slots for the game.
 */
function createJugadores() {
    return [
        { name: "Jugador 1", assignedName: null, socketId: null, isConnected: false },
        { name: "Jugador 2", assignedName: null, socketId: null, isConnected: false },
        { name: "Jugador 3", assignedName: null, socketId: null, isConnected: false },
        { name: "Jugador 4", assignedName: null, socketId: null, isConnected: false }
    ];
}

/**
 * (ROUTINE) Creates a new game room with fresh state
 */
function createGameRoom(roomId) {
    const jugadores = createJugadores();
    const gameState = createNewGameState();
    return {
        roomId,
        jugadores,
        gameState,
        targetScore: 70 // default, can be overwritten on join
    };
}

/**
 * (ROUTINE) Finds an available room or creates a new one
 * Prioritizes rooms where the player was previously connected
 */
function findOrCreateRoom(playerName = null) {
    // First, if a player name is provided, look for their previous room
    if (playerName) {
        for (let [roomId, room] of gameRooms) {
            const wasInThisRoom = room.jugadores.find(p => p.assignedName === playerName);
            if (wasInThisRoom) {
                const connectedCount = room.jugadores.filter(p => p.isConnected).length;
                if (connectedCount < 4) {
                    // // console.log(`[ROOM PRIORITY] ${playerName} returning to previous room: ${roomId}`);
                    return room;
                }
            }
        }
    }
    
    // Look for existing rooms with space
    for (let [roomId, room] of gameRooms) {
        const connectedCount = room.jugadores.filter(p => p.isConnected).length;
        if (connectedCount < 4) {
            return room;
        }
    }
    
    // Create new room if all are full
    const newRoomId = `Sala-${nextRoomId++}`;
    const newRoom = createGameRoom(newRoomId);
    gameRooms.set(newRoomId, newRoom);
    // // console.log(`[ROOM SYSTEM] Created new room: ${newRoomId}`);
    
    // Track room creation for analytics
    analytics.trackRoomCreated(newRoomId, 70).catch(err => 
        console.error('Analytics room creation error:', err)
    );
    
    return newRoom;
}

/**
 * (ROUTINE) Finds the room that contains a specific player by socketId
 */
function findPlayerRoom(socketId) {
    for (let [roomId, room] of gameRooms) {
        const player = room.jugadores.find(p => p.socketId === socketId);
        if (player) {
            return room;
        }
    }
    return null;
}

/**
 * (ROUTINE) Creates or resets the main game state object to its default values.
 */
function createNewGameState() {
    const initialStats = {
        "Jugador 1": { matchesWon: 0 },
        "Jugador 2": { matchesWon: 0 },
        "Jugador 3": { matchesWon: 0 },
        "Jugador 4": { matchesWon: 0 }
    };

    return {
        jugadoresInfo: [],
        board: [],
        currentTurn: null,
        gameInitialized: false,
        leftEnd: null,
        rightEnd: null,
        teamScores: { teamA: 0, teamB: 0 },
        isFirstMove: true,
        teams: { teamA: [], teamB: [] },
        hands: {},
        spinnerTile: null,
        lastWinner: null,
        isFirstRoundOfMatch: true,
        readyPlayers: new Set(),
        endRoundMessage: null,
        matchNumber: 1,
        playerStats: initialStats,
        lastPlayedTile: null,
        matchOver: false, // Explicitly track match-over state
        endMatchMessage: null,
        seating: [], // Added to manage dynamic turn order
        isAfterTiedBlockedGame: false, // Flag for tied blocked game rule
        isTiedBlockedGame: false, // Flag for display messages
        gameBlocked: false // Flag to indicate blocked game state
    };
}
function showSystemMessage(message, type = 'info') {
    const messagesDiv = document.getElementById('chat-messages');
    if (!messagesDiv) return;
    const msg = document.createElement('p');
    msg.innerHTML = `<b>System:</b> ${message}`;
    msg.style.color = type === 'error' ? '#ff4444' : (type === 'success' ? '#44ff44' : '#ffaa00');
    msg.style.fontWeight = 'bold';
    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// =============================================================================
// == CORE GAME UTILITY FUNCTIONS                                             ==
// =============================================================================

/**
 * (ROUTINE) Generates a standard 28-tile set of dominoes.
 */
function generateDominoes() {
    const d = [];
    for (let i = 0; i <= 6; i++) { for (let j = i; j <= 6; j++) d.push({ left: i, right: j }); }
    return d;
}

/**
 * (ROUTINE) Shuffles an array in place.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * (ROUTINE) Calculates the total pip value of a player's hand.
 */
function calculateHandValue(hand) {
    if (!hand || hand.length === 0) return 0;
    return hand.reduce((sum, tile) => sum + tile.left + tile.right, 0);
}

/**
 * (ROUTINE) Finds the player who has the double 6 tile.
 */
function findDouble6Holder(room) {
    const connectedPlayers = room.jugadores.filter(p => p.isConnected);
    for (let player of connectedPlayers) {
        const hand = room.gameState.hands[player.name];
        if (hand && hand.some(tile => tile.left === 6 && tile.right === 6)) {
            return player.name;
        }
    }
    return null;
}

/**
 * (ROUTINE) Broadcasts the current game state to ALL connected clients in a room.
 */
function broadcastGameState(room) {
    room.gameState.jugadoresInfo = room.jugadores.map(p => ({
        name: p.name,
        displayName: p.assignedName || p.name,
        isConnected: p.isConnected,
        tileCount: room.gameState.hands[p.name] ? room.gameState.hands[p.name].length : 0,
        avatar: p.avatar || { type: 'file', data: null }
    }));
    
    // Debug: Log avatar data being sent
    // // console.log('[BROADCAST] Avatar data for each player:');
    room.gameState.jugadoresInfo.forEach(p => {
        // // console.log(`  ${p.displayName} (${p.name}): ${p.avatar.type} - ${p.avatar.data}`);
    });
    
    const stateToSend = { ...room.gameState };
    stateToSend.readyPlayers = Array.from(room.gameState.readyPlayers);
    stateToSend.roomId = room.roomId; // Add room info
    stateToSend.targetScore = room.targetScore || 70; // Always include targetScore
    const { hands, ...finalState } = stateToSend;

    // // console.log(`[BROADCAST] Sending gameState to ${room.jugadores.filter(p => p.isConnected).length} players in ${room.roomId}`);
    // // console.log(`[BROADCAST] GameState: initialized=${finalState.gameInitialized}, currentTurn=${finalState.currentTurn}, firstMove=${finalState.isFirstMove}`);

    // Emit only to players in this room
    room.jugadores.forEach(player => {
        if (player.isConnected && player.socketId) {
            io.to(player.socketId).emit('gameState', finalState);
            // // console.log(`[BROADCAST] Emitted gameState to ${player.name} (${player.socketId})`);
        }
    });
}

// =============================================================================
// == CORE GAME LOGIC FUNCTIONS                                               ==
// =============================================================================

/**
 * (ROUTINE) Deals 7 dominoes to each connected player.
 */
function dealHands(room) {
    let dominoesPool = generateDominoes();
    shuffleArray(dominoesPool);
    const connectedPlayers = room.jugadores.filter(p => p.isConnected);
    // // console.log(`[DEAL-HANDS] Dealing to ${connectedPlayers.length} players in ${room.roomId}`);
    connectedPlayers.forEach(player => {
        room.gameState.hands[player.name] = dominoesPool.splice(0, 7);
        // // console.log(`[DEAL-HANDS] Dealt ${room.gameState.hands[player.name].length} tiles to ${player.name}`);
        if (player.socketId) {
            io.to(player.socketId).emit('playerHand', room.gameState.hands[player.name]);
            // // console.log(`[DEAL-HANDS] Emitted playerHand to ${player.name} (${player.socketId})`);
        }
    });
}

/**
 * (ROUTINE) Checks if a player has any valid moves in their hand.
 */
function hasValidMove(room, playerName) {
    const hand = room.gameState.hands[playerName];
    if (!hand) return false;
    if (room.gameState.isFirstMove) {
        if (room.gameState.isFirstRoundOfMatch) {
            // First round of match: must have double 6
            return hand.some(t => t.left === 6 && t.right === 6);
        } else if (room.gameState.isAfterTiedBlockedGame) {
            // After tied blocked game: player with double 6 can play any tile
            return hand.length > 0;
        } else {
            // Regular first move: any tile is valid
            return true;
        }
    }
    return hand.some(t => t.left === room.gameState.leftEnd || t.right === room.gameState.leftEnd || t.left === room.gameState.rightEnd || t.right === room.gameState.rightEnd);
}

/**
 * (ROUTINE) Advances the turn to the next player based on dynamic seating.
 */
function nextTurn(room) {
    if (!room.gameState.currentTurn || !room.gameState.seating || room.gameState.seating.length === 0) return;
    const currentIndex = room.gameState.seating.indexOf(room.gameState.currentTurn);
    if (currentIndex === -1) {
        console.error("Current player not in seating order!");
        return;
    }
    const nextIndex = (currentIndex + 1) % 4;
    room.gameState.currentTurn = room.gameState.seating[nextIndex];
}

/**
 * (ROUTINE) Initializes all state variables for a new round of play.
 */
function initializeRound(room) {
    room.gameState.gameInitialized = true;
    room.gameState.isInitializing = false; // Reset initialization flag
    room.gameState.isFirstMove = true;
    room.gameState.board = [];
    room.gameState.leftEnd = null;
    room.gameState.rightEnd = null;
    room.gameState.spinnerTile = null;
    room.gameState.endRoundMessage = null;
    room.gameState.lastPlayedTile = null;
    room.gameState.matchOver = false;
    room.gameState.endMatchMessage = null;
    room.gameState.gameBlocked = false;
    room.gameState.isTiedBlockedGame = false;

    const playerNames = ["Jugador 1", "Jugador 2", "Jugador 3", "Jugador 4"];
    const rotation = (room.gameState.matchNumber - 1) % 3;
    if (rotation === 0) { // Match 1: (1,2) vs (3,4)
        room.gameState.teams.teamA = [playerNames[0], playerNames[1]];
        room.gameState.teams.teamB = [playerNames[2], playerNames[3]];
    } else if (rotation === 1) { // Match 2: (1,3) vs (2,4)
        room.gameState.teams.teamA = [playerNames[0], playerNames[2]];
        room.gameState.teams.teamB = [playerNames[1], playerNames[3]];
    } else { // Match 3: (1,4) vs (2,3)
        room.gameState.teams.teamA = [playerNames[0], playerNames[3]];
        room.gameState.teams.teamB = [playerNames[1], playerNames[2]];
    }

    // Set seating order for turns: [p1, p2, p1_partner, p2_partner]
    const teamA = room.gameState.teams.teamA;
    const teamB = room.gameState.teams.teamB;
    room.gameState.seating = [teamA[0], teamB[0], teamA[1], teamB[1]];

    dealHands(room);
    const connectedPlayerNames = room.jugadores.filter(p => p.isConnected).map(p => p.name);

    if (room.gameState.isFirstRoundOfMatch) {
        const startingPlayer = connectedPlayerNames.find(p => room.gameState.hands[p] && room.gameState.hands[p].some(t => t.left === 6 && t.right === 6));
        room.gameState.currentTurn = startingPlayer || "Jugador 1";
        room.gameState.isAfterTiedBlockedGame = false;
    } else if (room.gameState.isAfterTiedBlockedGame) {
        // After tied blocked game: find who has double 6
        const double6Holder = findDouble6Holder(room);
        room.gameState.currentTurn = double6Holder || room.gameState.lastWinner || room.gameState.seating[0] || "Jugador 1";
        // // console.log(`[TIE RULE] Double 6 holder ${room.gameState.currentTurn} starts the round and can play any tile.`);
    } else {
        room.gameState.currentTurn = room.gameState.lastWinner && connectedPlayerNames.includes(room.gameState.lastWinner) ? room.gameState.lastWinner : (room.gameState.seating[0] || "Jugador 1");
        room.gameState.isAfterTiedBlockedGame = false;
    }
    broadcastGameState(room);
}


/**
 * (ROUTINE) Ends the current round, calculates scores, and checks for a match winner.
 */
function endRound(room, outcome) {
    let endMessage = "Mano finalizada!";
    let matchOverMessage = "";

    try {
        if (outcome.winner) {
            const winner = outcome.winner;
            room.gameState.lastWinner = winner;
            const winnerTeam = room.gameState.teams.teamA.includes(winner) ? 'teamA' : 'teamB';
            const loserTeamKey = winnerTeam === 'teamA' ? 'teamB' : 'teamA';
            const points = room.gameState.teams[loserTeamKey].reduce((total, p) => total + calculateHandValue(room.gameState.hands[p]), 0);
            room.gameState.teamScores[winnerTeam] += points;
            const winnerDisplayName = room.gameState.jugadoresInfo.find(p => p.name === winner).displayName;
            endMessage = `${winnerDisplayName} domino! Equipo ${winnerTeam.slice(-1)} gana ${points} puntos!`;
            
            // Broadcast domino win bell sound to ALL players in room
            room.jugadores.forEach(player => {
                if (player.isConnected && player.socketId) {
                    io.to(player.socketId).emit('playerWonHand', { 
                        playerName: winner, 
                        displayName: winnerDisplayName,
                        points: points 
                    });
                }
            });
        } else if (outcome.blocked) {
            room.gameState.gameBlocked = true;
            const scoreA = room.gameState.teams.teamA.reduce((total, p) => total + calculateHandValue(room.gameState.hands[p]), 0);
            const scoreB = room.gameState.teams.teamB.reduce((total, p) => total + calculateHandValue(room.gameState.hands[p]), 0);

            if (scoreA !== scoreB) {
                const winningTeamKey = scoreA < scoreB ? 'teamA' : 'teamB';
                const points = scoreA < scoreB ? scoreB : scoreA;
                room.gameState.teamScores[winningTeamKey] += points;
                endMessage = `Juego Cerrado! Equipo ${winningTeamKey.slice(-1)} gana con menos puntos, gana ${points} puntos.`;
                // Determine next leader for blocked game
                const allPipCounts = room.jugadores
                    .filter(p => p.isConnected)
                    .map(p => ({ player: p.name, score: calculateHandValue(room.gameState.hands[p.name]) }))
                    .sort((a, b) => a.score - b.score);
                if(allPipCounts.length > 0) room.gameState.lastWinner = allPipCounts[0].player;
                room.gameState.isAfterTiedBlockedGame = false;
                room.gameState.isTiedBlockedGame = false;

            } else {
                // TIED BLOCKED GAME - Special rule implementation
                endMessage = `Juego Cerrado! Empate - nadie gana puntos.`;
                room.gameState.isTiedBlockedGame = true;
                room.gameState.isAfterTiedBlockedGame = true;
                
                // Find who has the double 6 for next round
                const double6Holder = findDouble6Holder(room);
                if (double6Holder) {
                    room.gameState.lastWinner = double6Holder;
                    const holderDisplayName = room.gameState.jugadoresInfo.find(p => p.name === double6Holder)?.displayName || double6Holder;
                //    endMessage += `\nPróxima mano: ${holderDisplayName} (tiene doble 6) puede jugar cualquier ficha.`;
                } else {
                    // Fallback: lowest pip count starts
                    const allPipCounts = room.jugadores
                        .filter(p => p.isConnected)
                        .map(p => ({ player: p.name, score: calculateHandValue(room.gameState.hands[p.name]) }))
                        .sort((a, b) => a.score - b.score);
                    if(allPipCounts.length > 0) room.gameState.lastWinner = allPipCounts[0].player;
                    room.gameState.isAfterTiedBlockedGame = false;
                }
            }
        }
    } catch (error) { console.error("[SERVER] FATAL ERROR in endRound:", error); }

    const scoreA = room.gameState.teamScores.teamA;
    const scoreB = room.gameState.teamScores.teamB;

    const targetScore = room.targetScore || 70;
    if (scoreA >= targetScore || scoreB >= targetScore) {
        const winningTeamName = scoreA > scoreB ? 'Team A' : 'Team B';
        const winningTeamKey = scoreA > scoreB ? 'teamA' : 'teamB';
        const losingTeamScore = scoreA > scoreB ? scoreB : scoreA;
        
        // Implement shutout rule: 2 points if opposing team has 0 points, otherwise 1 point
        const matchPoints = losingTeamScore === 0 ? 2 : 1;
        
        room.gameState.teams[winningTeamKey].forEach(playerName => {
            if (room.gameState.playerStats[playerName]) {
                room.gameState.playerStats[playerName].matchesWon += matchPoints;
            }
        });
        
        const shutoutMessage = losingTeamScore === 0 ? ` (Zapato: +${matchPoints} puntos!)` : '';
        matchOverMessage = `\n${winningTeamName} gana el match ${scoreA} a ${scoreB}!${shutoutMessage}`;

        // DO NOT RESET STATE HERE. Wait for players to be ready.
        // Set flags to show the match over screen on the client.
        room.gameState.matchOver = true;
        room.gameState.endMatchMessage = matchOverMessage;
        room.gameState.endRoundMessage = endMessage + matchOverMessage;
        room.gameState.gameInitialized = false; 
        room.gameState.readyPlayers.clear();
        
        // Track match completion for analytics
        const matchStats = {
            duration: Date.now() - (room.gameCreatedAt || Date.now()),
            totalMoves: 0, // Could track this separately if needed
            playerCount: room.jugadores.filter(p => p.isConnected).length
        };
        analytics.trackGameEnd(room.roomId, winningTeamName, matchStats).catch(err =>
            console.error('Analytics game end error:', err)
        );
        
        broadcastGameState(room);
        return; // Stop further execution until players are ready.
    }

    // Standard end of round (not end of match)
    room.gameState.isFirstRoundOfMatch = false;
    room.gameState.matchOver = false;
    room.gameState.endMatchMessage = null;
    room.gameState.gameInitialized = false;
    room.gameState.endRoundMessage = endMessage;
    room.gameState.readyPlayers.clear();
    broadcastGameState(room);
}
/**
 * (ROUTINE) Checks if the round should end after a move has been made.
 */
function checkRoundEnd(room) {
    if (!room.gameState.gameInitialized) return;
    const connectedPlayers = room.jugadores.filter(p => p.isConnected).map(p => p.name);
    const winner = connectedPlayers.find(p => room.gameState.hands[p] && room.gameState.hands[p].length === 0);
    if (winner) { return endRound(room, { winner }); }
    const canAnyPlayerMove = connectedPlayers.some(p => hasValidMove(room, p));
    if (!canAnyPlayerMove) { return endRound(room, { blocked: true }); }
    broadcastGameState(room);
}


// =============================================================================
// == SOCKET.IO CONNECTION & EVENT LISTENERS (MODIFIED)                       ==
// =============================================================================

io.on('connection', (socket) => {

    socket.on('setPlayerName', async (data) => {
        // // console.log('🎯 Received setPlayerName data:', data);

        // Handle both old string format and new object format
        let displayName, avatarData, roomId, targetScore;

        if (typeof data === 'string') {
            displayName = data.trim().substring(0, 12).toUpperCase(); // Normalize to uppercase
            avatarData = { type: 'emoji', data: '👤' };
            roomId = null;
            targetScore = 70;
        } else if (data.avatar === null) {
            displayName = data.name.trim().substring(0, 12).toUpperCase(); // Normalize to uppercase
            avatarData = null; // Will be assigned based on player slot
            roomId = data.roomId || null;
            targetScore = data.targetScore || 70;
        } else {
            displayName = data.name.trim().substring(0, 12).toUpperCase(); // Normalize to uppercase
            avatarData = data.avatar || { type: 'emoji', data: '👤' };
            roomId = data.roomId || null;
            targetScore = data.targetScore || 70;
        }

        // // console.log('🎯 Processed - Name:', displayName, 'Avatar:', avatarData, 'Room:', roomId, 'TargetScore:', targetScore);

        if (!displayName) return;

        // Try to reconnect to existing room first
        let reconnectedToRoom = null;
        for (let [rid, room] of gameRooms) {
            const reconnectingPlayer = room.jugadores.find(
                p => p.assignedName && p.assignedName.trim() === displayName && !p.isConnected
            );
            if (reconnectingPlayer) {
                reconnectingPlayer.socketId = socket.id;
                reconnectingPlayer.isConnected = true;
                if (typeof data === 'object' && data.avatar !== undefined) {
                    reconnectingPlayer.avatar = data.avatar;
                    // // console.log(`[RECONNECT] ${displayName} reconnected to ${rid} with updated avatar ${data.avatar ? (data.avatar.type === 'emoji' ? data.avatar.data : 'custom') : 'null'}.`);
                } else {
                    // // console.log(`[RECONNECT] ${displayName} reconnected to ${rid} with existing avatar ${reconnectingPlayer.avatar ? (reconnectingPlayer.avatar.type === 'emoji' ? reconnectingPlayer.avatar.data : reconnectingPlayer.avatar.type + ':' + reconnectingPlayer.avatar.data) : 'default'}.`);
                }
                
                // Assign default avatar if none exists
                if (!reconnectingPlayer.avatar) {
                    const match = reconnectingPlayer.name.match(/\d+/);
                    const playerNumber = match ? match[0] : '1';
                    console.log(`[AVATAR] Assigning default jugador${playerNumber} avatar to reconnecting player ${displayName} (${reconnectingPlayer.name})`);
                    reconnectingPlayer.avatar = { type: 'file', data: null };
                }
                socket.jugadorName = reconnectingPlayer.name;
                socket.roomId = rid;
                socket.join(rid);
                
                const connectedCount = room.jugadores.filter(p => p.isConnected).length;
                socket.emit('playerAssigned', {
                    playerName: reconnectingPlayer.name,
                    isRoomFull: connectedCount >= 4
                });
                
                if (room.gameState.gameInitialized) {
                    const playerHand = room.gameState.hands[reconnectingPlayer.name];
                    io.to(socket.id).emit('playerHand', playerHand);
                }
                
                // Send playerCount update after reconnection
                const updatedConnectedCount = room.jugadores.filter(p => p.isConnected).length;
                io.to(room.roomId).emit('playerCount', { 
                    count: updatedConnectedCount, 
                    roomFull: updatedConnectedCount >= 4 
                });
                // // console.log(`[RECONNECT] Emitted playerCount update: ${updatedConnectedCount} players, roomFull: ${updatedConnectedCount >= 4}`);
                
                broadcastGameState(room);
                // Emit playerReconnected to all players in the room
                io.to(room.roomId).emit('playerReconnected', {
                    playerName: reconnectingPlayer.name
                });
                reconnectedToRoom = room;
                break;
            }
        }
        if (reconnectedToRoom) return;

        // Room selection logic: if roomId provided, use it or create it if missing
        let room = null;
        if (roomId) {
            if (!gameRooms.has(roomId)) {
                // Create new room with this id
                const newRoom = createGameRoom(roomId);
                gameRooms.set(roomId, newRoom);
                // // console.log(`[ROOM SYSTEM] Created new room by user: ${roomId}`);
            }
            room = gameRooms.get(roomId);
        } else {
            // Fallback to default logic
            room = findOrCreateRoom(displayName);
        }

        // Set the room's targetScore if provided (only if not already set or if this is a new room)
        // Only set targetScore if not already set (prevents last player from overwriting)
        if ((typeof room.targetScore !== 'number' || room.targetScore === 70) && typeof targetScore === 'number' && targetScore > 0) {
            room.targetScore = targetScore;
        }

        // Join the socket to the room (for socket.io room broadcasts)
        if (room && room.roomId) {
            socket.join(room.roomId);
        }

        // Check if name is already taken ONLY within this specific room
        const nameInUseInRoom = room.jugadores.find(p => p.isConnected && p.assignedName && p.assignedName.trim() === displayName);
        if (nameInUseInRoom) {
            socket.emit('gameError', { message: `Name "${displayName}" is already taken in this room. Please choose another.` });
            return;
        }

        const availableSlot = room.jugadores.find(p => !p.isConnected);
        if (availableSlot) {
            availableSlot.socketId = socket.id;
            availableSlot.isConnected = true;
            availableSlot.assignedName = displayName;
            
            // Assign default avatar based on player name if no avatar was provided
            if (avatarData === null) {
                // Use default jugador avatars since they exist and are reliable
                const match = availableSlot.name.match(/\d+/);
                const playerNumber = match ? match[0] : '1';
                
                console.log(`[AVATAR] Using default jugador${playerNumber} avatar for ${displayName} (${availableSlot.name})`);
                avatarData = { type: 'file', data: null }; // Will trigger default avatar loading on client
            }
            
            availableSlot.avatar = avatarData;
            socket.jugadorName = availableSlot.name;
            socket.roomId = room.roomId;
            socket.join(room.roomId);
            
            let currentConnectedCount = room.jugadores.filter(p => p.isConnected).length;
            
            // Send player assignment with room status
            socket.emit('playerAssigned', {
                playerName: availableSlot.name,
                isRoomFull: currentConnectedCount >= 4
            });
            
            // // console.log(`[NEW PLAYER] ${displayName} connected as ${availableSlot.name} in ${room.roomId} with avatar ${avatarData.type === 'emoji' ? avatarData.data : avatarData.type + ':' + avatarData.data}.`);

            // Track player join for analytics
            await analytics.trackPlayerJoin(
                availableSlot.name,
                room.roomId,
                displayName,
                socket.request.headers['user-agent'] || 'Unknown'
            );

            const connectedCount = room.jugadores.filter(p => p.isConnected).length;
            
            // Send player count update for waiting message management
            io.to(room.roomId).emit('playerCount', { 
                count: connectedCount, 
                roomFull: connectedCount >= 4 
            });
            
            if (connectedCount === 4 && !room.gameState.gameInitialized && !room.gameState.endRoundMessage && !room.gameState.matchOver && !room.gameState.isInitializing) {
                // // console.log(`[AUTO-START] Conditions met - starting game for ${room.roomId}`);
                room.gameState.isInitializing = true; // Prevent multiple simultaneous initializations
                // First broadcast gameState with 4 players so clients can hide waiting messages
                broadcastGameState(room);
                // Give clients a moment to process the 4-player state
                setTimeout(() => {
                    // // console.log(`[AUTO-START] Initializing round for ${room.roomId}`);
                    room.gameState.isFirstRoundOfMatch = true;
                    initializeRound(room);
                }, 100);
            } else {
                // // console.log(`[AUTO-START] Conditions NOT met for ${room.roomId}:`, {
                // connectedCount,
                //  gameInitialized: room.gameState.gameInitialized,
                //  endRoundMessage: room.gameState.endRoundMessage,
                //   matchOver: room.gameState.matchOver,
                //isInitializing: room.gameState.isInitializing
                //  });
                
                // If game is already initialized, check if this player needs tiles
                if (room.gameState.gameInitialized) {
                    // // // console.log(`[RECONNECT] Checking if ${availableSlot.name} needs tiles in initialized game`);
                    // // console.log(`[RECONNECT] Current hands for ${availableSlot.name}:`, room.gameState.hands[availableSlot.name]);
                    
                    if (!room.gameState.hands[availableSlot.name] || room.gameState.hands[availableSlot.name].length === 0) {
                        // // console.log(`[RECONNECT] Dealing tiles to ${availableSlot.name} who rejoined initialized game`);
                        
                        // Generate fresh dominoes and deal to this player only
                        let dominoesPool = generateDominoes();
                        shuffleArray(dominoesPool);
                        room.gameState.hands[availableSlot.name] = dominoesPool.splice(0, 7);
                        
                        // Send tiles to this specific player
                        socket.emit('playerHand', room.gameState.hands[availableSlot.name]);
                        // // console.log(`[RECONNECT] Dealt ${room.gameState.hands[availableSlot.name].length} tiles to ${availableSlot.name}`);
                    } else {
                        // // console.log(`[RECONNECT] ${availableSlot.name} already has ${room.gameState.hands[availableSlot.name].length} tiles`);
                        // Send existing tiles to the reconnecting player
                        socket.emit('playerHand', room.gameState.hands[availableSlot.name]);
                        // // console.log(`[RECONNECT] Resent existing ${room.gameState.hands[availableSlot.name].length} tiles to ${availableSlot.name}`);
                    }
                }
                
                broadcastGameState(room);
            }
        } else {
            socket.emit('gameError', { message: 'Room is full. Looking for another room...' });
            socket.disconnect();
        }
    });
    
    // Handle animation requests - broadcast to all players in the room
    socket.on('playTileAnimation', (data) => {
        const room = findPlayerRoom(socket.id);
        if (!room) return;
        
        // Broadcast animation to all players in the room
        room.jugadores.forEach(jugador => {
            if (jugador.isConnected && jugador.socketId) {
                io.to(jugador.socketId).emit('playTileAnimation', data);
            }
        });
    });
    
    socket.on('placeTile', async ({ tile, position }) => {
        const room = findPlayerRoom(socket.id);
        if (!room) return;
        
        const player = socket.jugadorName;
        if (!room.gameState.gameInitialized || room.gameState.currentTurn !== player) return;
        const hand = room.gameState.hands[player];
        
        const tileIndex = hand.findIndex(t => (t.left === tile.left && t.right === tile.right) || (t.left === tile.right && t.right === tile.left));
        if (tileIndex === -1) return;
        
        let validMove = false;
        let playedTileForHighlight = null; 

        if (room.gameState.isFirstMove) {
            if (room.gameState.isFirstRoundOfMatch && (tile.left !== 6 || tile.right !== 6)) {
                return socket.emit('gameError', { message: 'Primera ficha debe ser 6|6!' });
            } else if (room.gameState.isAfterTiedBlockedGame) {
                // After tied blocked game: player with double 6 can play any tile
                // // console.log(`[TIE RULE] ${player} playing any tile after tied blocked game: ${tile.left}|${tile.right}`);
            }
            const firstTile = hand[tileIndex];
            room.gameState.board.push(firstTile);
            room.gameState.leftEnd = firstTile.left;
            room.gameState.rightEnd = firstTile.right;
            room.gameState.spinnerTile = firstTile;
            playedTileForHighlight = firstTile;
            validMove = true;
            room.gameState.isFirstMove = false;
            // Reset the tied blocked game flag after first move
            room.gameState.isAfterTiedBlockedGame = false;
        } else {
            const playedTile = hand[tileIndex];
            if (position === 'left' && (playedTile.left === room.gameState.leftEnd || playedTile.right === room.gameState.leftEnd)) {
                const oriented = playedTile.right === room.gameState.leftEnd ? playedTile : { left: playedTile.right, right: playedTile.left };
                room.gameState.board.unshift(oriented);
                room.gameState.leftEnd = oriented.left;
                playedTileForHighlight = oriented;
                validMove = true;
            } else if (position === 'right' && (playedTile.left === room.gameState.rightEnd || playedTile.right === room.gameState.rightEnd)) {
                const oriented = playedTile.left === room.gameState.rightEnd ? playedTile : { left: playedTile.right, right: playedTile.left };
                room.gameState.board.push(oriented);
                room.gameState.rightEnd = oriented.right;
                playedTileForHighlight = oriented;
                validMove = true;
            }
        }
        if (validMove) {
            hand.splice(tileIndex, 1);
            room.gameState.lastPlayedTile = playedTileForHighlight;
            socket.emit('playerHand', room.gameState.hands[player]);
            socket.emit('moveSuccess', { tile: playedTileForHighlight });
            
            // Broadcast tile placement sound to ALL players in room
            room.jugadores.forEach(p => {
                if (p.isConnected && p.socketId) {
                    io.to(p.socketId).emit('tilePlaced', { 
                        playerName: player, 
                        tile: playedTileForHighlight 
                    });
                }
            });
            
            // Track tile placement for analytics
            await analytics.trackTilePlaced(
                room.roomId,
                player,
                playedTileForHighlight,
                position
            );
            
            nextTurn(room);
            checkRoundEnd(room);
        } else {
            // Invalid move - send error to the player who made the move
            socket.emit('gameError', { message: 'Jugada inválida!' });
        }
    });

    socket.on('passTurn', () => {
        const room = findPlayerRoom(socket.id);
        if (!room) return;
        
        const player = socket.jugadorName;
        if (!room.gameState.gameInitialized || room.gameState.currentTurn !== player || hasValidMove(room, player)) return;
        
        // Broadcast pass turn sound to ALL players in room
        room.jugadores.forEach(p => {
            if (p.isConnected && p.socketId) {
                io.to(p.socketId).emit('playerPassed', { 
                    playerName: player 
                });
            }
        });
        
        nextTurn(room);
        checkRoundEnd(room);
    });

    socket.on('playerReadyForNewRound', () => {
        const room = findPlayerRoom(socket.id);
        if (!room || !socket.jugadorName) return;
        
        room.gameState.readyPlayers.add(socket.jugadorName);
        broadcastGameState(room);

        const connectedPlayers = room.jugadores.filter(p => p.isConnected);
        if (room.gameState.readyPlayers.size === connectedPlayers.length && connectedPlayers.length === 4) { // Ensure 4 players are ready
            if (room.gameState.matchOver) {
                // --- RESET STATE FOR NEW MATCH ---
                const savedPlayerStats = { ...room.gameState.playerStats };
                const nextMatchNumber = room.gameState.matchNumber + 1;
                const lastWinnerOfMatch = room.gameState.lastWinner;

                const newGameState = createNewGameState();
                newGameState.playerStats = savedPlayerStats;
                newGameState.matchNumber = nextMatchNumber;
                newGameState.lastWinner = lastWinnerOfMatch;
                newGameState.isFirstRoundOfMatch = true; 
                room.gameState = newGameState;
            }

            room.gameState.readyPlayers.clear();
            initializeRound(room);
        }
    });

// Add this to your server.js socket event handlers
socket.on('voiceMessage', async (data) => {
    const room = findPlayerRoom(socket.id);
    if (!room) return;
    
    // Track voice message for analytics
    await analytics.trackVoiceMessage(room.roomId, data.sender);
    
    // Broadcast voice message to all other players in room
    room.jugadores.forEach(p => {
        if (p.isConnected && p.socketId && p.socketId !== socket.id) {
            io.to(p.socketId).emit('voiceMessage', {
                audio: data.audio,
                sender: data.sender,
                timestamp: data.timestamp
            });
        }
    });
});

    socket.on('restartGame', () => {
        const room = findPlayerRoom(socket.id);
        if (!room) return;
        
        const player = room.jugadores.find(p => p.socketId === socket.id);
        if (!player) return;

        // // console.log(`[RESTART GAME] ${player.assignedName || player.name} initiated game restart in ${room.roomId}.`);
        
        // Reset all game state while keeping connected players
        const connectedPlayers = room.jugadores.filter(p => p.isConnected);
        
        // Create fresh game state
        room.gameState = createNewGameState();
        
        // Preserve player connections but reset their assigned names
        connectedPlayers.forEach(p => {
            room.gameState.playerStats[p.name] = { matchesWon: 0 };
        });
        
        // Clear ready players
        room.gameState.readyPlayers.clear();
        
        // Broadcast restart message to room
        room.jugadores.forEach(p => {
            if (p.isConnected && p.socketId) {
                io.to(p.socketId).emit('gameRestarted', { 
                    message: `${player.assignedName || player.name} reinició el juego`,
                    restartedBy: player.assignedName || player.name
                });
            }
        });
        
        // Broadcast fresh game state
        broadcastGameState(room);
        
        // Start a new round if we have 4 players
        if (connectedPlayers.length === 4) {
            setTimeout(() => {
                initializeRound(room);
            }, 2000); // Give players 2 seconds to see the restart message
        }
    });

    socket.on('chatMessage', (msg) => {
        const room = findPlayerRoom(socket.id);
        if (!room) return;
        
        const player = room.jugadores.find(p => p.socketId === socket.id);
        if (player && msg) {
            // Broadcast to all players in room
            room.jugadores.forEach(p => {
                if (p.isConnected && p.socketId) {
                    io.to(p.socketId).emit('chatMessage', { 
                        sender: player.assignedName || player.name, 
                        message: msg.substring(0, 100) 
                    });
                }
            });
        }
    });

    socket.on('leaveGame', (data) => {
        // console.log(`[LEAVE GAME] Received leaveGame event from socket ${socket.id}`);
        // console.log(`[LEAVE GAME] Data received:`, data);
        // console.log(`[LEAVE GAME] Player ${data.playerName} (${data.playerId}) requesting to leave room ${data.roomCode}`);
        
        const room = gameRooms.get(data.roomCode);
        if (!room) {
            // console.log('[LEAVE GAME] Room not found in gameRooms');
            // console.log('[LEAVE GAME] Available rooms:', Array.from(gameRooms.keys()));
            socket.emit('leaveGameResponse', { success: false, message: 'Room not found' });
            return;
        }

        const playerSlot = room.jugadores.find(p => p.socketId === socket.id);
        if (!playerSlot) {
            // console.log('[LEAVE GAME] Player not found in room');
            socket.emit('leaveGameResponse', { success: false, message: 'Player not found in room' });
            return;
        }

        // Mark player as disconnected
        playerSlot.socketId = null;
        playerSlot.isConnected = false;
        room.gameState.readyPlayers.delete(playerSlot.name);

        // console.log(`[LEAVE GAME] ${playerSlot.name} (${playerSlot.assignedName}) left room ${room.roomId}`);

        // Notify all players in the room (including disconnected ones)
        room.jugadores.forEach(p => {
            if (p.socketId) {
                io.to(p.socketId).emit('playerLeft', {
                    playerName: playerSlot.assignedName || playerSlot.name,
                    remainingPlayers: room.jugadores.filter(j => j.isConnected).length
                });
            }
        });

        // Send success response to leaving player
        socket.emit('leaveGameResponse', { 
            success: true, 
            message: 'Successfully left the game',
            redirect: true
        });

        // Clean up room if empty
        const connectedPlayers = room.jugadores.filter(p => p.isConnected);
        const connectedCount = connectedPlayers.length;
        if (connectedCount === 0) {
            // console.log(`[CLEANUP] Room ${room.roomId} is empty, removing...`);
            gameRooms.delete(room.roomId);
        } else {
            // Update room state for remaining players
            connectedPlayers.forEach(p => {
                if (p.socketId) {
                    io.to(p.socketId).emit('gameStateUpdate', {
                        jugadoresInfo: room.gameState.jugadoresInfo,
                        currentPlayer: room.gameState.currentPlayer,
                        gamePhase: room.gameState.gamePhase
                    });
                }
            });
        }
    });
    
    socket.on('disconnect', () => {
        const room = findPlayerRoom(socket.id);
        if (!room) return;
        
        const playerSlot = room.jugadores.find(p => p.socketId === socket.id);
        if (playerSlot) {
            // console.log(`[DISCONNECTED] ${playerSlot.name} (${playerSlot.assignedName}) from ${room.roomId}.`);
            playerSlot.socketId = null;
            playerSlot.isConnected = false;
            room.gameState.readyPlayers.delete(playerSlot.name);
            
            const connectedCount = room.jugadores.filter(p => p.isConnected).length;
            
            // Send updated player count for waiting message management
            io.to(room.roomId).emit('playerCount', { 
                count: connectedCount, 
                roomFull: connectedCount >= 4 
            });
            
            if (connectedCount < 4 && room.gameState.gameInitialized) {
                // If a player disconnects mid-game, pause or handle accordingly
                // console.log(`[SERVER] A player disconnected mid-game in ${room.roomId}. Pausing.`);
                // For now, we just update clients. A more robust solution could pause the turn timer.
                broadcastGameState(room);
            } else if (connectedCount === 0) {
                // console.log(`[SERVER] All players disconnected from ${room.roomId}. Removing room.`);
                gameRooms.delete(room.roomId);
            } else {
                broadcastGameState(room);
            }
        }
    });
});


// =============================================================================
// == START THE SERVER                                                        ==
// =============================================================================

// Add endpoint to save custom avatars as files
app.post('/save-avatar', express.json({ limit: '1mb' }), (req, res) => {
    const { playerName, avatarData } = req.body;
    
    if (!playerName || !avatarData) {
        return res.status(400).json({ error: 'Missing playerName or avatarData' });
    }
    
    // Extract the base64 image data
    const matches = avatarData.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'Invalid image data format' });
    }
    
    const imageType = matches[1]; // jpg, png, etc.
    const imageBuffer = Buffer.from(matches[2], 'base64');
    
    // Create avatars directory structure if it doesn't exist
    const iconsDir = path.join(__dirname, 'assets', 'icons');
    if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
        console.log(`📁 Created avatars directory: ${iconsDir}`);
    }
    
    // Create the filename using uppercase for consistency (matches dynamic generation)
    const filename = `${playerName.toUpperCase()}_avatar.jpg`;
    
    try {
        // Save using the new storage system
        saveAvatar(filename, imageBuffer);
        
        console.log(`✅ Avatar saved to memory storage: ${filename}`);
        res.json({ success: true, filename: filename });
    } catch (error) {
        console.error('Error saving avatar:', error);
        res.status(500).json({ error: 'Failed to save avatar' });
    }
});

// Debug endpoint to list avatar files (remove after testing)
app.get('/debug/avatars', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const iconsDir = global.AVATAR_ICONS_PATH || path.join(__dirname, 'assets', 'icons');
        const defaultsDir = global.AVATAR_DEFAULTS_PATH || path.join(__dirname, 'assets', 'defaults');
        
        // Get avatar files from memory storage or disk
        let iconFiles = listAvatars();
        let defaultFiles = [];
        
        if (fs.existsSync(defaultsDir)) {
            defaultFiles = fs.readdirSync(defaultsDir).filter(file => file.includes('avatar'));
        }
        
        res.json({ 
            success: true, 
            avatarFiles: iconFiles.sort(),
            defaultFiles: defaultFiles.sort(),
            iconsDirExists: fs.existsSync(iconsDir),
            defaultsDirExists: fs.existsSync(defaultsDir),
            iconsPath: iconsDir,
            defaultsPath: defaultsDir,
            serverInfo: {
                platform: process.platform,
                nodeVersion: process.version,
                workingDir: process.cwd()
            }
        });
    } catch (error) {
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Test endpoint for default avatar accessibility
app.get('/test/default-avatar/:playerNumber', (req, res) => {
    const playerNumber = req.params.playerNumber;
    const avatarPath = path.join(__dirname, 'assets', 'defaults', `jugador${playerNumber}_avatar.jpg`);
    
    if (fs.existsSync(avatarPath)) {
        res.sendFile(avatarPath);
    } else {
        res.status(404).json({ 
            error: 'Default avatar not found',
            requestedPath: avatarPath,
            playerNumber: playerNumber
        });
    }
});

// Endpoint to submit suggestions
app.post('/submit-suggestion', express.json({ limit: '1mb' }), (req, res) => {
    try {
        const { suggestion, timestamp, userAgent, language } = req.body;
        
        if (!suggestion || suggestion.trim().length < 10) {
            return res.status(400).json({ 
                success: false, 
                error: 'Suggestion must be at least 10 characters long' 
            });
        }
        
        // Create suggestions directory if it doesn't exist
        const suggestionsDir = path.join(__dirname, 'suggestions');
        if (!fs.existsSync(suggestionsDir)) {
            fs.mkdirSync(suggestionsDir, { recursive: true });
        }
        
        // Create suggestion object
        const suggestionData = {
            id: Date.now().toString(),
            suggestion: suggestion.trim().substring(0, 500),
            timestamp: timestamp || new Date().toISOString(),
            userAgent: userAgent || 'Unknown',
            language: language || 'Unknown',
            ip: req.ip || req.connection.remoteAddress || 'Unknown'
        };
        
        // Save to daily file
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = path.join(suggestionsDir, `suggestions-${date}.json`);
        
        let suggestions = [];
        if (fs.existsSync(filename)) {
            try {
                const existingData = fs.readFileSync(filename, 'utf8');
                suggestions = JSON.parse(existingData);
            } catch (error) {
                console.error('Error reading existing suggestions:', error);
                suggestions = [];
            }
        }
        
        suggestions.push(suggestionData);
        
        // Write back to file
        fs.writeFileSync(filename, JSON.stringify(suggestions, null, 2));
        
        // console.log(`📝 New suggestion saved: ${suggestionData.id}`);
        // console.log(`💡 Suggestion preview: "${suggestion.substring(0, 50)}${suggestion.length > 50 ? '...' : ''}"`);
        
        // Track suggestion for analytics if available
        if (analytics && analytics.trackSuggestion) {
            analytics.trackSuggestion(suggestionData.id, suggestion.length)
                .catch(err => console.error('Analytics suggestion tracking error:', err));
        }
        
        res.json({ 
            success: true, 
            message: 'Suggestion saved successfully',
            id: suggestionData.id 
        });
        
    } catch (error) {
        console.error('Error saving suggestion:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Endpoint to view suggestions (for admin/developer)
app.get('/suggestions', (req, res) => {
    try {
        const suggestionsDir = path.join(__dirname, 'suggestions');
        
        if (!fs.existsSync(suggestionsDir)) {
            return res.json({ suggestions: [], message: 'No suggestions directory found' });
        }
        
        const files = fs.readdirSync(suggestionsDir)
            .filter(file => file.startsWith('suggestions-') && file.endsWith('.json'))
            .sort()
            .reverse(); // Most recent first
        
        let allSuggestions = [];
        
        files.forEach(file => {
            try {
                const filepath = path.join(suggestionsDir, file);
                const data = fs.readFileSync(filepath, 'utf8');
                const suggestions = JSON.parse(data);
                allSuggestions = allSuggestions.concat(suggestions);
            } catch (error) {
                console.error(`Error reading suggestions file ${file}:`, error);
            }
        });
        
        // Sort by timestamp, most recent first
        allSuggestions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Create simple HTML response
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>DominoM - Buzón de Sugerencias</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
                .header { background: #28a745; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .suggestion { background: white; border-left: 4px solid #28a745; margin: 10px 0; padding: 15px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .meta { color: #666; font-size: 12px; margin-bottom: 10px; }
                .text { color: #333; line-height: 1.4; }
                .stats { background: #e9ecef; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                .no-suggestions { text-align: center; color: #666; font-style: italic; padding: 40px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🎯 DominoM - Buzón de Sugerencias</h1>
                <p>Feedback y sugerencias de los usuarios</p>
            </div>
            
            <div class="stats">
                <strong>📊 Estadísticas:</strong> ${allSuggestions.length} sugerencias totales
                ${files.length > 0 ? ` | Archivos: ${files.length} días` : ''}
            </div>
        `;
        
        if (allSuggestions.length === 0) {
            html += '<div class="no-suggestions">📭 No hay sugerencias aún</div>';
        } else {
            allSuggestions.forEach((suggestion, index) => {
                const date = new Date(suggestion.timestamp).toLocaleString('es-ES');
                html += `
                <div class="suggestion">
                    <div class="meta">
                        📅 ${date} | 🆔 ${suggestion.id} | 🌍 ${suggestion.language} | 💻 ${suggestion.userAgent ? suggestion.userAgent.substring(0, 50) + '...' : 'Unknown'}
                    </div>
                    <div class="text">${suggestion.suggestion}</div>
                </div>
                `;
            });
        }
        
        html += `
            <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
                🔄 Página actualizada automáticamente cada 30 segundos
                <script>setTimeout(() => location.reload(), 30000);</script>
            </div>
        </body>
        </html>
        `;
        
        res.send(html);
        
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        res.status(500).json({ success: false, error: 'Error fetching suggestions' });
    }
});

// =============================================================================
// == ANALYTICS LOGGING                                                       ==
// =============================================================================

// Log daily stats every 24 hours
setInterval(async () => {
    try {
        const dailyStats = analytics.getDailySummary();
        // console.log('📊 Daily Stats:', dailyStats);
    } catch (error) {
        console.error('Analytics daily stats error:', error);
    }
}, 24 * 60 * 60 * 1000); // Every 24 hours

// Log quick stats every hour
setInterval(async () => {
    try {
        const quickStats = await analytics.getQuickStats();
        // console.log('📊 Hourly Update:', quickStats.today);
    } catch (error) {
        console.error('Analytics hourly stats error:', error);
    }
}, 60 * 60 * 1000); // Every hour

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`[SERVER] Server listening on port ${PORT}`));