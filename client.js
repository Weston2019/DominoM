// =============================================================================
// == FINAL LABELED client.js    DominoM - August 27 by DAM Productions        ==
// =============================================================================
// This file handles all client-side logic, including rendering the game with
// p5.js, communicating with the server via Socket.IO, and managing user input.
// =============================================================================


// GLOBAL VARIABLE DECLARATIONS
let isSpanish = false;
let socket;
let myJugadorName;
let myPlayerHand = [];
let gameState = {};
let avatarCache = {}; // Cache to prevent repeated avatar loading attempts
let selectedTileIndex = null;
let messageDisplay = { text: '', time: 0 };
let tileSound;
let lastPlayedHighlight = { tile: null, timestamp: 0 };
let dialogShownTimestamp = 0;
let passSound;
let winSound;
let waitingSound;
let playerPointsWon = {};
let previousTeamScores = { teamA: 0, teamB: 0 };
let isAnimating = false;
let animatingTile = null;
let animationStartTime = 0;
let animationDuration = 1000;
let animationPauseDuration = 500;

// =============================================================================
// == PWA AUTO-INSTALL PROMPT FOR MOBILE                                      ==
// =============================================================================

let deferredPrompt;

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('🎯 beforeinstallprompt event fired!');
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    window.deferredPrompt = e; // Also make it globally accessible
    // Show our custom install banner
    showInstallBanner();
});

// Also listen for any errors
window.addEventListener('error', (e) => {
    console.log('PWA Error:', e.message);
});

// Check PWA criteria on page load
window.addEventListener('load', () => {
    setTimeout(() => {
        console.log('=== PWA Status Check ===');
        console.log('Location:', window.location.href);
        console.log('Protocol:', location.protocol);
        console.log('Service Worker registered:', 'serviceWorker' in navigator);
        console.log('beforeinstallprompt fired:', !!deferredPrompt);
        console.log('Mobile width:', window.innerWidth <= 768);
        
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('✅ App is already installed and running in standalone mode');
        } else {
            // If no beforeinstallprompt after 3 seconds, show fallback banner for localhost/iOS
            if (!deferredPrompt && (location.hostname === 'localhost' || /iPad|iPhone|iPod/.test(navigator.userAgent))) {
                console.log('🍎 Showing iOS/localhost fallback install banner');
                showFallbackInstallBanner();
            }
        }
    }, 3000); // Wait 3 seconds for beforeinstallprompt
});

function showInstallBanner() {
    // Only show on mobile devices
    if (window.innerWidth <= 768 && !localStorage.getItem('installBannerDismissed')) {
        const banner = document.createElement('div');
        banner.id = 'install-banner';
        banner.style.cssText = `
            position: fixed; 
            top: 0; 
            left: 0; 
            right: 0; 
            z-index: 10000;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white; 
            padding: 12px; 
            text-align: center;
            font-family: Arial, sans-serif; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            animation: slideDown 0.3s ease-out;
        `;
        
        banner.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px;">
                <span style="font-size: 14px; font-weight: 500;">🎲 Install Domino Game for the best experience!</span>
                <div>
                    <button onclick="installApp()" style="
                        background: white; 
                        color: #4CAF50; 
                        border: none; 
                        padding: 8px 16px; 
                        border-radius: 20px; 
                        cursor: pointer; 
                        font-weight: bold;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    ">Install</button>
                    <button onclick="dismissBanner()" style="
                        background: transparent; 
                        color: white; 
                        border: 1px solid white; 
                        padding: 6px 12px; 
                        margin-left: 8px; 
                        border-radius: 15px; 
                        cursor: pointer;
                    ">Maybe later</button>
                </div>
            </div>
        `;
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(banner);
        
        // Auto-dismiss after 10 seconds if user doesn't interact
        setTimeout(() => {
            if (document.getElementById('install-banner')) {
                dismissBanner();
            }
        }, 10000);
    }
}

// Fallback install banner for iOS Safari and localhost testing
function showFallbackInstallBanner() {
    if (window.innerWidth <= 768 && !localStorage.getItem('installBannerDismissed')) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const banner = document.createElement('div');
        banner.id = 'install-banner';
        banner.style.cssText = `
            position: fixed; 
            top: 0; 
            left: 0; 
            right: 0; 
            z-index: 10000;
            background: linear-gradient(135deg, #FF6B35, #F7931E);
            color: white; 
            padding: 16px; 
            text-align: center;
            font-family: Arial, sans-serif; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            animation: slideDown 0.5s ease-out;
            border-bottom: 3px solid #fff;
        `;
        
        if (isIOS) {
            banner.innerHTML = `
                <div style="max-width: 350px; margin: 0 auto;">
                    <div style="font-size: 16px; font-weight: bold; margin-bottom: 12px;">
                        🎲 ${window.lang ? window.lang.t('pwa_install_title') : '¡Instala DominoM para la Mejor Experiencia!'}
                    </div>
                    <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                        <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">📱 ${window.lang ? window.lang.t('pwa_install_steps') : 'Instalación en 3 Pasos Fáciles:'}</div>
                        <div style="font-size: 13px; line-height: 1.4; text-align: left;">
                            <div style="margin-bottom: 6px;"><strong>1.</strong> ${window.lang ? window.lang.t('pwa_step_1') : 'Toca el botón <strong>Compartir ↗️</strong> abajo'}</div>
                            <div style="margin-bottom: 6px;"><strong>2.</strong> ${window.lang ? window.lang.t('pwa_step_2') : 'Desliza y toca <strong>"Añadir a Pantalla de Inicio"</strong>'}</div>
                            <div><strong>3.</strong> ${window.lang ? window.lang.t('pwa_step_3') : 'Toca <strong>"Añadir"</strong> para confirmar'}</div>
                        </div>
                    </div>
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 12px;">
                        ✨ ${window.lang ? window.lang.t('pwa_benefits') : '¡Pantalla completa, carga más rápida y funciona sin internet!'}
                    </div>
                    <button onclick="dismissBanner()" style="
                        background: rgba(255,255,255,0.2); 
                        color: white; 
                        border: 2px solid white; 
                        padding: 8px 16px; 
                        border-radius: 20px; 
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 600;
                    ">${window.lang ? window.lang.t('pwa_later_button') : 'Lo haré después'}</button>
                </div>
            `;
        } else {
            banner.innerHTML = `
                <div style="max-width: 350px; margin: 0 auto;">
                    <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">
                        🎲 ${window.lang ? window.lang.t('pwa_android_title') : '¡Instala la App DominoM!'}
                    </div>
                    <div style="font-size: 13px; margin-bottom: 12px;">
                        ${window.lang ? window.lang.t('pwa_android_instruction') : 'Busca el botón "Instalar" en el menú de tu navegador o barra de direcciones'}
                    </div>
                    <button onclick="dismissBanner()" style="
                        background: transparent; 
                        color: white; 
                        border: 1px solid white; 
                        padding: 6px 12px; 
                        border-radius: 15px; 
                        cursor: pointer;
                        font-size: 12px;
                    ">${window.lang ? window.lang.t('pwa_got_it') : 'Entendido'}</button>
                </div>
            `;
        }
        
        document.body.appendChild(banner);
        
        // Auto-dismiss after 20 seconds for fallback banner (longer for instructions)
        setTimeout(() => {
            if (document.getElementById('install-banner')) {
                dismissBanner();
            }
        }, 20000);
    }
}

// Install the app when user clicks install
window.installApp = function() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((result) => {
            if (result.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
            dismissBanner();
        });
    }
};

// Dismiss the install banner
window.dismissBanner = function() {
    const banner = document.getElementById('install-banner');
    if (banner) {
        banner.style.animation = 'slideDown 0.3s ease-out reverse';
        setTimeout(() => {
            banner.remove();
        }, 300);
    }
    // Remember user dismissed it for this session
    localStorage.setItem('installBannerDismissed', 'true');
};

// Listen for app installed event
window.addEventListener('appinstalled', (evt) => {
    console.log('Domino game was installed');
    dismissBanner();
});

// Clear the dismiss flag when app is actually installed
window.addEventListener('beforeunload', () => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
        localStorage.removeItem('installBannerDismissed');
    }
});

// =============================================================================
let animationStartPos = { x: 0, y: 0 };
let animationEndPos = { x: 0, y: 0 };
let animationProgress = 0;
let animatingPlayerName = null;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// FUNCTION DECLARATIONS
function fetchAndShowRooms() {
    fetch('/active-rooms')
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('available-rooms');
            if (!container) return;
            if (!data.rooms || data.rooms.length === 0) {
                container.innerHTML = `<span style="color:#888;">${window.lang.t('no_active_rooms')}</span>`;
                return;
            }
            container.innerHTML = `<b>${window.lang.t('available_rooms')}</b> ` + data.rooms.map(room => {
                const isFull = room.connectedCount >= 4;
                const roomLabel = room.roomId.replace(' ', '-');
                if (isFull) {
                    return `<span class="room-chip room-full" data-room="${room.roomId}" style="background:#888;color:#fff;opacity:0.5;cursor:not-allowed;pointer-events:none;">${roomLabel} (${window.lang.t('room_full')})</span>`;
                } else {
                    return `<span class="room-chip" data-room="${room.roomId}">${roomLabel} (${room.connectedCount}/4)</span>`;
                }
            }).join(' ');
            // Add click handler to fill room input
            Array.from(container.getElementsByClassName('room-chip')).forEach(el => {
                if (!el.classList.contains('room-full')) {
                    el.onclick = function() {
                        const roomId = this.getAttribute('data-room');
                        // console.log('🔍 ROOM DEBUG - Room chip clicked, roomId:', roomId);
            
                        const input = document.getElementById('room-input');
                        if (input) {
                            input.value = roomId;
                            // console.log('🔍 ROOM DEBUG - Room input set to:', input.value);
                        }
                    };
                }
            });
        });
}

function setupButtonListeners() {
        if (typeof setupGameButtons === 'function') {
                setupGameButtons();
        }
}

// Listen for player reconnected event (custom event from server)
document.addEventListener('DOMContentLoaded', function() {
        fetchAndShowRooms();
        if (typeof socket !== 'undefined' && socket) {
                socket.on('playerReconnected', (data) => {
                        showSystemMessage(isSpanish ?
                                `${data.playerName} ha vuelto a conectarse` :
                                `${data.playerName} has reconnected`, 'success');
                        if (typeof waitingSound !== 'undefined' && waitingSound && waitingSound.isLoaded()) {
                                waitingSound.play();
                        }
                });
        }
});


// =============================================================================
// == LANGUAGE MANAGER FOR INTERNATIONALIZATION                               ==
// =============================================================================

class LanguageManager {
    constructor() {
        this.currentLanguage = this.loadSavedLanguage() || 'es'; // Default to Spanish
        this.translations = {
            es: {
                // Room Selection
                'no_active_rooms': 'No hay salas activas',
                'available_rooms': 'Salas Disponibles:',
                'room_full': 'Salon Lleno',
                
                // Game Actions
                'your_turn': 'Su turno',
                'waiting_for_others': 'Esperando por los demás...',
                'waiting_for_players': 'Esperando que se conecten 4 jugadores para comenzar...',
                'all_players_connected': 'Todos los jugadores conectados. Iniciando juego...',
                'players_connected': 'jugadores conectados',
                'connecting': 'Conectando...',
                'start_new_hand': 'Empezar Mano Nueva',
                'start_new_match': 'Jugar Match Nuevo',
                'pass_turn': 'Pasar',
                'has_valid_move': 'Tiene jugada válida, no puede pasar!',
                
                // Game States
                'game_closed': 'Juego Cerrado!',
                'no_valid_moves': 'No quedan jugadas válidas',
                'players_with_tiles': 'Jugadores con fichas:',
                'game_over': 'Juego Terminado',
                'hand_finished': 'Mano Finalizada',
                'game_restarted': 'Juego reiniciado por',
                
                // UI Elements
                'points': 'PUNTOS',
                'player': 'Jugador',
                'team': 'Equipo',
                'system': 'SISTEMA',
                'you': 'Tú',
                'your_turn_any_tile': 'Su turno! Puedes jugar cualquier ficha (tienes el doble 6)',
                'to': 'a',
                
                // Settings & Avatar
                'enter_name_save_avatar': 'Ingrese su nombre para guardar avatar permanentemente!',
                'avatar_saved': 'Avatar guardado permanentemente como',
                'image_too_large': 'Imagen muy grande! Por favor elija una imagen menor a 500KB.',
                'points_cleared': 'Puntos borrados! La tabla PUNTOS ahora debe mostrar 0 para todos los jugadores.',
                
                // Language Selection
                'select_language': 'Idioma',
                'spanish': 'Español',
                'english': 'English',
                'language_changed': 'Idioma cambiado a Español',
                
                // HTML Interface Elements
                'suggestions_box': 'Buzón de Sugerencias',
                'suggestions_box_short': 'Buzón',
                'close_suggestions': 'Cerrar Sugerencias',
                'help_us_improve': 'Ayúdanos a Mejorar',
                'share_ideas_placeholder': 'Comparte tus ideas, sugerencias o reporta problemas...',
                'please_write_suggestion': 'Por favor escribe una sugerencia',
                'suggestion_too_short': 'La sugerencia debe tener al menos 10 caracteres',
                'sending_suggestion': 'Enviando sugerencia...',
                'suggestion_sent': '¡Sugerencia enviada! Gracias por tu ayuda',
                'suggestion_error': 'Error al enviar. Inténtalo más tarde',
                'connection_error': 'Error de conexión. Inténtalo más tarde',
                'send': 'Enviar',
                'cancel': 'Cancelar',
                'create_profile': 'Crear Su Perfil',
                'game_rules': 'DominoM - Reglas del Juego',
                'select_avatar': 'Seleccione Su Avatar',
                'upload_own_image': 'O Suba Su Propia Imagen',
                'select_file': 'Seleccionar Archivo',
                'name_placeholder': 'Su Nombre o Iniciales',
                'room_placeholder': 'Sala nombre(opcional)',
                'score_label': 'Puntaje:',
                'enter_game': 'Entrar al Juego',
                'clear_saved_profile': 'Borrar Perfil Guardado',
                'restart_game': 'Reiniciar Juego',
                'leave_game': 'Salir del Juego',
                'leave_game_short': 'Salir',
                'leave_game_confirm': '¿Estás seguro de que quieres salir de este juego?',
                'left': 'Izquierda',
                'right': 'Derecha',
                'step': 'Paso',
                'press_and_speak': 'Presione y hable',
                'type_message_placeholder': 'Type a message...',
                'close': 'Cerrar',
                
                // Game Rules (Spanish)
                'game_rules_title': 'DominoM - Reglas del Juego',
                'rule_1': 'El juego es para 4 jugadores en equipos de 2.',
                'rule_2': 'El juego empieza cuando los 4 jugadores esten inscritos',
                'rule_3': 'El juego se encarga de rotar las parejas despues de cada match',
                'rule_4': 'Cada jugador recibe 7 fichas de dominó.',
                'rule_5': 'El jugador con el doble 6 inicia la partida.',
                'rule_6': 'Los turnos son en sentido contra del reloj.',
                'rule_7': 'Debe colocar una ficha que coincida con los extremos del tablero.',
                'rule_8': 'Si no puede jugar, debe pasar su turno.',
                'rule_9': 'Gana la mano el primer equipo en quedarse sin fichas, o el equipo con menos puntos si el juego se cierra.',
                'rule_10': 'Si hay cierre y empate en puntos, nadie gana y sale el que tenga el doble 6 en la proxima mano',
                'rule_11': 'El primer equipo en alcanzar el puntaje (70) objetivo gana el juego, este valor se puede cambiar al registrarse.',
                'rule_12': 'Usted puede crear su propio salon de juego o unirse a uno existente.',
                'rules_footer': 'Consulte las reglas completas con el organizador o en línea.',
                
                // Table Headers and Scoreboards
                'team_score': 'Marcador de Equipos',
                'match_score': 'Puntuación del Match',
                'matches_won': 'Matches Ganados',
                
                // PWA Install Banner (Spanish)
                'pwa_install_title': '¡Instala DominoM para la Mejor Experiencia!',
                'pwa_install_steps': 'Instalación en 3 Pasos Fáciles:',
                'pwa_step_1': 'Toca el botón <strong>Compartir ↗️</strong> abajo',
                'pwa_step_2': 'Desliza y toca <strong>"Añadir a Pantalla de Inicio"</strong>',
                'pwa_step_3': 'Toca <strong>"Añadir"</strong> para confirmar',
                'pwa_benefits': '¡Pantalla completa, carga más rápida y funciona sin internet!',
                'pwa_later_button': 'Lo haré después',
                'pwa_android_title': '¡Instala la App DominoM!',
                'pwa_android_instruction': 'Busca el botón "Instalar" en el menú de tu navegador o barra de direcciones',
                'pwa_got_it': 'Entendido',
                'current_match': 'Match Actual',
                'wins': 'Victorias',
                'tiles': 'Fichas',
                'scores': 'Puntuaciones',
                'match': 'Match',
                'games_won': 'JUEGOS GANADOS',
                'waiting_game_data': 'Esperando datos del juego...'
            },
            en: {
                // Room Selection
                'no_active_rooms': 'No active rooms',
                'available_rooms': 'Available Rooms:',
                'room_full': 'Full',
                
                // Game Actions
                'your_turn': 'Your turn',
                'waiting_for_others': 'Waiting for others...',
                'waiting_for_players': 'Waiting for 4 players to connect to start...',
                'all_players_connected': 'All players connected. Starting game...',
                'players_connected': 'players connected',
                'connecting': 'Connecting...',
                'start_new_hand': 'Start New Hand',
                'start_new_match': 'Play New Match',
                'pass_turn': 'Pass',
                'has_valid_move': 'You have a valid move, cannot pass!',
                
                // Game States
                'game_closed': 'Game Closed!',
                'no_valid_moves': 'No valid moves remaining',
                'players_with_tiles': 'Players with tiles:',
                'game_over': 'Game Over',
                'hand_finished': 'Hand Finished',
                'game_restarted': 'Game restarted by',
                
                // End game messages - for translating server messages
                'domino': 'domino',
                'gana': 'wins',
                'puntos': 'points',
                'equipo': 'Team',
                'juego cerrado': 'Game Closed',
                'empate': 'Tie',
                'nadie gana': 'no one wins',
                'menos puntos': 'fewer points',
                'zapato': 'Shutout',
                'match': 'match',
                
                // UI Elements
                'points': 'POINTS',
                'player': 'Player',
                'team': 'Team',
                'system': 'SYSTEM',
                'you': 'You',
                'your_turn_any_tile': 'Your turn! You can play any tile (you have double 6)',
                'to': 'to',
                
                // Settings & Avatar
                'enter_name_save_avatar': 'Enter your name to save avatar permanently!',
                'avatar_saved': 'Avatar saved permanently as',
                'image_too_large': 'Image too large! Please choose an image smaller than 500KB.',
                'points_cleared': 'Points cleared! The POINTS table should now show 0 for all players.',
                
                // Language Selection
                'select_language': 'Language',
                'spanish': 'Español',
                'english': 'English',
                'language_changed': 'Language changed to English',
                
                // HTML Interface Elements
                'suggestions_box': 'Suggestions Box',
                'suggestions_box_short': 'Suggestions',
                'close_suggestions': 'Close Suggestions',
                'help_us_improve': 'Help Us Improve',
                'share_ideas_placeholder': 'Share your ideas, suggestions or report problems...',
                'please_write_suggestion': 'Please write a suggestion',
                'suggestion_too_short': 'Suggestion must be at least 10 characters',
                'sending_suggestion': 'Sending suggestion...',
                'suggestion_sent': 'Suggestion sent! Thank you for your help',
                'suggestion_error': 'Error sending. Please try again later',
                'connection_error': 'Connection error. Please try again later',
                'send': 'Send',
                'cancel': 'Cancel',
                'create_profile': 'Create Your Profile',
                'game_rules': 'DominoM - Game Rules',
                'select_avatar': 'Select Your Avatar',
                'upload_own_image': 'Or Upload Your Own Image',
                'select_file': 'Select File',
                'name_placeholder': 'Your Name or Initials',
                'room_placeholder': 'Room name (optional)',
                'score_label': 'Score:',
                'enter_game': 'Enter Game',
                'clear_saved_profile': 'Clear Saved Profile',
                'restart_game': 'Restart Game',
                'leave_game': 'Leave Game',
                'leave_game_short': 'Leave',
                'leave_game_confirm': 'Are you sure you want to leave this game?',
                'left': 'Left',
                'right': 'Right',
                'step': 'Pass',
                'press_and_speak': 'Press and speak',
                'type_message_placeholder': 'Type a message...',
                'close': 'Close',
                
                // Game Rules (English)
                'game_rules_title': 'DominoM - Game Rules',
                'rule_1': 'The game is for 4 players in teams of 2.',
                'rule_2': 'The game starts when all 4 players are registered',
                'rule_3': 'The game rotates team partnerships after each match',
                'rule_4': 'Each player receives 7 domino tiles.',
                'rule_5': 'The player with double 6 starts the game.',
                'rule_6': 'Turns are in counter-clockwise direction.',
                'rule_7': 'You must place a tile that matches the board ends.',
                'rule_8': 'If you cannot play, you must pass your turn.',
                'rule_9': 'The first team to run out of tiles wins the hand, or the team with fewer points if the game closes.',
                'rule_10': 'If there is a closure and tie in points, nobody wins and whoever has double 6 starts the next hand',
                'rule_11': 'The first team to reach the target score (70) wins the game, this value can be changed when registering.',
                'rule_12': 'You can create your own game room or join an existing one.',
                'rules_footer': 'Consult the complete rules with the organizer or online.',
                
                // Table Headers and Scoreboards
                'team_score': 'Team Score',
                'match_score': 'Match Score',
                'matches_won': 'Matches Won',
                'current_match': 'Current Match',
                'wins': 'Wins',
                'tiles': 'Tiles',
                'scores': 'Scores',
                'match': 'Match',
                'games_won': 'GAMES WON',
                
                // PWA Install Banner (English)
                'pwa_install_title': 'Install DominoM for the Best Experience!',
                'pwa_install_steps': 'Quick 3-Step Install:',
                'pwa_step_1': 'Tap the <strong>Share button ↗️</strong> at the bottom',
                'pwa_step_2': 'Scroll down and tap <strong>"Add to Home Screen"</strong>',
                'pwa_step_3': 'Tap <strong>"Add"</strong> to confirm',
                'pwa_benefits': 'Get fullscreen gameplay, faster loading, and work offline!',
                'pwa_later_button': "I'll do it later",
                'pwa_android_title': 'Install DominoM App!',
                'pwa_android_instruction': 'Look for the "Install" button in your browser menu or address bar',
                'pwa_got_it': 'Got it',
                'waiting_game_data': 'Waiting for game data...'
            }
        };
    }

    // Get translated text for a key
    t(key, params = {}) {
        let text = this.translations[this.currentLanguage][key] || this.translations['es'][key] || key;
        
        // Simple parameter replacement
        Object.keys(params).forEach(param => {
            text = text.replace(`{${param}}`, params[param]);
        });
        
        return text;
    }

    // Change language and save preference
    setLanguage(language) {
        if (this.translations[language]) {
            this.currentLanguage = language;
            this.saveLanguagePreference(language);
            this.updateAllText();
            return true;
        }
        return false;
    }

    // Get current language
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Save language preference to localStorage
    saveLanguagePreference(language) {
        try {
            localStorage.setItem('domino_game_language', language);
        } catch (error) {
            console.warn('Failed to save language preference:', error);
        }
    }

    // Load saved language preference
    loadSavedLanguage() {
        try {
            return localStorage.getItem('domino_game_language');
        } catch (error) {
            console.warn('Failed to load language preference:', error);
            return null;
        }
    }

    // Update all text elements in the DOM
    updateAllText() {
        // Update elements with data-translate attributes
        this.updateDataTranslateElements();
        
        // Update specific game UI elements
        this.updateGameUI();

        // Trigger custom event for game-specific updates
        document.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: this.currentLanguage } 
        }));
    }

    // Update elements with data-translate attributes
    updateDataTranslateElements() {
        // Update all elements with data-translate attribute
        const translateElements = document.querySelectorAll('[data-translate]');
        translateElements.forEach(element => {
            const key = element.getAttribute('data-translate');
            if (key) {
                element.textContent = this.t(key);
            }
        });

        // Update all elements with data-translate-placeholder attribute
        const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            if (key) {
                element.placeholder = this.t(key);
            }
        });

        // Force update specific suggestion box elements that might not be caught by data-translate
        this.updateSuggestionBoxElements();
    }

    // Update suggestion box elements specifically
    updateSuggestionBoxElements() {
        // Update desktop suggestion box button
        const desktopToggleBtn = document.getElementById('toggle-suggestion-btn');
        if (desktopToggleBtn) {
            const span = desktopToggleBtn.querySelector('[data-translate]');
            if (span) {
                span.textContent = this.t('suggestions_box');
            }
        }

        // Update mobile suggestion box button
        const mobileToggleBtn = document.getElementById('stubborn-toggle-btn');
        if (mobileToggleBtn) {
            const span = mobileToggleBtn.querySelector('[data-translate]');
            if (span) {
                span.textContent = this.t('suggestions_box_short');
            }
        }

        // Update all send buttons
        const sendBtns = ['submit-suggestion-btn', 'stubborn-send-btn'];
        sendBtns.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                const span = btn.querySelector('[data-translate]');
                if (span) {
                    span.textContent = this.t('send');
                }
            }
        });

        // Update all close/cancel buttons
        const closeBtns = ['cancel-suggestion-btn', 'stubborn-close-btn'];
        closeBtns.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                const span = btn.querySelector('[data-translate]');
                if (span) {
                    const key = btnId.includes('cancel') ? 'cancel' : 'close';
                    span.textContent = this.t(key);
                }
            }
        });

        // Update titles
        const titles = ['stubborn-title'];
        titles.forEach(titleId => {
            const title = document.getElementById(titleId);
            if (title) {
                title.textContent = this.t('help_us_improve');
            }
        });

        // Update textareas
        const textareas = ['suggestion-text', 'stubborn-text'];
        textareas.forEach(textareaId => {
            const textarea = document.getElementById(textareaId);
            if (textarea) {
                textarea.placeholder = this.t('share_ideas_placeholder');
            }
        });
    }

    // Update dynamic game UI elements
    updateGameUI() {
        // Update button texts
        const playLeftBtn = document.getElementById('playLeftBtn');
        const playRightBtn = document.getElementById('playRightBtn');
        const passBtn = document.getElementById('passBtn');
        const restartBtn = document.getElementById('restart-game-btn');
        
        if (playLeftBtn) playLeftBtn.textContent = this.t('left');
        if (playRightBtn) playRightBtn.textContent = this.t('right');
        if (passBtn) passBtn.textContent = this.t('step');
        if (restartBtn) restartBtn.innerHTML = `🔄 ${this.t('restart_game')}`;

        // Update static text elements
        const elements = [
            { id: 'toggle-suggestion-btn', key: 'suggestions_box', prefix: '💡 ' },
            { id: 'toggle-suggestion-btn-mobile', key: 'suggestions_box', prefix: '💡 ' },
            { id: 'toggle-suggestion-btn-mobile-game', key: 'suggestions_box', prefix: '💡 ' },
            { id: 'submit-suggestion-btn', key: 'send', prefix: '📤 ' },
            { id: 'mobile-submit-suggestion-btn', key: 'send', prefix: '📤 ' },
            { id: 'mobile-submit-suggestion-btn-game', key: 'send', prefix: '📤 ' },
            { id: 'cancel-suggestion-btn', key: 'cancel', prefix: '❌ ' },
            { id: 'mobile-cancel-suggestion-btn', key: 'cancel', prefix: '❌ ' },
            { id: 'mobile-cancel-suggestion-btn-game', key: 'cancel', prefix: '❌ ' },
            { id: 'show-rules-btn', key: 'game_rules', prefix: '📖 ' },
            { id: 'set-name-btn', key: 'enter_game' },
            { id: 'clear-profile-btn', key: 'clear_saved_profile' },
            { id: 'close-rules-btn', key: 'close' }
        ];

        elements.forEach(elem => {
            const element = document.getElementById(elem.id);
            if (element) {
                const prefix = elem.prefix || '';
                element.textContent = prefix + this.t(elem.key);
            }
        });

        // Update h2, h3, h4 elements
        const headers = [
            { selector: 'h2', text: this.t('create_profile') },
            { selector: '#avatar-selection h3', text: this.t('select_avatar') },
            { selector: '#custom-avatar-section h4', text: this.t('upload_own_image') },
            { selector: '#suggestion-box h4', text: `🎯 ${this.t('help_us_improve')}` },
            { selector: '#mobile-suggestion-box h4', text: `🎯 ${this.t('help_us_improve')}` },
            { selector: '#mobile-suggestion-box-game h4', text: `🎯 ${this.t('help_us_improve')}` },
            { selector: '#rules-modal h2', text: this.t('game_rules') }
        ];

        headers.forEach(header => {
            const element = document.querySelector(header.selector);
            if (element) element.textContent = header.text;
        });

        // Update placeholders
        const placeholders = [
            { id: 'name-input', key: 'name_placeholder' },
            { id: 'room-input', key: 'room_placeholder' },
            { id: 'chat-input', key: 'type_message_placeholder' },
            { id: 'suggestion-text', key: 'share_ideas_placeholder' },
            { id: 'mobile-suggestion-text', key: 'share_ideas_placeholder' },
            { id: 'mobile-suggestion-text-game', key: 'share_ideas_placeholder' }
        ];

        placeholders.forEach(placeholder => {
            const element = document.getElementById(placeholder.id);
            if (element) element.placeholder = this.t(placeholder.key);
        });

        // Update labels
        const scoreLabel = document.querySelector('.puntaje-label');
        if (scoreLabel) scoreLabel.textContent = this.t('score_label');

        // Update file upload label
        const fileLabel = document.querySelector('.custom-file-upload');
        if (fileLabel) fileLabel.innerHTML = `📁 ${this.t('select_file')}`;

        // Update voice chat button
        const voiceBtn = document.getElementById('voice-chat-btn');
        if (voiceBtn) voiceBtn.innerHTML = `🎤${this.t('press_and_speak')}`;

        // Update game rules modal content
        this.updateGameRules();

        // Update scoreboards and table headers
        this.updateScoreboards();
    }

    // Update game rules content
    updateGameRules() {
        const rulesTitle = document.querySelector('#rules-modal h2');
        if (rulesTitle) rulesTitle.textContent = this.t('game_rules_title');

        const rulesList = document.querySelector('#rules-modal ol');
        if (rulesList) {
            const rules = [];
            for (let i = 1; i <= 12; i++) {
                rules.push(`<li>${this.t('rule_' + i)}</li>`);
            }
            rulesList.innerHTML = rules.join('');
        }

        const rulesFooter = document.querySelector('#rules-modal p');
        if (rulesFooter) rulesFooter.textContent = this.t('rules_footer');
    }

    // Update scoreboard and table headers
    updateScoreboards() {
        // Update any score-related headers that might exist
        const scoreElements = document.querySelectorAll('[data-score-header]');
        scoreElements.forEach(element => {
            const key = element.getAttribute('data-score-header');
            element.textContent = this.t(key);
        });

        // Update team info if it exists
        const teamInfo = document.getElementById('team-info');
        if (teamInfo) {
            teamInfo.innerHTML = teamInfo.innerHTML
                .replace(/Equipo A/g, window.lang.t('team') + ' A')
                .replace(/Equipo B/g, window.lang.t('team') + ' B')
                .replace(/Match/g, window.lang.t('match'));
        }

        // Update matches won container
        const matchesContainer = document.getElementById('matches-won-container');
        if (matchesContainer) {
            matchesContainer.innerHTML = matchesContainer.innerHTML
                .replace(/JUEGOS<br>GANADOS/g, window.lang.t('games_won').replace(' ', '<br>'));
        }

        // Update player tile counts
        document.querySelectorAll('.tile-count').forEach(element => {
            if (element.textContent.includes('Fichas:')) {
                element.innerHTML = element.innerHTML.replace(/Fichas:/g, window.lang.t('tiles') + ':');
            }
        });

        // Update scoreboard - no longer need to translate "Scores" since we removed it
        const scoreboardDiv = document.getElementById('scoreboard');
        if (scoreboardDiv && scoreboardDiv.innerHTML.includes('Equipo')) {
            scoreboardDiv.innerHTML = scoreboardDiv.innerHTML
                .replace(/Equipo A/g, window.lang.t('team') + ' A')
                .replace(/Equipo B/g, window.lang.t('team') + ' B');
        }
    }

    // Translate server messages from Spanish to English
    translateServerMessage(message) {
        if (!message || this.currentLanguage === 'es') return message;
        
        let translated = message;
        
        // Translate common server message patterns
        const translations = {
            // Basic game messages
            'domino!': 'domino!',
            'Equipo A': 'Team A', 
            'Equipo B': 'Team B',
            'gana': 'wins',
            'puntos!': 'points!',
            'puntos.': 'points.',
            'Juego Cerrado!': 'Game Closed!',
            'Empate': 'Tie',
            'nadie gana puntos': 'no one wins points',
            'nadie': 'no one',
            'menos puntos': 'with fewer points',
            'con menos': 'with fewer',
            'el match': 'the match',
            'el': 'the',
            'Zapato:': 'Shutout:',
            'El próximo juego lo inicia quien tenga el doble 6': 'Next game starts with whoever has double 6',
            'Mano finalizada!': 'Hand finished!',
            'Juego cerrado ! Nadie puede jugar!': 'Game closed! No one can play!',
            '(Juego cerrado)': '(Game closed)',
            'reinició el juego': 'restarted the game',
            'Mano Finalizada': 'Hand Finished',
            'próxima mano': 'next hand',
            'cualquier ficha': 'any tile',
            'Jugada inválida!': 'Invalid move!',
            'Jugada invalida!': 'Invalid move!', // without accent fallback
            'Primera ficha debe ser 6|6!': 'First tile must be 6|6!'
        };
        
        // Apply translations
        for (const [spanish, english] of Object.entries(translations)) {
            translated = translated.replace(new RegExp(spanish, 'gi'), english);
        }
        
        // Additional specific patterns for invalid move messages
        translated = translated
            .replace(/jugada\s+inv[aá]lida[!]?/gi, 'Invalid move!')
            .replace(/primera\s+ficha\s+debe\s+ser\s+6\|6[!]?/gi, 'First tile must be 6|6!');
        
        // Additional pattern replacements for complex messages
        translated = translated
            .replace(/(\w+)\s+domino!/gi, '$1 domino!')
            .replace(/Equipo\s+([AB])\s+gana/gi, 'Team $1 wins')
            .replace(/gana\s+(\d+)\s+puntos/gi, 'wins $1 points')
            .replace(/(\d+)\s+a\s+(\d+)/gi, '$1 to $2')
            .replace(/quien tenga el doble 6/gi, 'whoever has double 6')
            .replace(/puede jugar cualquier ficha/gi, 'can play any tile')
            .replace(/\bnadie\b/gi, 'no one') // standalone "nadie" to "no one"
            .replace(/\bcon menos\b/gi, 'with fewer') // "con menos" to "with fewer"
            .replace(/\bel match\b/gi, 'the match') // "el match" to "the match"
            .replace(/\bel\b/gi, 'the'); // standalone "el" to "the"
        
        return translated;
    }

    // Create language selector UI
    createLanguageSelector() {
        const selector = document.createElement('div');
        selector.id = 'language-selector';
        selector.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 8px;
            padding: 8px 12px;
            font-family: Arial, sans-serif;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        const label = document.createElement('span');
        label.style.cssText = 'color: white; font-size: 12px;';
        label.textContent = this.t('select_language') + ':';

        const select = document.createElement('select');
        select.style.cssText = `
            background: #333;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
        `;

        // Add language options
        const options = [
            { value: 'es', text: this.t('spanish') },
            { value: 'en', text: this.t('english') }
        ];

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            option.selected = opt.value === this.currentLanguage;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
            label.textContent = this.t('select_language') + ':';
            // Update option texts
            options.forEach((opt, index) => {
                select.options[index].textContent = this.t(opt.value === 'es' ? 'spanish' : 'english');
            });
            
            // Show confirmation message using the game's showMessage function if available
            if (window.showMessage) {
                window.showMessage(this.t('language_changed'));
            }
        });

        selector.appendChild(label);
        selector.appendChild(select);

        return selector;
    }
}

// Create global language manager instance
window.lang = new LanguageManager();

// Initialize translations on page load
document.addEventListener('DOMContentLoaded', function() {
    // Update all translatable elements after DOM is loaded
    window.lang.updateAllText();
    
    // Add event listeners for suggestion box toggles to update translations
    const setupSuggestionBoxListeners = () => {
        // Desktop suggestion box
        const desktopToggle = document.getElementById('toggle-suggestion-btn');
        if (desktopToggle) {
            desktopToggle.addEventListener('click', () => {
                setTimeout(() => window.lang.updateSuggestionBoxElements(), 100);
            });
        }
        
        // Mobile suggestion box
        const mobileToggle = document.getElementById('stubborn-toggle-btn');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                setTimeout(() => window.lang.updateSuggestionBoxElements(), 100);
            });
            mobileToggle.addEventListener('touchstart', () => {
                setTimeout(() => window.lang.updateSuggestionBoxElements(), 100);
            });
        }
    };
    
    setupSuggestionBoxListeners();
    
    // Also setup listeners after any potential DOM changes
    const observer = new MutationObserver(() => {
        setupSuggestionBoxListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });
});

// =============================================================================
// == GLOBAL VARIABLES & STATE MANAGEMENT                                     ==
// =============================================================================
// ...existing code...
// Define clearAllPointsData to prevent ReferenceError
function clearAllPointsData() {
    // Clear local tracking
    playerPointsWon = {};
    previousTeamScores = { teamA: 0, teamB: 0 };
    // Clear localStorage backup
    try {
        localStorage.removeItem('domino_game_points');
    } catch (error) {
        console.warn('⚠️ Failed to clear points from localStorage:', error);
    }
    // Update points table to show zeros immediately
    if (window.updatePointsTableContent) {
        setTimeout(() => {
            window.updatePointsTableContent();
        }, 100);
    }
}

// Function to show the waiting for players message
function showWaitingForPlayersMessage() {
    const waitingDiv = document.getElementById('waiting-for-players');
    const messageText = document.getElementById('waiting-message-text');

   
    if (waitingDiv && messageText) {
        // Update text with localized messages
        messageText.textContent = window.lang.t('waiting_for_players');
        
        // Force show with !important to override any CSS
        waitingDiv.style.setProperty('display', 'block', 'important');
        waitingDiv.style.setProperty('visibility', 'visible', 'important');
        waitingDiv.style.setProperty('opacity', '1', 'important');
        waitingDiv.style.setProperty('z-index', '10000', 'important');
   
       
    } else {
        console.error('❌ Could not show waiting message - missing elements');
    }
}

// Function to hide the waiting for players message
function hideWaitingForPlayersMessage() {
    const waitingDiv = document.getElementById('waiting-for-players');
    if (waitingDiv) {
        waitingDiv.style.setProperty('display', 'none', 'important');
        // console.log('✅ Hiding waiting for players message - game ready to start');
    }
}

// Function to update the player count display
function updatePlayerCountDisplay(playerCount) {
    const playerCountText = document.getElementById('player-count-text');
    const messageText = document.getElementById('waiting-message-text');
    
    // console.log('🔍 COUNT DEBUG - updatePlayerCountDisplay called with:', playerCount);
    // console.log('🔍 COUNT DEBUG - Elements found:', {
    //   playerCountText: !!playerCountText,
    //   messageText: !!messageText
    //});
    
    if (playerCountText && messageText) {
        if (playerCount >= 4) {
            // All players connected, waiting for game to initialize
            playerCountText.textContent = `4/4 ${window.lang.t('players_connected')}`;
            messageText.textContent = window.lang.t('all_players_connected');
            // console.log('🔍 COUNT DEBUG - Set to 4/4 players');
        } else {
            // Still waiting for more players
            playerCountText.textContent = `${playerCount}/4 ${window.lang.t('players_connected')}`;
            messageText.textContent = window.lang.t('waiting_for_players');
            // console.log('🔍 COUNT DEBUG - Set to', playerCount, '/4 players');
        }
        
        
    } else {
        console.error('❌ Could not update player count - missing elements');
    }
}


// =============================================================================
// == P5.JS CORE FUNCTIONS (PRELOAD, SETUP, DRAW)                             ==
// =============================================================================

/**
 * (p5.js function) Preloads assets before the main setup.
 */
function preload() {
    soundFormats('mp3');
    
    // Load sounds with error handling
    tileSound = undefined;
    try {
        tileSound = loadSound('assets/sounds/tile_place.mp3', 
            () => {},
            (error) => console.error('❌ Failed to load tile sound:', error)
        );
    } catch (e) {
        console.error('❌ tileSound load error:', e);
    }
    passSound = loadSound('assets/sounds/pass_turn.mp3',
        () => // console.log('✅ Pass sound loaded successfully'),
        (error) => console.error('❌ Failed to load pass sound:', error)
    );
    winSound = loadSound('assets/sounds/win_bell.mp3',
        () => // console.log('✅ Waiting sound loaded successfully'),
        (error) => console.error('❌ Failed to load waiting sound:', error)
    );
    
    waitingSound = loadSound('assets/sounds/waiting_bell.mp3',
        () => // console.log('✅ Waiting sound loaded successfully'),
        (error) => console.error('❌ Failed to load waiting sound:', error)
    );
}
/**
 * (p5.js function) Automatically called when the browser window is resized.
 */
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    //  repositionUIElements(); // Custom function to adjust layout
}

/**
 * (p5.js function) Runs once when the program starts.
 */
function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-container');
    
    // Initialize audio context and set up sounds
    setupAudio();
    
    // Hide new round container immediately on page load
    const newRoundContainer = document.getElementById('new-round-container');
    if (newRoundContainer) {
        newRoundContainer.style.display = 'none !important';
        newRoundContainer.style.visibility = 'hidden !important';
        newRoundContainer.style.opacity = '0';
        newRoundContainer.style.zIndex = '-9999';
    }
    
    // Only add language selector if we're in the lobby
    const lobby = document.getElementById('lobby-container');
    if (lobby && lobby.style.display !== 'none') {
        if (window.lang && typeof window.lang.createLanguageSelector === 'function') {
            const selector = window.lang.createLanguageSelector();
            document.body.appendChild(selector);
        }
        
        // Listen for language changes and update dynamic content
        document.addEventListener('languageChanged', () => {
            fetchAndShowRooms(); // Refresh room list with new language
            if (window.lang && typeof window.lang.updateGameUI === 'function') {
                window.lang.updateGameUI(); // Update UI elements
            }
        });
        
        // Apply initial translations
        if (window.lang && typeof window.lang.updateGameUI === 'function') {
            window.lang.updateGameUI();
        }
    }
    
    setupLobby();
    setupButtonListeners();
}

function setupAudio() {
    // Set up audio context initialization on first user interaction
    let audioInitialized = false;
    
    const initializeAudio = () => {
        if (!audioInitialized) {
            // console.log('🔊 Initializing audio context...');
            
            // Initialize audio context
            if (getAudioContext().state === 'suspended') {
                userStartAudio().then(() => {
                    // console.log('✅ Audio context started');
                    setSoundVolumes();
                }).catch(err => console.error('❌ Failed to start audio context:', err));
            } else {
                setSoundVolumes();
            }
            
            audioInitialized = true;
            // Remove the event listeners after first use
            document.removeEventListener('click', initializeAudio);
            document.removeEventListener('keydown', initializeAudio);
        }
    };
    
    // Add event listeners for user interaction
    document.addEventListener('click', initializeAudio);
    document.addEventListener('keydown', initializeAudio);
}

function setSoundVolumes() {
    // Set volume levels after sounds are loaded
    setTimeout(() => {
        if (typeof tileSound !== 'undefined' && tileSound && tileSound.isLoaded()) {
            tileSound.setVolume(0.7);
            // console.log('🔊 Tile sound volume set');
        }
        if (typeof passSound !== 'undefined' && passSound && passSound.isLoaded()) {
            passSound.setVolume(0.8);
            // console.log('🔊 Pass sound volume set');
        }
        if (typeof winSound !== 'undefined' && winSound && winSound.isLoaded()) {
            winSound.setVolume(0.9);
            // console.log('🔊 Win sound volume set');
        }
        if (typeof waitingSound !== 'undefined' && waitingSound && waitingSound.isLoaded()) {
            waitingSound.setVolume(0.9);
            // console.log('🔊 Win sound volume set');
        }
    }, 500);
}

/**
 * (p5.js function) The main rendering loop, runs continuously.
 */
function draw() {
    try {
        background(0, 100, 0);
        // (Removed points-objective update here; now handled by updateRoomInfo for compact legend)
        updateUI();
        updatePlayersUI();
        updateTeamInfo();
        updateRoomInfo();
        updateScoreboard();
        updateMatchesWon();
        
        // Ensure points table exists during active gameplay
        if (!document.getElementById('points-table-container') && typeof gameState !== 'undefined' && gameState.jugadoresInfo && gameState.jugadoresInfo.length > 0) {
            createPointsTableNow();
        }
        
        if (typeof gameState !== 'undefined' && gameState.board && gameState.board.length > 0) {
            drawBoard();
        }
        if (myPlayerHand) drawHand();
        
        // Draw animated tile if animation is active
        if (isAnimating) {
            drawAnimatedTile();
        }
        
        // Draw persistent current player animation
        if (window.currentPlayerAnimation && window.currentPlayerAnimation.isActive) {
            drawPersistentAnimation();
        }
        
        drawMessages();
    } catch (error) {
        console.error("[CLIENT] Error in draw loop:", error);
    }
}


// =============================================================================
// == LOBBY & SERVER CONNECTION                                               ==
// =============================================================================

/**
 * Sets up the initial name-entry lobby screen with avatar selection.
 */
function setupLobby() {
    // Hide the room-points-legend if present (so it doesn't overlap the lobby)
    const legendDiv = document.getElementById('room-points-legend');
    if (legendDiv) legendDiv.style.display = 'none';
    const lobbyContainer = document.getElementById('lobby-container');
    const nameInput = document.getElementById('name-input');

    // (Old activeRoomsDiv and fetch logic removed)
    // SUPER AGGRESSIVE: Hide all possible dialog containers
    const elementsToHide = [
        'new-round-container',
        'round-over-message', 
        'newRoundBtn'
    ];
    
    elementsToHide.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none !important';
            element.style.visibility = 'hidden !important';
            element.style.opacity = '0';
            element.style.zIndex = '-9999';
            element.style.pointerEvents = 'none';
        }
    });
    
    // (already declared above)
    const setNameBtn = document.getElementById('set-name-btn');
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const avatarUpload = document.getElementById('avatar-upload');
    const customAvatarPreview = document.getElementById('custom-avatar-preview');
    // Room selection input (add this to your HTML if not present)
    let roomInput = document.getElementById('room-input');
    if (!roomInput) {
        // Dynamically add if missing (for backward compatibility)
        roomInput = document.createElement('input');
        roomInput.type = 'text';
        roomInput.id = 'room-input';
        roomInput.placeholder = 'Sala nombre (opcional)';
        roomInput.style.marginTop = '10px';
        roomInput.style.width = '56%'; // 30% less than 80%
        roomInput.style.minWidth = '180px';
        // Only insertBefore if setNameBtn is a child of lobbyContainer
        if (setNameBtn && setNameBtn.parentNode === lobbyContainer) {
            lobbyContainer.insertBefore(roomInput, setNameBtn);
        } else {
            lobbyContainer.appendChild(roomInput);
        }
    } else {
        roomInput.placeholder = 'Sala nombre (opcional)';
        roomInput.style.width = '56%';
        roomInput.style.minWidth = '190px';
    }
    
    // ALWAYS start with empty name field (don't auto-fill old names)
    nameInput.value = '';
    nameInput.defaultValue = '';
    nameInput.setAttribute('value', '');
    // console.log('✅ Cleared name input field');
    
    // Force clear any cached form data multiple times
    setTimeout(() => {
        nameInput.value = '';
        nameInput.defaultValue = '';
        nameInput.setAttribute('value', '');
        // console.log('✅ Double-cleared name input field');
    }, 100);
    
    setTimeout(() => {
        nameInput.value = '';
        nameInput.defaultValue = '';
        nameInput.setAttribute('value', '');
        // console.log('✅ Triple-cleared name input field');
    }, 300);
    
    // Load saved avatar from localStorage (but NOT the name - keep it empty)
    const savedAvatar = localStorage.getItem('domino_player_avatar');
    
    let selectedAvatar = '🎯'; // Default avatar (target emoji)
    let customAvatarData = null;
    
    // Don't restore saved name - always start fresh
    // if (savedName) {
    //     nameInput.value = savedName;
    // }
    
    // Reset all avatar selections first
    avatarOptions.forEach(opt => opt.classList.remove('selected'));
    customAvatarPreview.style.display = 'none';
    
    // PRIORITY 1: Check if user has an avatar file with their name first
    const currentName = nameInput.value.trim();
    if (currentName) {
        // Try to find avatar file for this user
        const testImg = new Image();
        const avatarFilePath = `assets/icons/${currentName}_avatar.jpg`;
        
        testImg.onload = function() {
            // console.log('✅ Found avatar file for', currentName);
            // Don't use localStorage - user has their own avatar file
            selectedAvatar = null;
            customAvatarData = null;
            // The getPlayerIcon function will handle this
        };
        
        testImg.onerror = function() {
            // console.log('ℹ️ No avatar file found for', currentName, ', using localStorage or default');
            // PRIORITY 2: Restore saved avatar from localStorage
            if (savedAvatar) {
                try {
                    const avatarData = JSON.parse(savedAvatar);
                    if (avatarData.type === 'custom') {
                        customAvatarData = avatarData.data;
                        selectedAvatar = null;
                        // Show preview
                        customAvatarPreview.innerHTML = `<img src="${customAvatarData}" alt="Custom Avatar">`;
                        customAvatarPreview.style.display = 'block';
                        // console.log('Restored custom avatar from localStorage');
                    } else {
                        selectedAvatar = avatarData.data;
                        customAvatarData = null;
                        // Check if this is an image path or emoji
                        if (selectedAvatar && selectedAvatar.includes('assets/')) {
                            // New image avatar system - wait for grid to populate
                            setTimeout(() => {
                                const avatarOptions = document.querySelectorAll('.avatar-option');
                                avatarOptions.forEach(opt => {
                                    if (opt.dataset.avatar === selectedAvatar) {
                                        opt.classList.add('selected');
                                    }
                                });
                            }, 500);
                            console.log('Restored image avatar from localStorage:', selectedAvatar);
                        } else {
                            // Old emoji system
                            avatarOptions.forEach(opt => {
                                if (opt.dataset.avatar === selectedAvatar) {
                                    opt.classList.add('selected');
                                }
                            });
                            // console.log('Restored emoji avatar from localStorage:', selectedAvatar);
                        }
                    }
                } catch (e) {
                    // console.log('Could not restore saved avatar, using default');
                    useDefaultAvatar();
                }
            } else {
                useDefaultAvatar();
            }
        };
        
        testImg.src = avatarFilePath;
    } else {
        // No name entered yet, use localStorage or default
        if (savedAvatar) {
            try {
                const avatarData = JSON.parse(savedAvatar);
                if (avatarData.type === 'custom') {
                    customAvatarData = avatarData.data;
                    selectedAvatar = null;
                    customAvatarPreview.innerHTML = `<img src="${customAvatarData}" alt="Custom Avatar">`;
                    customAvatarPreview.style.display = 'block';
                    // console.log('Restored custom avatar from localStorage');
                } else {
                    selectedAvatar = avatarData.data;
                    customAvatarData = null;
                    // Check if this is an image path or emoji
                    if (selectedAvatar && selectedAvatar.includes('assets/')) {
                        // New image avatar system - wait for grid to populate
                        setTimeout(() => {
                            const avatarOptions = document.querySelectorAll('.avatar-option');
                            avatarOptions.forEach(opt => {
                                if (opt.dataset.avatar === selectedAvatar) {
                                    opt.classList.add('selected');
                                }
                            });
                        }, 500);
                        console.log('Restored image avatar from localStorage:', selectedAvatar);
                    } else {
                        // Old emoji system
                        avatarOptions.forEach(opt => {
                            if (opt.dataset.avatar === selectedAvatar) {
                                opt.classList.add('selected');
                            }
                        });
                        // console.log('Restored emoji avatar from localStorage:', selectedAvatar);
                    }
                }
            } catch (e) {
                // console.log('Could not restore saved avatar, using default');
                useDefaultAvatar();
            }
        } else {
            useDefaultAvatar();
        }
    }
    
    function useDefaultAvatar() {
        // Use default jugador avatar instead of emoji
        const defaultPath = 'assets/defaults/jugador1_avatar.jpg';
        selectedAvatar = defaultPath;
        customAvatarData = null;
        
        // Wait for avatar grid to populate, then select the first default
        setTimeout(() => {
            const avatarOptions = document.querySelectorAll('.avatar-option');
            const defaultOption = Array.from(avatarOptions).find(opt => 
                opt.dataset.avatar && opt.dataset.avatar.includes('jugador1')
            );
            if (defaultOption) {
                defaultOption.classList.add('selected');
                console.log('Set default jugador1 avatar');
            } else {
                // Fallback to emoji if no image avatars available
                const emojiDefault = document.querySelector('[data-avatar="🎯"]');
                if (emojiDefault) {
                    emojiDefault.classList.add('selected');
                    selectedAvatar = '🎯';
                }
            }
        }, 600);
    }
    
    // 🎯 POPULATE AVATAR GRID WITH REAL IMAGE AVATARS
    async function populateAvatarGrid() {
        try {
            console.log('🎯 Fetching real avatars for selection grid...');
            const response = await fetch('/debug/avatars');
            const data = await response.json();
            
            if (data.success) {
                // Try multiple possible selectors for the avatar container
                const possibleSelectors = [
                    '#avatar-selection .avatar-grid',
                    '.avatar-grid', 
                    '#avatar-selection',
                    '.avatar-options',
                    '.avatar-container'
                ];
                
                let avatarContainer = null;
                for (const selector of possibleSelectors) {
                    avatarContainer = document.querySelector(selector);
                    if (avatarContainer) {
                        console.log('✅ Found avatar container with selector:', selector);
                        break;
                    }
                }
                
                if (!avatarContainer) {
                    console.error('❌ No avatar container found. Available elements:', {
                        avatarSelection: !!document.querySelector('#avatar-selection'),
                        avatarOptions: document.querySelectorAll('.avatar-option').length,
                        allClasses: [...document.querySelectorAll('*')].filter(el => el.className && el.className.includes('avatar')).map(el => el.className)
                    });
                    return;
                }
                
                console.log('📋 Avatar container current content:', avatarContainer.innerHTML.slice(0, 200));
                
                // Clear existing emoji avatars but keep any structure
                const existingOptions = avatarContainer.querySelectorAll('.avatar-option');
                existingOptions.forEach(option => option.remove());
                
                let addedCount = 0;
                
                // Add default avatars first (jugador1, jugador2, etc.)
                data.defaultFiles.forEach(filename => {
                    if (filename.startsWith('jugador') && filename.endsWith('.jpg')) {
                        const avatarElement = createAvatarOption(`assets/defaults/${filename}`, filename);
                        avatarContainer.appendChild(avatarElement);
                        addedCount++;
                    }
                });
                
                // Add uploaded avatars
                data.avatarFiles.forEach(filename => {
                    const avatarElement = createAvatarOption(`assets/icons/${filename}`, filename);
                    avatarContainer.appendChild(avatarElement);
                    addedCount++;
                });
                
                console.log('✅ Avatar grid populated with real images:', {
                    defaults: data.defaultFiles.length,
                    uploaded: data.avatarFiles.length,
                    addedToGrid: addedCount
                });
                
                console.log('📋 Avatar container after update:', avatarContainer.innerHTML.slice(0, 200));
            }
        } catch (error) {
            console.error('❌ Failed to populate avatar grid:', error);
        }
    }
    
    function createAvatarOption(imagePath, filename) {
        const div = document.createElement('div');
        div.className = 'avatar-option';
        div.dataset.avatar = imagePath; // Use image path as avatar identifier
        div.innerHTML = `<img src="${imagePath}" alt="${filename}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">`;
        
        // Add click handler for this new avatar option
        div.addEventListener('click', () => {
            // Remove selected class from all options
            document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
            // Add selected class to clicked option
            div.classList.add('selected');
            // Update selected avatar
            selectedAvatar = imagePath; // Use the image path
            customAvatarData = null;
            const customAvatarPreview = document.getElementById('custom-avatar-preview');
            if (customAvatarPreview) customAvatarPreview.style.display = 'none';
            
            // Save to localStorage
            localStorage.setItem('domino_player_avatar', JSON.stringify({
                type: 'image',
                data: imagePath
            }));
            console.log('✅ Image avatar selected:', imagePath);
        });
        
        return div;
    }
    
    nameInput.focus(); 
    
    // 📱 REPLACE EMOJI AVATAR SELECTION WITH JUGADOR AVATARS
    function replaceEmojiAvatarsWithJugador() {
        console.log('🎯 Replacing emoji avatar selection with jugador avatars...');
        
        setTimeout(() => {
            const avatarOptions = document.querySelectorAll('.avatar-option');
            console.log('🔍 Found', avatarOptions.length, 'avatar options to replace');
            
            if (avatarOptions.length > 0) {
                const container = avatarOptions[0].parentElement;
                console.log('📦 Avatar container found:', container ? container.className : 'none');
                
                // Clear all existing emoji options
                avatarOptions.forEach(option => option.remove());
                
                // Add jugador default avatars
                const jugadorAvatars = [
                    { src: 'assets/defaults/jugador1_avatar.jpg', name: 'Jugador 1' },
                    { src: 'assets/defaults/jugador2_avatar.jpg', name: 'Jugador 2' },
                    { src: 'assets/defaults/jugador3_avatar.jpg', name: 'Jugador 3' },
                    { src: 'assets/defaults/jugador4_avatar.jpg', name: 'Jugador 4' }
                ];
                
                jugadorAvatars.forEach((avatar, index) => {
                    const div = document.createElement('div');
                    div.className = 'avatar-option';
                    div.dataset.avatar = avatar.src;
                    div.style.cssText = `
                        display: inline-block;
                        margin: 5px;
                        cursor: pointer;
                        border: 2px solid transparent;
                        border-radius: 50%;
                        transition: border-color 0.2s;
                        width: 44px;
                        height: 44px;
                        overflow: hidden;
                    `;
                    
                    const img = document.createElement('img');
                    img.src = avatar.src;
                    img.alt = avatar.name;
                    img.style.cssText = `
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        object-fit: cover;
                        display: block;
                    `;
                    
                    img.onload = () => {
                        console.log(`✅ Loaded avatar: ${avatar.src}`);
                    };
                    
                    img.onerror = () => {
                        console.log(`❌ Failed to load: ${avatar.src}`);
                        // Fallback to emoji
                        div.innerHTML = '';
                        div.textContent = ['🎯', '🎲', '🎮', '🏆'][index] || '👤';
                        div.style.fontSize = '28px';
                        div.style.display = 'flex';
                        div.style.alignItems = 'center';
                        div.style.justifyContent = 'center';
                        div.style.color = '#0066CC';
                        div.style.backgroundColor = '#f8f9fa';
                    };
                    
                    div.appendChild(img);
                    
                    // Add click handler
                    div.addEventListener('click', () => {
                        // Remove selected from all options
                        document.querySelectorAll('.avatar-option').forEach(opt => {
                            opt.style.border = '2px solid transparent';
                            opt.classList.remove('selected');
                        });
                        
                        // Select this one
                        div.style.border = '3px solid #007bff';
                        div.classList.add('selected');
                        
                        // Update selection
                        selectedAvatar = avatar.src;
                        customAvatarData = null;
                        
                        // Hide custom preview
                        const customPreview = document.getElementById('custom-avatar-preview');
                        if (customPreview) customPreview.style.display = 'none';
                        
                        // Save to localStorage
                        localStorage.setItem('domino_player_avatar', JSON.stringify({
                            type: 'image',
                            data: avatar.src
                        }));
                        
                        console.log('✅ Selected jugador avatar:', avatar.src);
                    });
                    
                    container.appendChild(div);
                });
                
                console.log('✅ Replaced', avatarOptions.length, 'emoji options with', jugadorAvatars.length, 'jugador avatars');
                
                // Select first jugador avatar by default
                if (container.children.length > 0) {
                    container.children[0].click();
                }
            } else {
                console.log('⚠️ No avatar options found to replace');
            }
        }, 500); // Wait for DOM to be ready
    }
    
    // Setup suggestion box functionality
    setupSuggestionBox();
    
    // Setup STUBBORN mobile suggestion box
    // console.log('🎯 Setting up STUBBORN mobile suggestion box...');
    setupStubbornBox();
    
    // 🎯 POPULATE AVATAR GRID WITH REAL AVATARS (DISABLED for now to restore emoji system)
    // populateAvatarGrid();
    
    // 📱 MOBILE FIX: Replace emoji avatar selection with jugador avatars (DISABLED to prevent script display)
    // replaceEmojiAvatarsWithJugador();

    // Handle avatar selection from grid
    avatarOptions.forEach(option => {
        option.addEventListener('click', () => {
            // console.log('Avatar option clicked:', option.dataset.avatar);
            // Remove selected class from all options
            avatarOptions.forEach(opt => opt.classList.remove('selected'));
            // Add selected class to clicked option
            option.classList.add('selected');
            // Update selected avatar
            selectedAvatar = option.dataset.avatar;
            customAvatarData = null; // Clear custom avatar if emoji selected
            customAvatarPreview.style.display = 'none';
            // console.log('✅ Avatar updated to:', selectedAvatar);
            
            // Save to localStorage
            localStorage.setItem('domino_player_avatar', JSON.stringify({
                type: 'emoji',
                data: selectedAvatar
            }));
            // console.log('✅ Avatar saved to localStorage');
        });
    });
    
    // Handle custom avatar upload
    avatarUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            // Check file size (limit to 500KB)
            if (file.size > 500 * 1024) {
                alert(window.lang.t('image_too_large'));
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                // Create an image element to compress the image
                const img = new Image();
                img.onload = () => {
                    // Create canvas for compression
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set maximum dimensions (keep it small for Socket.IO)
                    const maxSize = 64; // 64x64 pixels maximum
                    let { width, height } = img;
                    
                    // Calculate new dimensions maintaining aspect ratio
                    if (width > height) {
                        if (width > maxSize) {
                            height = (height * maxSize) / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = (width * maxSize) / height;
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw and compress the image
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to compressed data URL (JPEG with 70% quality)
                    customAvatarData = canvas.toDataURL('image/jpeg', 0.7);
                    selectedAvatar = null; // Clear emoji selection
                    
                    // Remove selected class from all emoji options
                    avatarOptions.forEach(opt => opt.classList.remove('selected'));
                    
                    // Show preview
                    customAvatarPreview.innerHTML = `<img src="${customAvatarData}" alt="Custom Avatar">`;
                    customAvatarPreview.style.display = 'block';
                    // console.log('Custom avatar uploaded and compressed');
                    
                    // Save to localStorage
                    localStorage.setItem('domino_player_avatar', JSON.stringify({
                        type: 'custom',
                        data: customAvatarData
                    }));
                    
                    // NEW: Also save as file for permanent storage
                    const currentPlayerName = nameInput.value.trim();
                    if (currentPlayerName) {
                        saveAvatarAsFile(currentPlayerName, customAvatarData);
                    } else {
                        // Show message to encourage entering name for permanent save
                        const statusDiv = document.getElementById('profile-status');
                        if (statusDiv) {
                            statusDiv.innerHTML = `💡 ${window.lang.t('enter_name_save_avatar')}`;
                            statusDiv.style.color = 'orange';
                            statusDiv.style.fontWeight = 'bold';
                        }
                        // console.log('⚠️ Enter name to save avatar as permanent file');
                    }
                    
                    // CLEAR FILE INPUT to reset "Seleccionar Archivo" text
                    event.target.value = '';
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Function to handle name submission
    const submitName = () => {
        const name = nameInput.value.trim();
        const roomId = roomInput.value.trim();
        const targetScoreSelect = document.getElementById('target-score');
        const targetScore = targetScoreSelect ? parseInt(targetScoreSelect.value, 10) : 70;
        
        // console.log('🔍 ROOM DEBUG - submitName called');
        // console.log('🔍 ROOM DEBUG - Room input value:', roomId);
        // console.log('🔍 ROOM DEBUG - Player name:', name);
        // console.log('🔍 ROOM DEBUG - Target score:', targetScore);
        
        if (name) {
            // Hide lobby and show game UI immediately
            const lobby = document.getElementById('lobby-container');
            const gameUI = document.getElementById('game-ui');
            if (lobby) lobby.style.display = 'none';
            if (gameUI) gameUI.style.display = 'block';

            // Don't save name to localStorage - keep it fresh each session
            // localStorage.setItem('domino_player_name', name);
            
            // FIXED: Skip file check since uploaded avatars get erased on deployment
            // Use custom avatar data if available, otherwise use emoji selection or default
            const avatarData = {
                type: customAvatarData ? 'custom' : 'emoji',
                data: customAvatarData || selectedAvatar
            };
            console.log('🎯 PRIORITY: Using selected avatar:', avatarData);
            connectToServer(name, avatarData, roomId, targetScore);
        }
    };
    

    // Handle button click
    setNameBtn.addEventListener('click', () => {
        // console.log('🔍 ROOM DEBUG - Button clicked, calling submitName()');
        submitName();
    });

    // Play waitingSound when newRoundBtn is clicked
    const newRoundBtn = document.getElementById('newRoundBtn');
    if (newRoundBtn) {
        newRoundBtn.addEventListener('click', () => {
            if (typeof waitingSound !== 'undefined' && waitingSound && waitingSound.isLoaded()) {
                waitingSound.play();
            }
        });
    }
    
    // Handle clear profile button
    const clearProfileBtn = document.getElementById('clear-profile-btn');
    if (clearProfileBtn) {
        clearProfileBtn.addEventListener('click', () => {
            // Clear ALL game-related localStorage
            localStorage.removeItem('domino_player_name');
            localStorage.removeItem('domino_player_avatar');
            localStorage.removeItem('domino_game_points');
            // Keep language preference - don't remove 'domino_game_language'
            
            // console.log('🧹 Comprehensive profile clear - all cached data removed');
            
            // Reset form
            nameInput.value = '';
            customAvatarData = null;
            selectedAvatar = '🎯';
            customAvatarPreview.style.display = 'none';
            
            // Reset avatar selection to default
            avatarOptions.forEach(opt => opt.classList.remove('selected'));
            const defaultOption = document.querySelector('[data-avatar="🎯"]');
            if (defaultOption) {
                defaultOption.classList.add('selected');
            }
            
            // Hide status message
            const profileStatus = document.getElementById('profile-status');
            if (profileStatus) {
                profileStatus.style.display = 'none';
            }
            
            // console.log('Profile cleared - large avatar data removed');
            nameInput.focus();
        });
    }
    
    // Add emergency function to clear large avatar data
    window.clearLargeAvatarData = () => {
        localStorage.removeItem('domino_player_avatar');
        // console.log('Large avatar data cleared from localStorage');
        location.reload();
    };
    
    // Function to save avatar as permanent file
    function saveAvatarAsFile(playerName, avatarData) {
        // Save avatar for uppercase initials
        fetch('/save-avatar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerName: playerName.toUpperCase(),
                avatarData: avatarData
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message to user
                const statusDiv = document.getElementById('profile-status');
                if (statusDiv) {
                    statusDiv.innerHTML = `✅ ${window.lang.t('avatar_saved')} ${data.filename}`;
                    statusDiv.style.color = 'green';
                    statusDiv.style.fontWeight = 'bold';
                }
                localStorage.removeItem('domino_player_avatar');
            } else {
                console.error('❌ Failed to save avatar file:', data.error);
            }
        })
        .catch(error => {
            console.error('❌ Error saving avatar file:', error);
        });

        // Save avatar for lowercase initials
        fetch('/save-avatar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerName: playerName.toLowerCase(),
                avatarData: avatarData
            })
        })
        .then(response => response.json())
        .then(data => {
            // Optionally handle response for lowercase file
        })
        .catch(error => {
            console.error('❌ Error saving avatar file (lowercase):', error);
        });
    }
    
    // Handle Enter key press
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            // console.log('🔍 ROOM DEBUG - Enter key pressed, calling submitName()');
            submitName();
        }
    });
    
    // Auto-save custom avatar as file when name is entered
    nameInput.addEventListener('input', () => {
        const currentName = nameInput.value.trim();
        if (currentName.length >= 2 && customAvatarData) {
            saveAvatarAsFile(currentName, customAvatarData);
        }
    });
}
/**
 * Sets up the suggestion box functionality in the lobby.
 */
function setupSuggestionBox() {
    const toggleBtn = document.getElementById('toggle-suggestion-btn');
    const suggestionBox = document.getElementById('suggestion-box');
    const suggestionText = document.getElementById('suggestion-text');
    const submitBtn = document.getElementById('submit-suggestion-btn');
    const cancelBtn = document.getElementById('cancel-suggestion-btn');
    const statusDiv = document.getElementById('suggestion-status');
    
    if (!toggleBtn || !suggestionBox || !suggestionText || !submitBtn || !cancelBtn || !statusDiv) {
        console.warn('Suggestion box elements not found');
        return;
    }
    
    // Toggle suggestion box visibility
    toggleBtn.addEventListener('click', () => {
        const isHidden = suggestionBox.classList.contains('hidden');
        if (isHidden) {
            suggestionBox.classList.remove('hidden');
            suggestionText.focus();
            toggleBtn.textContent = `🔙 ${window.lang.t('close_suggestions')}`;
        } else {
            suggestionBox.classList.add('hidden');
            toggleBtn.textContent = `💡 ${window.lang.t('suggestions_box')}`;
            // Clear form when closing
            suggestionText.value = '';
            statusDiv.textContent = '';
            statusDiv.className = '';
        }
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
        suggestionBox.classList.add('hidden');
        toggleBtn.textContent = `💡 ${window.lang.t('suggestions_box')}`;
        suggestionText.value = '';
        statusDiv.textContent = '';
        statusDiv.className = '';
    });
    
    // Submit suggestion
    submitBtn.addEventListener('click', async () => {
        const suggestion = suggestionText.value.trim();
        
        if (!suggestion) {
            statusDiv.textContent = `⚠️ ${window.lang.t('please_write_suggestion')}`;
            statusDiv.className = 'error';
            return;
        }
        
        if (suggestion.length < 10) {
            statusDiv.textContent = `⚠️ ${window.lang.t('suggestion_too_short')}`;
            statusDiv.className = 'error';
            return;
        }
        
        // Disable submit button and show loading
        submitBtn.disabled = true;
        statusDiv.textContent = `📤 ${window.lang.t('sending_suggestion')}`;
        statusDiv.className = 'loading';
        
        try {
            const response = await fetch('/submit-suggestion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    suggestion: suggestion,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    language: navigator.language
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                statusDiv.textContent = `✅ ${window.lang.t('suggestion_sent')}`;
                statusDiv.className = 'success';
                suggestionText.value = '';
                
                // Auto-close after 3 seconds
                setTimeout(() => {
                    suggestionBox.classList.add('hidden');
                    toggleBtn.textContent = `💡 ${window.lang.t('suggestions_box')}`;
                    statusDiv.textContent = '';
                    statusDiv.className = '';
                }, 3000);
            } else {
                statusDiv.textContent = `❌ ${window.lang.t('suggestion_error')}`;
                statusDiv.className = 'error';
            }
        } catch (error) {
            console.error('Error submitting suggestion:', error);
            statusDiv.textContent = `❌ ${window.lang.t('connection_error')}`;
            statusDiv.className = 'error';
        } finally {
            submitBtn.disabled = false;
        }
    });
    
    // Handle Enter key in textarea (Shift+Enter for new line, Enter to submit)
    suggestionText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitBtn.click();
        }
    });
    
    // Character counter
    suggestionText.addEventListener('input', () => {
        const remaining = 500 - suggestionText.value.length;
        const placeholder = suggestionText.getAttribute('placeholder').split('(')[0].trim();
        suggestionText.setAttribute('placeholder', `${placeholder} (${remaining} caracteres restantes)`);
    });
}

// STUBBORN Mobile Suggestion Box - Simple and Direct
function setupStubbornBox() {
    // console.log('💪 STUBBORN: Setting up mobile suggestion box...');
    
    const toggleBtn = document.getElementById('stubborn-toggle-btn');
    const container = document.getElementById('stubborn-container');
    const textArea = document.getElementById('stubborn-text');
    const sendBtn = document.getElementById('stubborn-send-btn');
    const closeBtn = document.getElementById('stubborn-close-btn');
    const status = document.getElementById('stubborn-status');
    
    // Translation elements
    const btnText = document.getElementById('stubborn-btn-text');
    const titleText = document.getElementById('stubborn-title');
    const sendText = document.getElementById('stubborn-send-text');
    const closeText = document.getElementById('stubborn-close-text');
    
    // console.log('💪 STUBBORN elements check:');
    // console.log('- Toggle:', !!toggleBtn);
    // console.log('- Container:', !!container);
    // console.log('- Text:', !!textArea);
    // console.log('- Send:', !!sendBtn);
    // console.log('- Close:', !!closeBtn);
    // console.log('- Status:', !!status);
    
    if (!toggleBtn || !container) {
        console.error('💪 STUBBORN: Essential elements missing!');
        return;
    }
    
    // Apply translations
    function applyTranslations() {
        if (window.lang && window.lang.t) {
            if (btnText) btnText.textContent = window.lang.t('suggestions_box') || 'Suggestion Box';
            if (titleText) titleText.textContent = window.lang.t('help_us_improve') || 'Help Us Improve';
            if (sendText) sendText.textContent = window.lang.t('send') || 'Send';
            if (closeText) closeText.textContent = window.lang.t('close') || 'Close';
            if (textArea) {
                const placeholder = window.lang.t('suggestion_placeholder') || 'Share your ideas, suggestions or report problems...';
                textArea.placeholder = placeholder;
            }
        }
    }
    
    // Apply translations initially
    applyTranslations();
    
    // Listen for language changes
    if (window.addEventListener) {
        window.addEventListener('languageChanged', applyTranslations);
    }
    
    // Toggle button click
    toggleBtn.addEventListener('click', () => {
        // console.log('💪 STUBBORN: Toggle clicked!');
        const isHidden = container.style.display === 'none';
        container.style.display = isHidden ? 'block' : 'none';
        // console.log('💪 STUBBORN: Container now', isHidden ? 'SHOWN' : 'HIDDEN');
    });
    
    // Close button click
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            // console.log('💪 STUBBORN: Close clicked!');
            container.style.display = 'none';
            if (textArea) textArea.value = '';
            if (status) status.textContent = '';
        });
    }
    
    // Send button click
    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            // console.log('💪 STUBBORN: Send clicked!');
            const text = textArea ? textArea.value.trim() : '';
            
            if (!text) {
                if (status) {
                    status.textContent = '⚠️ Por favor escribe una sugerencia';
                    status.style.color = '#dc3545';
                }
                return;
            }
            
            if (text.length < 10) {
                if (status) {
                    status.textContent = '⚠️ La sugerencia debe tener al menos 10 caracteres';
                    status.style.color = '#dc3545';
                }
                return;
            }
            
            // Disable button and show loading
            sendBtn.disabled = true;
            if (status) {
                status.textContent = '📤 Enviando sugerencia...';
                status.style.color = '#007bff';
            }
            
            try {
                const response = await fetch('/submit-suggestion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        suggestion: text,
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                        language: navigator.language,
                        source: 'stubborn-mobile'
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    if (status) {
                        status.textContent = '✅ ¡Sugerencia enviada! Gracias por tu ayuda';
                        status.style.color = '#28a745';
                    }
                    if (textArea) textArea.value = '';
                    
                    // Auto-close after 3 seconds
                    setTimeout(() => {
                        container.style.display = 'none';
                        if (status) {
                            status.textContent = '';
                            status.style.color = '';
                        }
                    }, 3000);
                } else {
                    if (status) {
                        status.textContent = '❌ Error al enviar. Inténtalo más tarde';
                        status.style.color = '#dc3545';
                    }
                }
            } catch (error) {
                console.error('💪 STUBBORN: Send error:', error);
                if (status) {
                    status.textContent = '❌ Error de conexión. Inténtalo más tarde';
                    status.style.color = '#dc3545';
                }
            } finally {
                sendBtn.disabled = false;
            }
        });
    }
    
    // console.log('💪 STUBBORN: Setup complete!');
}

function setupMobileSuggestionBox() {
    // console.log('=== Setting up Mobile Suggestion Box ===');
    const toggleBtn = document.getElementById('toggle-suggestion-btn-mobile');
    const suggestionBox = document.getElementById('mobile-suggestion-box');
    const suggestionText = document.getElementById('mobile-suggestion-text');
    const submitBtn = document.getElementById('mobile-submit-suggestion-btn');
    const cancelBtn = document.getElementById('mobile-cancel-suggestion-btn');
    const statusDiv = document.getElementById('mobile-suggestion-status');
    
    // console.log('Mobile suggestion elements found:');
    // console.log('- Toggle button:', toggleBtn);
    // console.log('- Suggestion box:', suggestionBox);
    // console.log('- Text area:', suggestionText);
    // console.log('- Submit button:', submitBtn);
    // console.log('- Cancel button:', cancelBtn);
    // console.log('- Status div:', statusDiv);
    
    if (!toggleBtn) {
        console.error('Mobile toggle button not found!');
        return;
    }
    
    if (!suggestionBox) {
        console.error('Mobile suggestion box not found!');
        return;
    }
    
    if (!suggestionText || !submitBtn || !cancelBtn || !statusDiv) {
        console.warn('Some mobile suggestion box elements not found - will create them');
        
        // Create missing elements if they don't exist
        if (!suggestionText) {
            const textarea = document.createElement('textarea');
            textarea.id = 'mobile-suggestion-text';
            textarea.placeholder = 'Comparte tus ideas, sugerencias o reporta problemas...';
            textarea.maxLength = 500;
            suggestionBox.appendChild(textarea);
        }
        
        if (!submitBtn || !cancelBtn || !statusDiv) {
            // Create buttons container
            let buttonsDiv = suggestionBox.querySelector('.mobile-suggestion-buttons');
            if (!buttonsDiv) {
                buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'mobile-suggestion-buttons';
                suggestionBox.appendChild(buttonsDiv);
            }
            
            if (!submitBtn) {
                const submit = document.createElement('button');
                submit.id = 'mobile-submit-suggestion-btn';
                submit.textContent = '📤 Enviar';
                buttonsDiv.appendChild(submit);
            }
            
            if (!cancelBtn) {
                const cancel = document.createElement('button');
                cancel.id = 'mobile-cancel-suggestion-btn';
                cancel.textContent = '❌ Cancelar';
                buttonsDiv.appendChild(cancel);
            }
            
            if (!statusDiv) {
                const status = document.createElement('div');
                status.id = 'mobile-suggestion-status';
                suggestionBox.appendChild(status);
            }
        }
        
        // Re-get elements after creation
        const newSuggestionText = document.getElementById('mobile-suggestion-text');
        const newSubmitBtn = document.getElementById('mobile-submit-suggestion-btn');
        const newCancelBtn = document.getElementById('mobile-cancel-suggestion-btn');
        const newStatusDiv = document.getElementById('mobile-suggestion-status');
        
        // console.log('Elements after creation:');
        // console.log('- Text area:', newSuggestionText);
        // console.log('- Submit button:', newSubmitBtn);
        // console.log('- Cancel button:', newCancelBtn);
        // console.log('- Status div:', newStatusDiv);
    }
    
    // console.log('Mobile suggestion box setup successful');
    
    // Toggle suggestion box visibility
    toggleBtn.addEventListener('click', () => {
        // console.log('Mobile suggestion toggle clicked!');
        // console.log('Current suggestion box display:', suggestionBox.style.display);
        // console.log('Suggestion box computed style:', window.getComputedStyle(suggestionBox).display);
        
        const isHidden = suggestionBox.style.display === 'none' || !suggestionBox.style.display;
        // console.log('Is hidden:', isHidden);
        
        if (isHidden) {
            suggestionBox.style.display = 'block';
            suggestionBox.style.visibility = 'visible';
            suggestionBox.style.opacity = '1';
            
            // Re-get elements in case they were created dynamically
            const currentSuggestionText = document.getElementById('mobile-suggestion-text');
            if (currentSuggestionText) {
                currentSuggestionText.focus();
            }
            
            // Use fallback text if translation function not available
            const closeText = (window.lang && window.lang.t) ? window.lang.t('close_suggestions') : 'Cerrar';
            toggleBtn.textContent = `🔙 ${closeText}`;
            // console.log('Suggestion box opened');
        } else {
            suggestionBox.style.display = 'none';
            
            // Use fallback text if translation function not available
            const suggestionsText = (window.lang && window.lang.t) ? window.lang.t('suggestions_box') : 'Buzón de Sugerencias';
            toggleBtn.textContent = `💡 ${suggestionsText}`;
            
            // Clear form when closing
            const currentSuggestionText = document.getElementById('mobile-suggestion-text');
            const currentStatusDiv = document.getElementById('mobile-suggestion-status');
            if (currentSuggestionText) currentSuggestionText.value = '';
            if (currentStatusDiv) currentStatusDiv.textContent = '';
            // console.log('Suggestion box closed');
        }
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
        suggestionBox.style.display = 'none';
        toggleBtn.textContent = `💡 ${window.lang.t('suggestions_box')}`;
        suggestionText.value = '';
        statusDiv.textContent = '';
    });
    
    // Submit suggestion
    submitBtn.addEventListener('click', async () => {
        const suggestion = suggestionText.value.trim();
        
        if (!suggestion) {
            statusDiv.textContent = `⚠️ ${window.lang.t('please_write_suggestion')}`;
            statusDiv.style.color = 'red';
            return;
        }
        
        if (suggestion.length < 10) {
            statusDiv.textContent = `⚠️ ${window.lang.t('suggestion_too_short')}`;
            statusDiv.style.color = 'red';
            return;
        }
        
        // Disable submit button and show loading
        submitBtn.disabled = true;
        statusDiv.textContent = `📤 ${window.lang.t('sending_suggestion')}`;
        statusDiv.style.color = 'blue';
        
        try {
            const response = await fetch('/submit-suggestion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    suggestion: suggestion,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    language: navigator.language
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                statusDiv.textContent = `✅ ${window.lang.t('suggestion_sent')}`;
                statusDiv.style.color = 'green';
                suggestionText.value = '';
                
                // Auto-close after 3 seconds
                setTimeout(() => {
                    suggestionBox.style.display = 'none';
                    toggleBtn.textContent = `💡 ${window.lang.t('suggestions_box')}`;
                    statusDiv.textContent = '';
                }, 3000);
            } else {
                statusDiv.textContent = `❌ ${window.lang.t('suggestion_error')}`;
                statusDiv.style.color = 'red';
            }
        } catch (error) {
            console.error('Error submitting suggestion:', error);
            statusDiv.textContent = `❌ ${window.lang.t('connection_error')}`;
            statusDiv.style.color = 'red';
        } finally {
            submitBtn.disabled = false;
        }
    });
    
    // Handle Enter key in textarea (Shift+Enter for new line, Enter to submit)
    suggestionText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitBtn.click();
        }
    });
}

// Debug function to test mobile suggestion box manually
window.testMobileSuggestion = function() {
    const box = document.getElementById('mobile-suggestion-box');
    if (box) {
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
        // console.log('Mobile suggestion box toggled, display:', box.style.display);
    } else {
        // console.log('Mobile suggestion box not found');
    }
};

function setupMobileSuggestionBoxGame() {
    // console.log('=== Setting up Mobile Suggestion Box Game ===');
    const toggleBtn = document.getElementById('toggle-suggestion-btn-mobile-game');
    const suggestionBox = document.getElementById('mobile-suggestion-box-game');
    const suggestionText = document.getElementById('mobile-suggestion-text-game');
    const submitBtn = document.getElementById('mobile-submit-suggestion-btn-game');
    const cancelBtn = document.getElementById('mobile-cancel-suggestion-btn-game');
    const statusDiv = document.getElementById('mobile-suggestion-status-game');
    
    // console.log('Mobile suggestion game elements found:');
    // console.log('- Toggle button:', toggleBtn);
    // console.log('- Suggestion box:', suggestionBox);
    // console.log('- Text area:', suggestionText);
    // console.log('- Submit button:', submitBtn);
    // console.log('- Cancel button:', cancelBtn);
    // console.log('- Status div:', statusDiv);
    
    if (!toggleBtn) {
        console.error('Mobile game toggle button not found!');
        return;
    }
    
    if (!suggestionBox) {
        console.error('Mobile game suggestion box not found!');
        return;
    }
    
    if (!suggestionText || !submitBtn || !cancelBtn || !statusDiv) {
        console.warn('Some mobile game suggestion box elements not found - will create them');
        // console.log('Missing elements:');
        // console.log('- suggestionText:', !!suggestionText);
        // console.log('- submitBtn:', !!submitBtn);
        // console.log('- cancelBtn:', !!cancelBtn);
        // console.log('- statusDiv:', !!statusDiv);
        
        // Don't return early - continue with just the toggle button
        // return;
    }
    
    // console.log('Mobile suggestion box game setup successful');
    
    // Toggle suggestion box visibility
    toggleBtn.addEventListener('click', () => {
        // console.log('🎯 GAME UI - Mobile suggestion game toggle clicked!');
        // console.log('Current game suggestion box display:', suggestionBox.style.display);
        // console.log('Game suggestion box computed style:', window.getComputedStyle(suggestionBox).display);
        
        // Re-get elements in case they weren't found initially
        const currentSuggestionText = document.getElementById('mobile-suggestion-text-game');
        const currentStatusDiv = document.getElementById('mobile-suggestion-status-game');
        
        const isHidden = suggestionBox.style.display === 'none' || !suggestionBox.style.display;
        // console.log('Game suggestion box is hidden:', isHidden);
        
        if (isHidden) {
            suggestionBox.style.display = 'block';
            suggestionBox.style.visibility = 'visible';
            suggestionBox.style.opacity = '1';
            
            if (currentSuggestionText) {
                currentSuggestionText.focus();
            }
            
            // Use fallback text if translation function not available
            const closeText = (window.lang && window.lang.t) ? window.lang.t('close_suggestions') : 'Cerrar';
            toggleBtn.textContent = `🔙 ${closeText}`;
            // console.log('🎯 Game suggestion box opened');
        } else {
            suggestionBox.style.display = 'none';
            
            // Use fallback text if translation function not available  
            const suggestionsText = (window.lang && window.lang.t) ? window.lang.t('suggestions_box') : 'Buzón de Sugerencias';
            toggleBtn.textContent = `💡 ${suggestionsText}`;
            
            // Clear form when closing
            if (currentSuggestionText) currentSuggestionText.value = '';
            if (currentStatusDiv) currentStatusDiv.textContent = '';
            // console.log('🎯 Game suggestion box closed');
        }
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
        suggestionBox.style.display = 'none';
        toggleBtn.textContent = `💡 ${window.lang.t('suggestions_box')}`;
        suggestionText.value = '';
        statusDiv.textContent = '';
    });
    
    // Submit suggestion
    submitBtn.addEventListener('click', async () => {
        const suggestion = suggestionText.value.trim();
        
        if (!suggestion) {
            statusDiv.textContent = `⚠️ ${window.lang.t('please_write_suggestion')}`;
            statusDiv.style.color = 'red';
            return;
        }
        
        if (suggestion.length < 10) {
            statusDiv.textContent = `⚠️ ${window.lang.t('suggestion_too_short')}`;
            statusDiv.style.color = 'red';
            return;
        }
        
        // Disable submit button and show loading
        submitBtn.disabled = true;
        statusDiv.textContent = `📤 ${window.lang.t('sending_suggestion')}`;
        statusDiv.style.color = 'blue';
        
        try {
            const response = await fetch('/submit-suggestion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    suggestion: suggestion,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    language: navigator.language
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                statusDiv.textContent = `✅ ${window.lang.t('suggestion_sent')}`;
                statusDiv.style.color = 'green';
                suggestionText.value = '';
                
                // Auto-close after 3 seconds
                setTimeout(() => {
                    suggestionBox.style.display = 'none';
                    toggleBtn.textContent = `💡 ${window.lang.t('suggestions_box')}`;
                    statusDiv.textContent = '';
                }, 3000);
            } else {
                statusDiv.textContent = `❌ ${window.lang.t('suggestion_error')}`;
                statusDiv.style.color = 'red';
            }
        } catch (error) {
            console.error('Error submitting suggestion:', error);
            statusDiv.textContent = `❌ ${window.lang.t('connection_error')}`;
            statusDiv.style.color = 'red';
        } finally {
            submitBtn.disabled = false;
        }
    });
    
    // Handle Enter key in textarea (Shift+Enter for new line, Enter to submit)
    suggestionText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitBtn.click();
        }
    });
}

/**
 * Establishes the connection to the server via Socket.IO and sets up listeners.
 */
function connectToServer(playerName, avatarData, roomId, targetScore) {
    // *** GENTLE LANDSCAPE ENCOURAGEMENT ***
    if (window.innerWidth <= 900) {
        // console.log('🔄 Encouraging landscape mode...');
        
        // Mark as about to sign in
        document.body.classList.add('about-to-sign-in');
        
        // Try Screen Orientation API gently
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').then(() => {
                // console.log('✅ Landscape locked successfully');
            }).catch(err => {
                // console.log('⚠️ Orientation lock failed:', err);
            });
        }
    }
    
    if (typeof targetScore === 'undefined' || targetScore === null) {
        const targetScoreSelect = document.getElementById('target-score');
        targetScore = targetScoreSelect ? parseInt(targetScoreSelect.value, 10) || 70 : 70;
    }
    socket = io();
    // Listen for player reconnected event (custom event from server)
    socket.on('playerReconnected', (data) => {
        showSystemMessage(isSpanish ?
            `${data.playerName} ha vuelto a conectarse` :
            `${data.playerName} has reconnected`, 'success');
        if (typeof waitingSound !== 'undefined' && waitingSound && waitingSound.isLoaded()) {
            waitingSound.play();
        }
    });
// =========================================================
// == [ROUTINE] SOCKET.IO RECONNECT HANDLING (Mobile Fix)
// =========================================================

// Save player data locally when signing in
function savePlayerData(name, avatar, roomId, targetScore) {
  try {
    const playerData = { 
      name, 
      avatar, 
      roomId: roomId || null, 
      targetScore: targetScore || 70 
    };
    localStorage.setItem("playerData", JSON.stringify(playerData));
    // console.log("💾 Saved playerData to localStorage:", playerData);
  } catch (err) {
    console.warn("⚠️ Could not save playerData:", err);
  }
}

// Load saved player data (if any)
function loadPlayerData() {
  try {
    const raw = localStorage.getItem("playerData");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("⚠️ Could not parse playerData:", err);
    return null;
  }
}

// Handle disconnects
socket.on("disconnect", (reason) => {
  // console.log("⚠️ Socket disconnected:", reason);
});

// Handle automatic reconnect
socket.on("reconnect", (attempt) => {
  // console.log("✅ Socket reconnected after", attempt, "tries");
  const saved = loadPlayerData();
  if (saved) {
    // console.log("🔄 Re-emitting setPlayerName with saved data:", saved);
    socket.emit("setPlayerName", saved);
  }
});

// Handle reconnection errors
socket.on("reconnect_error", (err) => {
  console.warn("⚠️ Reconnect error:", err);
});

    socket.on('connect', () => {
        // console.log("Connected to server.");
        // console.log('🔍 CONNECT DEBUG: Setting up waiting message system');
        
        // AGGRESSIVE CLEAR: Clear points immediately on fresh connection to ensure clean start
        // console.log('🧹 Clearing any cached points data on fresh connection');
        playerPointsWon = {};
        previousTeamScores = { teamA: 0, teamB: 0 };
        
        // For new connections, always start fresh - don't restore old localStorage data
        // This ensures new rooms/sessions start with 0's
        // console.log('🆕 Starting with completely fresh points data for new connection');
        // Force clear localStorage to prevent carrying over old scores to new rooms
        try {
            localStorage.removeItem('domino_game_points');
            // console.log('🗑️ Force cleared old localStorage points data');
        } catch (error) {
            console.warn('⚠️ Could not clear localStorage:', error);
        }
        
        // console.log('🔍 ROOM DEBUG - About to emit setPlayerName with roomId:', roomId);
        socket.emit('setPlayerName', { name: playerName, avatar: avatarData, roomId: roomId, targetScore: targetScore });


// Automatically save to localStorage for reconnects
savePlayerData( playerName,  avatarData,  roomId,  targetScore);



        // Mark as signed in to hide rotation messages
        document.body.classList.add('signed-in');
        document.body.classList.remove('about-to-sign-in');

        // Hide lobby and show game UI when connected
        const lobby = document.getElementById('lobby-container');
        const gameUI = document.getElementById('game-ui');
        if (lobby) lobby.style.display = 'none';
        if (gameUI) gameUI.style.display = 'block';
        
        // Show initial waiting message only if room is not already full
        setTimeout(() => {
            // Check if room was already full when we joined (4th player case)
            if (window.isRoomFull) {
                // console.log('🎯 Room already full, not showing waiting message');
                return;
            }
            
            // Also check if a playerCount event already handled this
            const waitingDiv = document.getElementById('waiting-for-players');
            if (waitingDiv && getComputedStyle(waitingDiv).display !== 'none') {
                // console.log('⏳ Waiting message already visible from playerCount event');
                return;
            }
            
            // console.log('🔍 Showing initial waiting message');
            showWaitingForPlayersMessage();
            // Initial display until server sends playerCount update
            const playerCountText = document.getElementById('player-count-text');
            if (playerCountText) {
                playerCountText.textContent = window.lang.t('connecting');
            }
        }, 300); // Increased delay to let playerCount event arrive first
        
        // Mark as signed in for portrait mode blocking via CSS
        document.body.classList.add('signed-in');
        
        // Continue gentle landscape encouragement for mobile devices
        if (window.innerWidth <= 900) {
            // Try to maintain landscape orientation
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(err => {
                    // console.log('Landscape lock failed:', err);
                });
            }
        }
        
        // Setup mobile suggestion box for game UI after elements are visible
        // console.log('🎯 Game UI shown - setting up STUBBORN suggestion box...');
        setTimeout(() => {
            // console.log('🎯 About to call setupStubbornBox...');
            setupStubbornBox();
        }, 100); // Small delay to ensure elements are rendered
        
        // Remove language selector when entering game
        const languageSelector = document.getElementById('language-selector');
        if (languageSelector) {
            languageSelector.remove();
        }
        
        // Create points table when game UI becomes visible
        setTimeout(() => {
            createPointsTableNow();
        }, 500);
    });

    socket.on('playerAssigned', (data) => { 
        // Handle both old string format and new object format
        if (typeof data === 'string') {
            myJugadorName = data; 
        } else {
            myJugadorName = data.playerName;
            // Store room status for waiting message logic
            window.isRoomFull = data.isRoomFull;
        }
    });

    // Listen for animation events from other players
    socket.on('playTileAnimation', (data) => {
        // Don't animate for myself since I already started my own animation
        if (data.playerName === myJugadorName) {
            return;
        }
        
        // Calculate start position for the player who played
        const startPos = getPlayerHandPositionByName(data.playerName);
        const centerPos = { x: width/2, y: height/2 - 100 };
        
        startTileAnimation(data.tile, startPos, centerPos, data.playerName);
        
        // Clear any pending timer since animation is now active
        if (window.boardUpdateTimer) {
            clearTimeout(window.boardUpdateTimer);
            window.boardUpdateTimer = null;
        }
    });
function startGameSession() {
  // Show game area
  document.getElementById('game-area').style.display = 'block';

  // ✅ Add this line here
  document.body.classList.add('in-game');

  // Continue with game setup...
}


    // Handle player count updates for waiting message
    socket.on('playerCount', (data) => {
        const { count, roomFull } = data;
        // console.log('👥 Player count update:', count, 'Room full:', roomFull);
        waitingSound.play();
        // Add debugging to check element existence
        const waitingDiv = document.getElementById('waiting-for-players');
        const playerCountText = document.getElementById('player-count-text');
        const messageText = document.getElementById('waiting-message-text');
        
               
        if (roomFull) {
            waitingSound.play();
            // 4 players - hide waiting message for everyone
            // console.log('🎯 Room full, hiding waiting message');
            hideWaitingForPlayersMessage();
        } else if (count > 0) {
            // 1-3 players - show waiting message with count
            // console.log('⏳ Showing waiting message for', count, 'players');
            showWaitingForPlayersMessage();
            updatePlayerCountDisplay(count);
             
            // Also update room status for any players who might have just joined
            window.isRoomFull = roomFull;
        }
    });

    socket.on('gameState', (state) => {
        // Check if this is a brand new game or initial connection
        const wasGameState = !!gameState && !!gameState.matchNumber;
        const isNewGame = !wasGameState || 
                         (state.matchNumber === 1 && (!state.teamScores || (state.teamScores.teamA === 0 && state.teamScores.teamB === 0)));
        
        // Simple waiting message logic: only hide when game actually starts
        if (state.gameInitialized) {
            // console.log('✅ Game started, hiding waiting message');
            hideWaitingForPlayersMessage();
        }
        // Note: We don't show waiting messages here anymore - handled by playerCount updates
        
        // AGGRESSIVE CLEARING: Clear points on any of these conditions
        const shouldClearPoints = isNewGame || 
                                 !wasGameState || // First gameState received
                                 (state.matchNumber === 1 && wasGameState && gameState.matchNumber > 1); // Match reset to 1
        
        // ALWAYS clear points when entering a new room (matchNumber 1 with fresh state)
        const isEnteringNewRoom = state.matchNumber === 1 && (!state.teamScores || (state.teamScores.teamA === 0 && state.teamScores.teamB === 0));
        
        if (shouldClearPoints || isEnteringNewRoom) {
            // console.log('🆕 New game/session detected - clearing all points data');
            // console.log(`Previous match: ${gameState?.matchNumber || 'none'}, New match: ${state.matchNumber}`);
            clearAllPointsData();
            
            // Reset animation system for new game
            isAnimating = false;
            animatingTile = null;
            // console.log('🎬 Animation system reset for new game');
        }
        
        // Note: Removed automatic animation for other players here
        // Each player will see animations when the active player starts them
        // The animation will complete BEFORE the tile appears on the board
        
        // Check if a new tile was added to the board (for highlight on remote players)
        const oldBoardLength = gameState ? gameState.board?.length || 0 : 0;
        const newBoardLength = state.board?.length || 0;
        
        // If a new tile was added to the board, ALWAYS delay the update to allow animation
        if (newBoardLength > oldBoardLength) {
            // Store the new state to apply after a short delay to allow animation to start
            window.pendingGameStateUpdate = state;
            
            // Update gameState immediately for non-board properties (messages, game status, etc.)
            // but preserve the old board to allow animation to complete first
            const currentBoard = gameState.board;
            gameState = { ...state };  // Update all properties
            gameState.board = currentBoard;  // Keep old board until animation completes
            
            // Set up a callback to apply the board update when animation finishes
            window.delayedBoardUpdate = function() {
                if (window.pendingGameStateUpdate) {
                    gameState.board = window.pendingGameStateUpdate.board;  // Only update the board
                    window.pendingGameStateUpdate = null;
                    
                    // Apply the highlight logic for the new tile
                    if (gameState.lastPlayedTile) {
                        if (!lastPlayedHighlight.tile || millis() - lastPlayedHighlight.timestamp > 1000) {
                            lastPlayedHighlight.tile = gameState.lastPlayedTile;
                            lastPlayedHighlight.timestamp = millis();
                        }
                    }
                }
            };
            
            // Check if any animation is currently running (either remote or current player)
            const anyAnimationRunning = isAnimating || (window.currentPlayerAnimation && window.currentPlayerAnimation.isActive);
            
            // If no animation is currently running, start a timer to apply the update
            // This handles cases where the gameState arrives before playTileAnimation
            if (!anyAnimationRunning) {
                window.boardUpdateTimer = setTimeout(() => {
                    const stillNoAnimation = !isAnimating && !(window.currentPlayerAnimation && window.currentPlayerAnimation.isActive);
                    if (window.delayedBoardUpdate && stillNoAnimation) {
                        window.delayedBoardUpdate();
                        window.delayedBoardUpdate = null;
                    }
                    window.boardUpdateTimer = null;
                }, 100);
            }
        } else {
            // No new tile, update immediately
            gameState = state;
            
            // If board length increased and we have a lastPlayedTile, set highlight
            // (This covers remote player moves - current player highlight is set in moveSuccess)
            if (newBoardLength > oldBoardLength && gameState.lastPlayedTile) {
                // Only set if we don't already have a recent highlight (avoid double-setting for current player)
                if (!lastPlayedHighlight.tile || millis() - lastPlayedHighlight.timestamp > 1000) {
                    lastPlayedHighlight.tile = gameState.lastPlayedTile;
                    lastPlayedHighlight.timestamp = millis();
                }
            }
        }
        // (Removed points-objective update here; now handled by updateRoomInfo for compact legend)
        const newRoundContainer = document.getElementById('new-round-container');
        if (!newRoundContainer) return;
        // TRIPLE CHECK: Only show round dialogs if we have a player assigned AND are connected
        if (!myJugadorName || !socket || !socket.connected) {
            // Force hide with multiple methods
            newRoundContainer.style.display = 'none !important';
            newRoundContainer.style.visibility = 'hidden !important';
            newRoundContainer.style.opacity = '0';
            newRoundContainer.style.zIndex = '-9999';
            return;
        }
        // ...existing code for dialog logic...
        let isClientDetectedBlock = false;
        if (gameState.jugadoresInfo && gameState.jugadoresInfo.length > 0 && !gameState.gameInitialized) {
            const playersWithTiles = gameState.jugadoresInfo.filter(player => player.tileCount > 0);
            const playersWithNoTiles = gameState.jugadoresInfo.filter(player => player.tileCount === 0);
            const hasWinMessage = gameState.endRoundMessage && gameState.endRoundMessage.toLowerCase().includes('domino');
            const hasBlockedMessage = gameState.endRoundMessage && gameState.endRoundMessage.toLowerCase().includes('juego cerrado');
            if (hasBlockedMessage) {
                isClientDetectedBlock = true;
            } else if (playersWithTiles.length > 1 && playersWithNoTiles.length === 0 && !hasWinMessage) {
                isClientDetectedBlock = true;
            }
        }
        const shouldShowDialog = (
            (!gameState.gameInitialized && (
                !!gameState.endRoundMessage || 
                !!gameState.endMatchMessage ||
                !!gameState.matchOver || 
                !!gameState.roundOver ||
                !!gameState.gameOver ||
                isClientDetectedBlock
            )) ||
            !!gameState.gameBlocked
        );
        if (shouldShowDialog) {
            const roundOverMessageDiv = document.getElementById('round-over-message');
            const newRoundBtn = document.getElementById('newRoundBtn');
            if (!roundOverMessageDiv || !newRoundBtn) return;
            let message = window.lang.t('hand_finished');
            // Play win sound whenever there is any kind of winner after a hand
            let isAnyWinner = false;
            if (
                !!gameState.endRoundMessage &&
                typeof gameState.endRoundMessage === 'string' &&
                (
                    gameState.endRoundMessage.toLowerCase().includes('domino') ||
                    gameState.endRoundMessage.toLowerCase().includes('gana') ||
                    gameState.endRoundMessage.toLowerCase().includes('wins')
                )
            ) {
                isAnyWinner = true;
            }
            // Only play winSound if dialog is being shown for the first time and not simultaneously with waitingSound
            if (dialogShownTimestamp === 0 && isAnyWinner && winSound && winSound.isLoaded()) {
                setTimeout(() => {
                    winSound.play();
                }, 200); // Slight delay to avoid overlap with waitingSound
            }
            if (gameState.gameBlocked) {
                message = window.lang.t('game_closed') + '! ' + window.lang.t('no_valid_moves') + '!';
                if (gameState.endRoundMessage) {
                    // Don't add redundant "(Juego cerrado)" if the server message already indicates a winner
                    const hasWinnerMessage = gameState.endRoundMessage.toLowerCase().includes('domino') || 
                                           gameState.endRoundMessage.toLowerCase().includes('gana') ||
                                           gameState.endRoundMessage.toLowerCase().includes('wins');
                    if (hasWinnerMessage) {
                        message = gameState.endRoundMessage; // Use server message as-is when there's a winner
                    } else {
                        message = gameState.endRoundMessage + "\n(" + window.lang.t('game_closed') + ")"; // Add blocked info only for ties
                    }
                }
                if (gameState.isTiedBlockedGame) {
                    message += "\n" + window.lang.translateServerMessage("El próximo juego lo inicia quien tenga el doble 6");
                }
            } else if (gameState.endRoundMessage && gameState.jugadoresInfo) {
                const playersWithTiles = gameState.jugadoresInfo.filter(player => player.tileCount > 0);
                const playersWithNoTiles = gameState.jugadoresInfo.filter(player => player.tileCount === 0);
                const hasWinMessage = gameState.endRoundMessage.toLowerCase().includes('domino');
                const hasBlockedMessage = gameState.endRoundMessage.toLowerCase().includes('juego cerrado');
                if (hasBlockedMessage || (playersWithTiles.length > 1 && playersWithNoTiles.length === 0 && !hasWinMessage)) {
                    message = gameState.endRoundMessage;
                    if (gameState.isTiedBlockedGame) {
                        message += "\nEl próximo juego lo inicia quien tenga el doble 6";
                    }
                } else {
                    message = gameState.endRoundMessage;
                }
            } else if (isClientDetectedBlock) {
                const playersWithTiles = gameState.jugadoresInfo.filter(player => player.tileCount > 0);
                message = `${window.lang.t('game_closed')}!\n${window.lang.t('no_valid_moves')}\n${window.lang.t('players_with_tiles')} ${playersWithTiles.map(p => `${p.displayName}(${p.tileCount})`).join(', ')}`;
            } else if (gameState.endRoundMessage && gameState.endMatchMessage) {
                message = gameState.endRoundMessage + "\n" + gameState.endMatchMessage;
            } else if (gameState.endMatchMessage) {
                message = gameState.endMatchMessage;
            } else if (gameState.endRoundMessage) {
                message = gameState.endRoundMessage;
            } else if (gameState.gameOver) {
                message = window.lang.t('game_over');
            } else if (gameState.roundOver) {
                message = window.lang.t('hand_finished');
            }
            
            // Translate server messages if needed
            const translatedMessage = window.lang.translateServerMessage(message);
            roundOverMessageDiv.innerText = translatedMessage;
            
            // Show dialog with simplified styling (using !important to override other styles)
            const dialogStyle = {
                display: 'block !important',
                visibility: 'visible !important', 
                opacity: '1 !important',
                color: 'white !important',
                fontSize: '16px !important',
                textAlign: 'center !important',
                padding: '20px !important'
            };
            
            const containerStyle = {
                display: 'block !important',
                visibility: 'visible !important',
                opacity: '1 !important', 
                zIndex: '9999 !important',
                position: 'fixed !important',
                pointerEvents: 'auto !important'
            };
            
            const buttonStyle = {
                display: 'block !important',
                visibility: 'visible !important',
                opacity: '1 !important',
                pointerEvents: 'auto !important'
            };
            
            // Apply styles using setProperty with !important
            Object.entries(dialogStyle).forEach(([prop, value]) => {
                roundOverMessageDiv.style.setProperty(prop.replace(/([A-Z])/g, '-$1').toLowerCase(), value.replace(' !important', ''), 'important');
            });
            Object.entries(containerStyle).forEach(([prop, value]) => {
                newRoundContainer.style.setProperty(prop.replace(/([A-Z])/g, '-$1').toLowerCase(), value.replace(' !important', ''), 'important');
            });
            Object.entries(buttonStyle).forEach(([prop, value]) => {
                newRoundBtn.style.setProperty(prop.replace(/([A-Z])/g, '-$1').toLowerCase(), value.replace(' !important', ''), 'important');
            });
            
            // Prevent page scrolling
            document.body.style.setProperty('overflow', 'hidden', 'important');
            document.documentElement.style.setProperty('overflow', 'hidden', 'important');
            
            const amIReady = gameState.readyPlayers && gameState.readyPlayers.includes(myJugadorName);
            newRoundBtn.disabled = amIReady;
            newRoundBtn.innerText = amIReady ? window.lang.t('waiting_for_others') : (gameState.matchOver ? window.lang.t('start_new_match') : window.lang.t('start_new_hand'));
            
            if (dialogShownTimestamp === 0) {
                dialogShownTimestamp = Date.now();
            }
        } else {
            const timeSinceShown = Date.now() - dialogShownTimestamp;
            const gameHasRestarted = gameState.gameInitialized && gameState.board && gameState.board.length > 0;
            const allPlayersReady = gameState.readyPlayers && gameState.jugadoresInfo && 
                gameState.readyPlayers.length === gameState.jugadoresInfo.length;
            if (timeSinceShown < 3000 && dialogShownTimestamp > 0 && !gameHasRestarted && !allPlayersReady) {
                return;
            }
            newRoundContainer.style.display = 'none';
            newRoundContainer.style.visibility = 'hidden';
            newRoundContainer.style.opacity = '0';
            dialogShownTimestamp = 0;
        }
    });



    socket.on('playerHand', (hand) => {
        if (isAnimating) {
            // Store the new hand but don't update immediately during animation
            window.pendingHandUpdate = hand || [];
        } else {
            myPlayerHand = hand || [];
        }
    });

    socket.on('gameError', (data) => {
        const translated = window.lang.translateServerMessage(data.message);
        
        // Cancel any ongoing tile animation since the move was invalid
        cancelTileAnimation();
        
        // Cancel persistent animation for invalid moves
        if (window.currentPlayerAnimation) {
            window.currentPlayerAnimation.isActive = false;
        }
        
        // Clear selected tile since the move failed
        selectedTileIndex = null;
        
        showMessage(translated);
    });

    socket.on('moveSuccess', (data) => {
        selectedTileIndex = null;
        if (data && data.tile) {
            lastPlayedHighlight.tile = data.tile;
            lastPlayedHighlight.timestamp = millis();
            
            // Now that move is validated, broadcast animation to OTHER players
            if (window.currentPlayerAnimation && window.currentPlayerAnimation.isActive) {
                socket.emit('playTileAnimation', {
                    tile: window.currentPlayerAnimation.tile,
                    playerName: window.currentPlayerAnimation.playerName,
                    startPos: window.currentPlayerAnimation.startPos,
                    endPos: window.currentPlayerAnimation.endPos
                });
            }
        }
    });

    socket.on('tilePlaced', (data) => {
        // console.log('🔊 Tile placed event received');
        if (tileSound && tileSound.isLoaded()) {
            try {
                tileSound.play();
                // console.log('🔊 Tile sound played');
            } catch (error) {
                console.error('❌ Error playing tile sound:', error);
            }
        } else {
            console.warn('⚠️ Tile sound not loaded or not available');
        }
    });

    socket.on('playerPassed', (data) => {
        // console.log('🔊 Player passed event received');
        if (passSound && passSound.isLoaded()) {
            try {
                passSound.play();
                // console.log('🔊 Pass sound played');
            } catch (error) {
                console.error('❌ Error playing pass sound:', error);
            }
        } else {
            console.warn('⚠️ Pass sound not loaded or not available');
        }
    });

    socket.on('playerWonHand', (data) => {
        // console.log('🔊 Player won hand event received');
        if (winSound && winSound.isLoaded()) {
            try {
                winSound.play();
                // console.log('🔊 Win sound played');
            } catch (error) {
                console.error('❌ Error playing win sound:', error);
            }
        } else {
            console.warn('⚠️ Win sound not loaded or not available');
        }
    });

    socket.on('gameRestarted', (data) => {
        // Clear game state
        myPlayerHand = [];
        selectedTileIndex = null;
        messageDisplay = { text: '', time: 0 };
        
        // CLEAR ALL POINTS DATA on game restart
        clearAllPointsData();
        
        showMessage(`🔄 ${data.message}`);
        // console.log('🔄 Game restarted - all points data cleared');
        
        const messagesDiv = document.getElementById('chat-messages');
        const messageElement = document.createElement('p');
        messageElement.innerHTML = `<b>${window.lang.t('system')}:</b> 🔄 ${window.lang.t('game_restarted')} ${data.restartedBy}`;
        messageElement.style.color = '#ffaa00';
        messageElement.style.fontWeight = 'bold';
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    socket.on('chatMessage', (data) => {
        const messagesDiv = document.getElementById('chat-messages');
        const messageElement = document.createElement('p');
        const myDisplayName = gameState.jugadoresInfo.find(p => p.name === myJugadorName)?.displayName;
        const senderName = data.sender === myDisplayName ? window.lang.t('you') : data.sender;
        messageElement.innerHTML = `<b>${senderName}:</b> ${data.message}`;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    socket.on('voiceMessage', (data) => {
        playVoiceMessage(data);
    });

    socket.on('leaveGameResponse', (data) => {
        // console.log('Leave game response:', data);
        
        if (data.success) {
            showSystemMessage(isSpanish ? 
                'Has salido del juego exitosamente' : 
                'Successfully left the game', 'success');
            
            // Redirect to main page after short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showSystemMessage(isSpanish ? 
                `Error al salir: ${data.message}` : 
                `Error leaving: ${data.message}`, 'error');
        }
    });

    socket.on('playerLeft', (data) => {
        // console.log('Player left notification:', data);
        
        showSystemMessage(isSpanish ? 
            `${data.playerName} ha salido del juego` : 
            `${data.playerName} has left the game`, 'info');
    });
}


// =============================================================================
// == EVENT LISTENERS & USER INPUT HANDLING                                   ==
// =============================================================================

// Show system messages in chat
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

function setupGameButtons() {
    // console.log('Setting up game buttons...');
    
    // Rules modal functionality
    function showRules(e) {
        if (e) e.preventDefault();
        // console.log('Showing rules modal...');
        const rulesModal = document.getElementById('rules-modal');
        const rulesContent = document.getElementById('rules-modal-content');
        
        if (rulesModal && rulesContent) {
            // console.log('Found rules modal elements');
            rulesModal.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                z-index: 99999 !important;
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                background: white !important;
                padding: 20px !important;
                border-radius: 8px !important;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3) !important;
            `;
            rulesContent.style.cssText = `
                max-width: 500px !important;
                width: 90vw !important;
                max-height: 80vh !important;
                overflow-y: auto !important;
            `;
            document.body.style.overflow = 'hidden';
        } else {
            console.error('Rules modal elements not found:', {
                modal: !!rulesModal,
                content: !!rulesContent
            });
        }
    }

    function hideRules(e) {
        if (e) e.preventDefault();
        // console.log('Hiding rules modal...');
        const rulesModal = document.getElementById('rules-modal');
        if (rulesModal) {
            rulesModal.style.cssText = `
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            `;
            document.body.style.overflow = 'auto';
        }
    }

    // Find all the rules-related elements
    const elements = {
        showRulesBtn: document.getElementById('show-rules-btn'),
        showRulesBtnMobile: document.getElementById('show-rules-btn-mobile'),
        scrollRulesBtn: document.getElementById('scroll-rules-btn'),
        closeRulesBtn: document.getElementById('close-rules-btn'),
        rulesModal: document.getElementById('rules-modal')
    };

    // console.log('Rules elements found:', {
    //   showRulesBtn: !!elements.showRulesBtn,
    //    showRulesBtnMobile: !!elements.showRulesBtnMobile,
    //   scrollRulesBtn: !!elements.scrollRulesBtn,
    //   closeRulesBtn: !!elements.closeRulesBtn,
    //   rulesModal: !!elements.rulesModal
    //});

    // Remove any existing event listeners first
    const removeOldListeners = (element, handler) => {
        if (element) {
            element.removeEventListener('click', handler);
            element.removeEventListener('touchend', handler);
        }
    };

    // Add click handlers to all rules buttons
    [elements.showRulesBtn, elements.showRulesBtnMobile, elements.scrollRulesBtn].forEach(button => {
        if (button) {
            // console.log('Setting up rules button:', button.id);
            removeOldListeners(button, showRules);
            
            button.addEventListener('click', showRules);
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                showRules(e);
            });
            
            // Make sure button is visible and clickable
            button.style.cssText = `
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: auto !important;
                cursor: pointer !important;
            `;
        }
    });

    // Setup close rules button
    if (elements.closeRulesBtn) {
        // console.log('Setting up close button');
        removeOldListeners(elements.closeRulesBtn, hideRules);
        
        elements.closeRulesBtn.addEventListener('click', hideRules);
        elements.closeRulesBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            hideRules(e);
        });
    }

    // Close on click outside modal
    if (elements.rulesModal) {
        // console.log('Setting up modal click-outside handler');
        removeOldListeners(elements.rulesModal, (e) => e.target === elements.rulesModal && hideRules(e));
        
        elements.rulesModal.addEventListener('click', (e) => {
            if (e.target === elements.rulesModal) {
                hideRules(e);
            }
        });
    }

    // Setup restart functionality
    function handleRestart(e) {
        if (e) e.preventDefault();
        // console.log('Restart button clicked');
        
        // Make sure we have a socket connection
        if (!socket || !socket.connected) {
            console.error('No socket connection available for restart');
            showMessage('Error: No hay conexión con el servidor. Por favor, recarga la página.');
            return;
        }
        
        if (confirm('¿Estás seguro de que quieres reiniciar el juego completamente? Esto borrará todos los puntajes y estadísticas.')) {
            try {
                // console.log('Emitting restartGame event');
                socket.emit('restartGame');
                
                // Clear all points data immediately
                clearAllPointsData();
                
                // Update UI to show restart is in progress
                showMessage('Reiniciando el juego...');
                
                // Force refresh game state
                myPlayerHand = [];
                selectedTileIndex = null;
                messageDisplay = { text: '', time: 0 };
                
                // Update UI immediately
                updateUI();
            } catch (error) {
                console.error('Error during game restart:', error);
                showMessage('Error al reiniciar el juego. Por favor, intenta de nuevo.');
            }
        }
    }

    // Setup restart buttons
    const restartButtons = {
        desktop: document.getElementById('restart-game-btn-desktop'),
        mobile: document.getElementById('restart-game-btn-mobile')
    };

    // console.log('Restart buttons found:', {
    //    desktop: !!restartButtons.desktop,
    //    mobile: !!restartButtons.mobile
    // //});

    Object.values(restartButtons).forEach(button => {
        if (button) {
            // console.log('Setting up restart button:', button.id);
            
            // Remove any existing listeners
            button.removeEventListener('click', handleRestart);
            button.removeEventListener('touchend', handleRestart);
            
            // Add both click and touch handlers
            button.addEventListener('click', handleRestart);
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                handleRestart(e);
            });
            
            // Make sure button is visible and clickable
            button.style.cssText = `
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: auto !important;
                cursor: pointer !important;
                z-index: 1000 !important;
                background-color: #ff0000 !important;
                color: white !important;
                border: none !important;
                padding: 8px 16px !important;
                border-radius: 4px !important;
                font-weight: bold !important;
            `;
        }
    });

    // Setup leave game buttons - simplified approach
    // console.log('🚪 Leave Game function setup complete - using direct onclick handlers in HTML');

    // Setup game control buttons
    const gameButtons = {
        'playLeftBtn': () => handlePlay('left'),
        'playRightBtn': () => handlePlay('right'),
        'passBtn': () => {
            if (clientHasValidMove()) {
                showMessage(window.lang.t('has_valid_move'));
            } else {
                socket.emit('passTurn');
            }
        },
        'newRoundBtn': () => socket.emit('playerReadyForNewRound')
    };

    Object.entries(gameButtons).forEach(([id, handler]) => {
        const button = document.getElementById(id);
        if (button) {
            // console.log('Adding click handler to game button:', id);
            button.addEventListener('click', handler);
        }
    });

    // Setup chat form
    const chatForm = document.getElementById('chat-input-form');
    const chatInput = document.getElementById('chat-input');
    if (chatForm && chatInput) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const msg = chatInput.value.trim();
            if (msg && socket) {
                socket.emit('chatMessage', msg);
                chatInput.value = '';
            }
        });
    }

    // Enable audio auto-play on first user interaction
    document.addEventListener('click', enableAudioAutoPlay, { once: true });
    document.addEventListener('touchstart', enableAudioAutoPlay, { once: true });
    
    // Setup voice chat button (Push to Talk)
    const voiceChatBtn = document.getElementById('voice-chat-btn');
    if (voiceChatBtn) {
        // console.log('Setting up voice chat button');
        
        // Check microphone permissions on first interaction
        let permissionChecked = false;
        
        const handleVoiceStart = async (e) => {
            e.preventDefault();
            
            // Check permissions first time
            if (!permissionChecked) {
                permissionChecked = true;
                const hasPermission = await checkMicrophonePermissions();
                if (!hasPermission) {
                    const isSecureContext = window.location.protocol === 'https:' || 
                                           window.location.hostname === 'localhost' || 
                                           window.location.hostname === '127.0.0.1' ||
                                           window.location.hostname.startsWith('192.168.') ||
                                           window.location.hostname.startsWith('10.') ||
                                           window.location.hostname.startsWith('172.') ||
                                           window.location.hostname === '0.0.0.0';
                    
                    if (!isSecureContext) {
                        alert('🔒 Voice chat requires HTTPS. Please use the live site for microphone access.');
                    } else {
                        alert('🎤 Microphone access denied. Please allow microphone permissions in your browser and try again.');
                    }
                    return;
                }
            }
            
            startVoiceRecording();
        };
        
        const handleVoiceStop = (e) => {
            e.preventDefault();
            stopVoiceRecording();
        };
        
        // Mouse events
        voiceChatBtn.addEventListener('mousedown', handleVoiceStart);
        voiceChatBtn.addEventListener('mouseup', handleVoiceStop);
        voiceChatBtn.addEventListener('mouseleave', handleVoiceStop);
        
        // Touch events for mobile
        voiceChatBtn.addEventListener('touchstart', handleVoiceStart);
        voiceChatBtn.addEventListener('touchend', handleVoiceStop);
        
        // Visual indicator for microphone availability
        checkMicrophonePermissions().then(hasPermission => {
            if (!hasPermission) {
                const isSecureContext = window.location.protocol === 'https:' || 
                                       window.location.hostname === 'localhost' || 
                                       window.location.hostname === '127.0.0.1' ||
                                       window.location.hostname.startsWith('192.168.') ||
                                       window.location.hostname.startsWith('10.') ||
                                       window.location.hostname.startsWith('172.') ||
                                       window.location.hostname === '0.0.0.0' ||
                                       window.location.port !== ''; // Development server with port
                
                if (!isSecureContext) {
                    voiceChatBtn.style.opacity = '0.5';
                    voiceChatBtn.title = 'Voice chat requires HTTPS - use live site';
                } else {
                    voiceChatBtn.style.opacity = '0.7';
                    voiceChatBtn.title = 'Click to request microphone permission';
                }
            } else {
                voiceChatBtn.style.opacity = '1';
                voiceChatBtn.title = 'Hold to record voice message';
            }
        });
    }
} // End of setupGameButtons function

// Rename the function but keep the old name for compatibility
// Remove duplicate and fix setupButtonListeners definition
// If setupGameButtons is defined elsewhere, ensure it's loaded before use
// Otherwise, keep only the function setupButtonListeners defined at the top

/**
 * Calculate where a tile would be placed on the board for left or right position
 */
function calculateTilePlacementPosition(tile, position) {
    // console.log('🔧 calculateTilePlacementPosition called:', { tile, position });
    
    if (!gameState.board || gameState.board.length === 0 || !gameState.spinnerTile) {
        // console.log('🔧 Missing game data:', { 
        //   hasBoard: !!gameState.board, 
        //   boardLength: gameState.board?.length, 
        //   hasSpinner: !!gameState.spinnerTile 
        // });
        return null;
    }
    
    const { board, spinnerTile } = gameState;
    const long = 100 * 0.95, short = 50 * 0.95, gap = 2;
    const boardCenterY = height / 2 - 218;
    
    // console.log('🔧 Board data:', { boardLength: board.length, spinnerTile });
    
    // Find spinner position
    const spinnerIndex = board.findIndex(t => t.left === spinnerTile.left && t.right === spinnerTile.right);
    if (spinnerIndex === -1) {
        // console.log('🔧 Spinner not found in board');
        return null;
    }
    
    // console.log('🔧 Spinner index:', spinnerIndex);
    
    const isSpinnerDouble = spinnerTile.left === spinnerTile.right;
    const spinnerW = isSpinnerDouble ? short : long;
    const spinnerH = isSpinnerDouble ? long : short;
    const spinnerX = width / 2 - spinnerW / 2;
    const spinnerY = boardCenterY - spinnerH / 2;
    
    // console.log('🔧 Spinner position:', { spinnerX, spinnerY, spinnerW, spinnerH });
    
    if (position === 'left') {
        // Calculate left side placement position
        let connL = isSpinnerDouble ? 
            { x: spinnerX + spinnerW / 2, y: spinnerY } : 
            { x: spinnerX, y: spinnerY + spinnerH / 2 };
        
        // Count existing tiles on left side
        let leftCount = spinnerIndex;
        
        // Simple approximation - place tile to the left of existing tiles
        const isDouble = tile.left === tile.right;
        const tileW = isDouble ? short : long;
        const tileH = isDouble ? long : short;
        
        const result = {
            x: connL.x - (leftCount + 1) * (long + gap) - tileW / 2,
            y: connL.y - tileH / 2
        };
        
        // console.log('🔧 Left position calculated:', result);
        return result;
    } else if (position === 'right') {
        // Calculate right side placement position
        let connR = isSpinnerDouble ? 
            { x: spinnerX + spinnerW / 2, y: spinnerY + spinnerH } : 
            { x: spinnerX + spinnerW, y: spinnerY + spinnerH / 2 };
        
        // Count existing tiles on right side
        let rightCount = board.length - spinnerIndex - 1;
        
        // Simple approximation - place tile to the right of existing tiles
        const isDouble = tile.left === tile.right;
        const tileW = isDouble ? short : long;
        const tileH = isDouble ? long : short;
        
        const result = {
            x: connR.x + rightCount * (long + gap) + tileW / 2,
            y: connR.y - tileH / 2
        };
        
        // console.log('🔧 Right position calculated:', result);
        return result;
    }
    
    // console.log('🔧 Invalid position:', position);
    return null;
}

function handlePlay(position) {
    if (selectedTileIndex === null) {
        return;
    }
    const tile = myPlayerHand[selectedTileIndex];
    
    // Get my actual hand position
    const myHandPos = getPlayerHandPosition(selectedTileIndex);
    const centerPos = { x: width/2, y: height/2 - 100 }; // Middle of UI
    
    // Create a PERSISTENT animation that won't be affected by game state updates
    window.currentPlayerAnimation = {
        tile: { ...tile }, // Copy the tile data
        startPos: { ...myHandPos },
        endPos: { ...centerPos },
        startTime: millis(),
        isActive: true,
        playerName: myJugadorName
    };
    
    // Send the move to server for validation - animation will be broadcast only if valid
    socket.emit('placeTile', { 
        tile, 
        position
    });
    
    selectedTileIndex = null;
}

function mousePressed() {
    if (typeof gameState === 'undefined' || !gameState || gameState.currentTurn !== myJugadorName) {
        return;
    }
    
    let tileWidth, tileHeight, gap;
    if (window.innerWidth < 900) {
        tileWidth = 35;
        tileHeight = 70;
        gap = 6;
    } else {
        tileWidth = 50;
        tileHeight = 100;
        gap = 10;
    }
    const handWidth = myPlayerHand.length > 0 ? myPlayerHand.length * (tileWidth + gap) - gap : 0;
    let handStartY = height - tileHeight - 20;
    if (window.innerWidth < 900) {
        handStartY += 2;
    }
    let handStartX = (width - handWidth) / 2;
    // Move hand 2 tiles to the right on mobile
    if (window.innerWidth < 900) {
        handStartX += 2 * (tileWidth + gap);
    }

    for (let i = 0; i < myPlayerHand.length; i++) {
        const x = handStartX + i * (tileWidth + gap);
        if (mouseX > x && mouseX < x + tileWidth && mouseY > handStartY && mouseY < handStartY + tileHeight) {
            selectedTileIndex = (selectedTileIndex === i) ? null : i;
            return;
        }
    }
}


// =============================================================================
// == UI & INFORMATION DISPLAY                                                ==
// =============================================================================

function updateUI() {
    const gameButtons = document.getElementById('game-buttons');
    if (!gameButtons) return;
    const isMyTurn = gameState.currentTurn === myJugadorName && gameState.gameInitialized;
    
    gameButtons.style.display = isMyTurn ? 'block' : 'none';
    if (isMyTurn) {
        document.getElementById('playLeftBtn').disabled = selectedTileIndex === null;
        document.getElementById('playRightBtn').disabled = selectedTileIndex === null;
        
        // Show special message for first move after tied blocked game
        if (gameState.isFirstMove && gameState.isAfterTiedBlockedGame) {
            showMessage(window.lang.t('your_turn_any_tile'));
        }
    }
}

function showMessage(text) {
    messageDisplay = { text, time: millis() };
}

function getPlayerIcon(imgElement, displayName, internalPlayerName) {
    if (!internalPlayerName) return; 
    
    // AGGRESSIVE MOBILE FIX: Multiple detection methods and debugging
    const userAgent = navigator.userAgent;
    const isMobileUA = /iPhone|iPad|iPod|Android|Mobile|Phone|Tablet/i.test(userAgent);
    const isMobileWidth = window.innerWidth <= 950; // Lowered threshold for testing
    const isTouchDevice = 'ontouchstart' in window;
    const isMobileBrowser = isMobileUA || isMobileWidth || isTouchDevice;
    
    console.log('🔍 MOBILE DEBUG:', {
        userAgent: userAgent.substring(0, 50),
        isMobileUA,
        isMobileWidth,
        isTouchDevice,
        isMobileBrowser,
        hostname: window.location.hostname
    });
    
    // FIXED: Removed mobile blocking - let default jugador avatars try to load on mobile too
    // if (isMobileBrowser && !window.location.hostname.includes('localhost')) {
    //     console.log('📱🚨 FORCING EMOJI AVATAR for mobile:', displayName);
    //     const avatarDiv = imgElement.parentElement;
    //     if (avatarDiv) {
    //         // Clear any existing content and set emoji
    //         avatarDiv.innerHTML = '';
    //         avatarDiv.textContent = '📱'; // Changed to phone emoji to confirm mobile detection
    //         avatarDiv.style.fontSize = '24px';
    //         avatarDiv.style.color = '#0066CC'; // Blue color to stand out
    //         avatarDiv.style.display = 'flex';
    //         avatarDiv.style.alignItems = 'center';
    //         avatarDiv.style.justifyContent = 'center';
    //         avatarDiv.title = 'Mobile Mode Active'; // Tooltip
    //     }
    //     // Hide the image element completely
    //     imgElement.style.display = 'none';
    //     imgElement.remove();
    //     return;
    // }
    
    // Create multiple filename variations to try
    const baseVariations = [
        `assets/icons/${displayName}_avatar.jpg`,           // Original case
        `assets/icons/${displayName.toLowerCase()}_avatar.jpg`, // All lowercase  
        `assets/icons/${displayName.toUpperCase()}_avatar.jpg`, // All uppercase
        `assets/icons/${displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase()}_avatar.jpg` // Title case
    ];
    
    // Add cache-busting for mobile browsers
    const isMobileDevice = window.innerWidth <= 900 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || /iPhone/i.test(navigator.userAgent) || navigator.platform === 'iPhone';
    const cacheBuster = isMobileDevice ? `?v=${Date.now()}` : '';
    const avatarVariations = baseVariations.map(url => url + cacheBuster);
    
    console.log(`🔍 Testing avatar variations for ${displayName}:`, avatarVariations);
    console.log(`📱 Mobile check: innerWidth=${window.innerWidth}, userAgent=${navigator.userAgent.includes('Mobile')}`);
    console.log(`🌐 Hostname: ${window.location.hostname}`);
    console.log(`🚫 Cache buster: ${cacheBuster} (mobile: ${isMobileDevice})`);
    
    const match = internalPlayerName.match(/\d+/);
    const playerNumber = match ? match[0] : 'default';
    const defaultAvatarSrc = `assets/defaults/jugador${playerNumber}_avatar.jpg${cacheBuster}`;
    
    console.log(`🎯 DEFAULT AVATAR: Attempting to load ${defaultAvatarSrc} for ${displayName}`);
    console.log(`🔢 Player number extracted: ${playerNumber} from ${internalPlayerName}`);
    
    let attemptIndex = 0;
    
    // Enhanced Safari Detection with debug logging
    const browserUserAgent = navigator.userAgent;
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent) || window.innerWidth <= 900;
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isSafariMobile = (isSafari && isMobile) || isIOS; // More aggressive detection
    
    // FIXED: Removed mobile emergency fallback - let default jugador avatars try to load
    // if (isMobile && !window.location.hostname.includes('localhost')) {
    //     console.log(`📱🚨 MOBILE EMERGENCY: Skipping file avatars, using emoji for ${displayName}`);
    //     avatarDiv.textContent = '👤';
    //     avatarDiv.style.fontSize = '24px';
    //     avatarDiv.style.color = '#666';
    //     return;
    // }
    
    console.log(`🔍 Browser Detection:`, {
        userAgent,
        isSafari,
        isMobile,
        isIOS,
        isSafariMobile,
        innerWidth: window.innerWidth
    });
    
    if (isSafariMobile) {
        console.log(`🍎� SAFARI MOBILE DETECTED - Using special handling`);
        
        // For Safari Mobile, use a completely different approach
        // Set up the image properties first
        imgElement.style.opacity = '0';
        imgElement.style.transition = 'opacity 0.3s';
        
        // Create a preloader image to test if the avatar exists
        const testImage = new Image();
        
        const loadAvatar = (srcToTry) => {
            return new Promise((resolve, reject) => {
                const tempImg = new Image();
                tempImg.onload = () => resolve(srcToTry);
                tempImg.onerror = () => reject();
                tempImg.src = srcToTry;
            });
        };
        
        // Try each avatar variation in sequence for Safari
        const tryAvatarsSequentially = async () => {
            for (let i = 0; i < avatarVariations.length; i++) {
                try {
                    console.log(`🍎 Safari trying: ${avatarVariations[i]}`);
                    const workingSrc = await loadAvatar(avatarVariations[i]);
                    console.log(`🍎✅ Safari found working avatar: ${workingSrc}`);
                    imgElement.src = workingSrc;
                    imgElement.style.opacity = '1';
                    return;
                } catch (e) {
                    console.log(`🍎❌ Safari failed: ${avatarVariations[i]}`);
                }
            }
            
            // If all custom avatars failed, try default
            try {
                console.log(`🍎 Safari trying default: ${defaultAvatarSrc}`);
                await loadAvatar(defaultAvatarSrc);
                imgElement.src = defaultAvatarSrc;
                imgElement.style.opacity = '1';
                console.log(`🍎✅ Safari loaded default: ${defaultAvatarSrc}`);
            } catch (e) {
                console.log(`🍎❌ Safari even default failed, forcing jugador1`);
                const avatarDiv = imgElement.parentElement;
                if (avatarDiv) {
                    // 🔧 MOBILE FIX: Force jugador1 instead of emoji on Safari mobile
                    console.log(`🍎📱 Safari mobile: Force loading jugador1`);
                    imgElement.onerror = null;
                    imgElement.src = `assets/defaults/jugador1_avatar.jpg?v=${Date.now()}`;
                    imgElement.onload = () => {
                        console.log(`🍎✅ Safari jugador1 fallback success`);
                        imgElement.style.opacity = '1';
                    };
                    imgElement.onerror = () => {
                        console.log(`🍎❌ Safari jugador1 also failed, using styled emoji`);
                        avatarDiv.innerHTML = '';
                        avatarDiv.textContent = '🎯';
                        avatarDiv.style.fontSize = '28px';
                        avatarDiv.style.color = '#0066CC';
                        avatarDiv.style.display = 'flex';
                        avatarDiv.style.alignItems = 'center';
                        avatarDiv.style.justifyContent = 'center';
                        avatarDiv.style.width = '40px';
                        avatarDiv.style.height = '40px';
                        avatarDiv.style.borderRadius = '50%';
                        avatarDiv.style.backgroundColor = '#f8f9fa';
                        imgElement.remove();
                    };
                }
            }
        };
        
        // Start the Safari-specific loading
        tryAvatarsSequentially();
        return;
    }
    
    // Function to try the next avatar variation (for non-Safari browsers)
    const tryNextAvatar = () => {
        if (attemptIndex < avatarVariations.length) {
            const currentSrc = avatarVariations[attemptIndex];
            console.log(`🔍 Trying variation ${attemptIndex + 1}/${avatarVariations.length}: ${currentSrc}`);
            imgElement.src = currentSrc;
            attemptIndex++;
        } else {
            // All custom variations failed, try default
            console.log(`🔍 All variations failed, trying default: ${defaultAvatarSrc}`);
            imgElement.src = defaultAvatarSrc;
        }
    };
    
    // Set up error handling before setting the source (for non-Safari browsers)
    imgElement.onerror = function() {
        console.log(`❌ MOBILE DEBUG - Failed to load: ${this.src}`);
        console.log(`❌ MOBILE DEBUG - Complete: ${this.complete}, Width: ${this.naturalWidth}, Height: ${this.naturalHeight}`);
        console.log(`❌ MOBILE DEBUG - UserAgent: ${navigator.userAgent}`);
        console.log(`❌ MOBILE DEBUG - Inner width: ${window.innerWidth}`);
        
        // If we're still trying custom avatar variations
        if (attemptIndex < avatarVariations.length) {
            tryNextAvatar();
        } else {
            // Even default failed, remove the image element and use emoji
            console.log(`❌ All avatar attempts failed for ${displayName}, using default jugador fallback`);
            const avatarDiv = this.parentElement;
            if (avatarDiv) {
                // 🔧 MOBILE FIX: Force default jugador avatar instead of emoji
                const isMobileDevice = window.innerWidth <= 900 || /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
                
                if (isMobileDevice) {
                    console.log(`📱 MOBILE FORCE: Trying jugador1 as final fallback for ${displayName}`);
                    // Force load jugador1 as absolute fallback on mobile
                    this.onerror = null; // Remove error handler to prevent loop
                    this.src = `assets/defaults/jugador1_avatar.jpg?v=${Date.now()}`;
                    this.onload = () => {
                        console.log(`✅ MOBILE FORCE: jugador1 fallback loaded for ${displayName}`);
                    };
                    this.onerror = () => {
                        console.log(`❌ MOBILE FORCE: Even jugador1 failed, using styled emoji`);
                        avatarDiv.innerHTML = '';
                        avatarDiv.textContent = '🎯';
                        avatarDiv.style.fontSize = '28px';
                        avatarDiv.style.color = '#0066CC';
                        avatarDiv.style.display = 'flex';
                        avatarDiv.style.alignItems = 'center';
                        avatarDiv.style.justifyContent = 'center';
                        avatarDiv.style.width = '40px';
                        avatarDiv.style.height = '40px';
                        avatarDiv.style.borderRadius = '50%';
                        avatarDiv.style.backgroundColor = '#f8f9fa';
                        this.remove();
                    };
                } else {
                    // Desktop: use emoji as before
                    avatarDiv.textContent = '👤';
                    avatarDiv.style.fontSize = '24px';
                    this.remove();
                }
            }
        }
    };
    
    imgElement.onload = function() {
        console.log(`✅ SUCCESS! Avatar loaded: ${this.src}`);
    };
    
    // Start with the first variation (for non-Safari browsers)
    tryNextAvatar();
}

/**
 * Determines player UI positions dynamically based on teams and turn order.
 * You are always 'bottom', your partner is 'top'.
 */
function determinePlayerPositions() {
    if (!myJugadorName || !gameState.teams || !gameState.teams.teamA || !gameState.seating || gameState.seating.length < 4) {
        return {};
    }

    const { teams, seating } = gameState;
    
    // Find my team and opponent team
    let myTeam, opponentTeam;
    if (teams.teamA.includes(myJugadorName)) {
        myTeam = teams.teamA;
        opponentTeam = teams.teamB;
    } else if (teams.teamB.includes(myJugadorName)) {
        myTeam = teams.teamB;
        opponentTeam = teams.teamA;
    } else {
        return {}; // I'm not in a team
    }

    // Find my partner
    const partner = myTeam.find(p => p !== myJugadorName);

    // Determine left and right opponents from the clockwise seating order
    const mySeatingIndex = seating.indexOf(myJugadorName);
    if (mySeatingIndex === -1) return {};

    const rightOpponent = seating[(mySeatingIndex + 1) % 4];
    const leftOpponent = seating[(mySeatingIndex + 3) % 4];

    // Create the position mapping
    const positions = {
        [myJugadorName]: 'bottom',
        [partner]: 'top',
        [rightOpponent]: 'right',
        [leftOpponent]: 'left'
    };
    
    // Validate that opponents are correct
    if (!opponentTeam.includes(rightOpponent) || !opponentTeam.includes(leftOpponent)) {
       // This can happen briefly during team rotation, return an empty object to avoid errors.
       return {};
    }

    return positions;
}


function updatePlayersUI() {
    if (!gameState || !gameState.jugadoresInfo || !myJugadorName) { return; }

    // console.log('🎮 Updating players UI with game state:', gameState.jugadoresInfo);

    const playerPositions = determinePlayerPositions();

    // Hide all displays initially
    ['top', 'bottom', 'left', 'right'].forEach(pos => {
        const div = document.getElementById(`player-display-${pos}`);
        if (div) div.style.display = 'none';
    });

    if (Object.keys(playerPositions).length < 4) {
        // Even if we can't position players properly, still show the points table
        createPointsTable({});
        return;
    }

    Object.entries(playerPositions).forEach(([playerName, position]) => {
        const div = document.getElementById(`player-display-${position}`);
        if (!div) return;

        const playerData = gameState.jugadoresInfo.find(p => p.name === playerName);
        if (!playerData) return;

        // console.log('🎯 Player data for', playerName, ':', playerData);
        // console.log('🔍 Avatar data for', playerName, '- Type:', playerData.avatar?.type, 'Data:', playerData.avatar?.data);
        // Debug: Log tileCount for each player and position
        // console.log(`[DEBUG] Player: ${playerName}, Position: ${position}, tileCount: ${playerData.tileCount}`);

        div.style.display = 'flex';
        div.innerHTML = ''; 

        // Create avatar element
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'player-avatar';
        
        // Mobile-specific styling for better compatibility
        if (window.innerWidth <= 900) {
            // Use default CSS styling - don't override
        }
        
        // PRIORITY SYSTEM for avatar display:
        // 1st: Avatar files (type='file' or when no avatar data but file exists)
        // 2nd: Custom uploads (type='custom') 
        // 3rd: Selected emojis (type='emoji')
        // 4th: Default avatar
        
        // 🔧 MOBILE AVATAR FORCE FIX: Only apply to actual mobile devices
        const isMobileDevice = /iPhone|iPad|iPod|Android|Mobile|Phone|Tablet/i.test(navigator.userAgent) && window.innerWidth <= 1024;
        
        if (isMobileDevice) {
            // Force ALL mobile devices to use jugador avatars (uploaded avatars get erased by deployments)
            console.log(`📱 MOBILE FORCE: Using jugador avatar for ${playerData.displayName} on mobile device`);
            const match = playerData.name.match(/(\d+)/);
            const playerNumber = match ? match[1] : '1';
            const jugadorSrc = `assets/defaults/jugador${playerNumber}_avatar.jpg?v=${Date.now()}`;
            
            const img = document.createElement('img');
            img.style.width = '40px';
            img.style.height = '40px';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            img.alt = `${playerData.displayName} avatar`;
            img.src = jugadorSrc;
            
            img.onload = () => {
                console.log(`📱✅ MOBILE FORCE: Jugador${playerNumber} loaded for ${playerData.displayName}`);
            };
            
            img.onerror = () => {
                console.log(`📱❌ MOBILE FORCE: Even jugador${playerNumber} failed, trying jugador1_avatar.jpg`);
                this.src = `assets/defaults/jugador1_avatar.jpg?v=${Date.now()}`;
                this.onerror = () => {
                    console.log(`📱❌ MOBILE FORCE: All jugador avatars failed, using styled emoji`);
                    avatarDiv.innerHTML = '';
                    avatarDiv.textContent = '🎯';
                    avatarDiv.style.fontSize = '28px';
                    avatarDiv.style.color = '#0066CC';
                    avatarDiv.style.display = 'flex';
                    avatarDiv.style.alignItems = 'center';
                    avatarDiv.style.justifyContent = 'center';
                    avatarDiv.style.width = '40px';
                    avatarDiv.style.height = '40px';
                    avatarDiv.style.borderRadius = '50%';
                    avatarDiv.style.backgroundColor = '#f8f9fa';
                };
            };
            
            avatarDiv.appendChild(img);
            return; // Exit early for mobile devices - skip all other avatar logic
        } else if (playerData.avatar && playerData.avatar.type === 'file') {
            // DEPLOYMENT AWARE: Try uploaded avatar file first, but expect it might be erased
            console.log(`🎯 File avatar type for ${playerData.displayName} - trying uploaded file (may be erased by deployment)`);
            
            const img = document.createElement('img');
            img.style.width = '40px';
            img.style.height = '40px';
            img.style.borderRadius = '50%';
            img.alt = `${playerData.displayName} avatar`;
            
            // Try uploaded avatar first (fast fail if erased)
            const displayName = playerData.displayName;
            const uploadedAvatarSrc = `assets/icons/${displayName}_avatar.jpg`;
            
            img.onload = function() {
                console.log(`✅ UPLOADED AVATAR FOUND: ${this.src} for ${playerData.displayName}`);
            };
            
            img.onerror = function() {
                console.log(`❌ Uploaded avatar missing (likely erased by deployment): ${uploadedAvatarSrc}`);
                console.log(`🎯 Falling back to default avatar for ${playerData.displayName}`);
                
                // Extract player number from internal name for default avatar
                const match = playerData.name.match(/(\d+)/);
                const playerNumber = match ? match[1] : '1';
                const defaultAvatarSrc = `assets/defaults/jugador${playerNumber}_avatar.jpg`;
                
                // 🔧 MOBILE FIX: Add cache buster for mobile browsers
                const isMobileDevice = window.innerWidth <= 900 || /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
                const cacheBuster = isMobileDevice ? `?v=${Date.now()}` : '';
                const defaultAvatarWithCache = defaultAvatarSrc + cacheBuster;
                
                console.log(`🎯 MOBILE DEBUG: Using default avatar ${defaultAvatarWithCache} for ${playerData.displayName} (mobile: ${isMobileDevice})`);
                
                this.onerror = function() {
                    console.log(`❌ Even default avatar failed for ${playerData.displayName}, using emoji fallback`);
                    // 🔧 MOBILE FIX: Ensure avatar div shows properly on mobile
                    avatarDiv.innerHTML = ''; // Clear any existing content
                    avatarDiv.textContent = '👤';
                    avatarDiv.style.fontSize = '28px';
                    avatarDiv.style.color = '#666';
                    avatarDiv.style.display = 'flex';
                    avatarDiv.style.alignItems = 'center';
                    avatarDiv.style.justifyContent = 'center';
                    avatarDiv.style.width = '40px';
                    avatarDiv.style.height = '40px';
                    avatarDiv.style.borderRadius = '50%';
                    avatarDiv.style.backgroundColor = '#f0f0f0';
                    this.remove();
                };
                
                this.onload = function() {
                    console.log(`✅ DEFAULT AVATAR LOADED: ${this.src} for ${playerData.displayName}`);
                };
                
                // Try default avatar with cache buster
                this.src = defaultAvatarWithCache;
            };
            
            // Start with uploaded avatar attempt
            img.src = uploadedAvatarSrc;
            avatarDiv.appendChild(img);
        } else if (playerData.avatar && playerData.avatar.type === 'custom') {
            // Custom uploaded avatar
            avatarDiv.classList.add('custom-avatar');
            
            // MOBILE FIX: Check if mobile and use emoji instead
            const isMobileUA = /iPhone|iPad|iPod|Android|Mobile|Phone|Tablet/i.test(navigator.userAgent) || /iPhone/i.test(navigator.userAgent) || navigator.platform === 'iPhone';
            const isMobileWidth = window.innerWidth <= 900;
            const isTouchDevice = 'ontouchstart' in window;
            const isMobileBrowser = isMobileUA || isMobileWidth || isTouchDevice;
            
            // FIXED: Let custom avatars try to load on mobile, fall back to default if needed
            // if (isMobileBrowser && !window.location.hostname.includes('localhost')) {
            //     console.log('📱🚨 MOBILE: Skipping custom avatar, using emoji for', playerData.displayName);
            //     avatarDiv.textContent = '📱';
            //     avatarDiv.style.fontSize = '24px';
            //     avatarDiv.style.color = '#0066CC';
            //     return;
            // }
            
            const customImg = document.createElement('img');
            
            // Safari mobile detection for custom avatars
            const userAgent = navigator.userAgent;
            const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
            const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
            const isSafariMobile = (isSafari && /iPhone|iPad|iPod|Android/i.test(userAgent)) || isIOS;
            
            if (isSafariMobile) {
                console.log(`🍎📱 CUSTOM AVATAR - Safari mobile detected for ${playerData.displayName}`);
                console.log(`🍎 Avatar data length: ${playerData.avatar.data.length}`);
                
                // For Safari mobile, set up image differently
                customImg.style.opacity = '0';
                customImg.style.transition = 'opacity 0.3s';
                
                customImg.onload = function() {
                    console.log(`🍎✅ Custom avatar loaded successfully for ${playerData.displayName}`);
                    this.style.opacity = '1';
                };
                
                customImg.onerror = function() {
                    console.log(`🍎❌ Custom avatar failed for ${playerData.displayName}, forcing jugador fallback`);
                    // 🔧 MOBILE FIX: Force jugador avatar instead of emoji
                    const match = playerData.name.match(/(\d+)/);
                    const playerNumber = match ? match[1] : '1';
                    const jugadorSrc = `assets/defaults/jugador${playerNumber}_avatar.jpg?v=${Date.now()}`;
                    
                    this.onerror = null;
                    this.src = jugadorSrc;
                    this.onload = () => {
                        console.log(`🍎✅ Safari custom->jugador fallback success: jugador${playerNumber}`);
                        this.style.opacity = '1';
                    };
                    this.onerror = () => {
                        console.log(`🍎❌ Safari jugador fallback failed, using styled emoji`);
                        avatarDiv.innerHTML = '';
                        avatarDiv.textContent = '🎯';
                        avatarDiv.style.fontSize = '28px';
                        avatarDiv.style.color = '#0066CC';
                        avatarDiv.style.display = 'flex';
                        avatarDiv.style.alignItems = 'center';
                        avatarDiv.style.justifyContent = 'center';
                        avatarDiv.style.width = '40px';
                        avatarDiv.style.height = '40px';
                        avatarDiv.style.borderRadius = '50%';
                        avatarDiv.style.backgroundColor = '#f8f9fa';
                        this.remove();
                    };
                };
                
                // Set source after event handlers for Safari
                setTimeout(() => {
                    customImg.src = playerData.avatar.data;
                }, 10);
            } else {
                // Non-Safari browsers: direct assignment
                customImg.src = playerData.avatar.data;
            }
            
            customImg.alt = `${playerData.displayName} avatar`;
            customImg.style.width = '40px';
            customImg.style.height = '40px';
            customImg.style.borderRadius = '50%';
            avatarDiv.appendChild(customImg);
        } else {
            // SIMPLE FIX: Try default avatar FIRST, then fallback to emoji if it fails
            const match = playerData.name.match(/(\d+)/);
            const playerNumber = match ? match[1] : '1';
            const defaultAvatarSrc = `assets/defaults/jugador${playerNumber}_avatar.jpg`;
            
            // 🔧 MOBILE FIX: Add cache buster and mobile-specific handling
            const isMobileDevice = window.innerWidth <= 900 || /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
            const cacheBuster = isMobileDevice ? `?v=${Date.now()}` : '';
            const defaultAvatarWithCache = defaultAvatarSrc + cacheBuster;
            
            console.log(`🎯 SIMPLE FIX: Loading default avatar ${defaultAvatarWithCache} for ${playerData.displayName} (mobile: ${isMobileDevice})`);
            
            const img = document.createElement('img');
            img.style.width = '40px';
            img.style.height = '40px';
            img.style.borderRadius = '50%';
            img.alt = `${playerData.displayName} avatar`;
            
            // 🔧 MOBILE FIX: Ensure proper loading and fallback
            img.style.objectFit = 'cover';
            img.style.backgroundColor = '#f0f0f0'; // Fallback background
            
            // Simple load/error handling
            img.onload = function() {
                console.log(`✅ SIMPLE FIX: Default avatar loaded for ${playerData.displayName}`);
                this.style.opacity = '1';
            };
            
            img.onerror = function() {
                console.log(`❌ SIMPLE FIX: Default avatar failed for ${playerData.displayName}`);
                console.log(`❌ Failed URL: ${this.src}`);
                console.log(`❌ Complete: ${this.complete}, Natural width: ${this.naturalWidth}`);
                console.log(`❌ Current URL: ${window.location.href}`);
                
                // 🔧 MOBILE FIX: Enhanced emoji fallback with proper styling
                avatarDiv.innerHTML = ''; // Clear any existing content
                const emojiToShow = playerData.avatar && playerData.avatar.type === 'emoji' ? playerData.avatar.data : '👤';
                avatarDiv.textContent = emojiToShow;
                avatarDiv.style.fontSize = '28px';
                avatarDiv.style.color = '#666';
                avatarDiv.style.display = 'flex';
                avatarDiv.style.alignItems = 'center';
                avatarDiv.style.justifyContent = 'center';
                avatarDiv.style.width = '40px';
                avatarDiv.style.height = '40px';
                avatarDiv.style.borderRadius = '50%';
                avatarDiv.style.backgroundColor = '#f0f0f0';
                this.remove();
            };
            
            // Use the cache-busted URL for mobile
            img.src = defaultAvatarWithCache;
            avatarDiv.appendChild(img);
        }

        const infoDiv = document.createElement('div');
        infoDiv.className = 'player-info-text';

    // Always show player number in parentheses after name
    let playerNum = '';
    const match = playerData.name.match(/(\d+)/);
    if (match) playerNum = match[1];
    let finalDisplayName = playerNum ? `${playerData.displayName} (${playerNum})` : playerData.displayName;
        
        // Create the player name div
        const nameDiv = document.createElement('div');
        nameDiv.className = 'player-name';
        // Remove '(Tu)' for bottom player on mobile only if this is the current user
        let youText = '';
        if (window.innerWidth < 900 && (playerData.position === 'bottom' || div.id === 'player-display-bottom') && playerName === myJugadorName) {
            youText = '';
        }
        nameDiv.textContent = `${finalDisplayName} ${youText}`.trim();
        
        // Create the tile count container
        const tileCountDiv = document.createElement('div');
        tileCountDiv.className = 'tile-count';
        tileCountDiv.style.cssText = `
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 2px;
        `;
        
        // Add the text
        const tileText = document.createElement('span');
        tileText.textContent = `${window.lang.t('tiles')}: ${playerData.tileCount}`;
        tileCountDiv.appendChild(tileText);
        
        // Add tiny visual dominoes
        const tinyTilesDisplay = createTinyTilesDisplay(playerData.tileCount);
        tileCountDiv.appendChild(tinyTilesDisplay);
        
        // Append all divs to infoDiv (removed individual points display)
        infoDiv.appendChild(nameDiv);
        infoDiv.appendChild(tileCountDiv);

        div.appendChild(avatarDiv);
        div.appendChild(infoDiv);

        div.classList.toggle('current-turn', playerData.name === gameState.currentTurn);
        div.classList.toggle('disconnected', !playerData.isConnected);
    });

    // Update our points table if it exists
    if (window.updatePointsTableContent) {
        window.updatePointsTableContent();
    } else {
        // Create the points table now if it doesn't exist yet
        setTimeout(() => {
            createPointsTableNow();
        }, 100);
    }
}

function createPointsTableNow() {
    // Remove any existing table first
    const existingTable = document.getElementById('points-table-container');
    if (existingTable) existingTable.remove();
    
    // Create the points table

let pointsTable = document.createElement('div');
pointsTable.id = 'points-table-container';

pointsTable.innerHTML = `
  <div class="points-title">🏆 ${window.lang.t('points')}</div>
  <div id="points-table-content" class="points-content">${window.lang.t('waiting_game_data')}</div>
`;
   const scrollContainer = document.getElementById('game-ui');
if (scrollContainer) {
  scrollContainer.appendChild(pointsTable);
} else {
  console.warn("⚠️ #game-ui not found. Points table not appended.");
  // Fallback to body if game-ui not found
  document.body.appendChild(pointsTable);
}
    
    // Create global update function
    window.updatePointsTableContent = function() {
        const contentDiv = document.getElementById('points-table-content');
        if (!contentDiv) return;
        
        if (!gameState || !gameState.jugadoresInfo || gameState.jugadoresInfo.length === 0) {
            contentDiv.innerHTML = `<div style="color: #C0C0C0;">${window.lang.t('waiting_game_data')}</div>`;
            return;
        }
        
        // CHECK MATCH COMPLETION ONCE (outside of player loop)
        const currentTotalA = gameState.teamScores?.teamA || 0;
        const currentTotalB = gameState.teamScores?.teamB || 0;
        const previousTotalA = previousTeamScores.teamA;
        const previousTotalB = previousTeamScores.teamB;
        
        // Only award points when a match is completed (not just after each hand/round)
        const isMatchCompleted = gameState.matchOver || gameState.endMatchMessage || gameState.gameOver;
        const scoresChanged = (currentTotalA > previousTotalA || currentTotalB > previousTotalB);
        
        let matchPointsAwarded = false;
        
        // If match completed, calculate winning team and points to award
        let winningTeamPoints = 0;
        let winningTeamPlayers = [];
        if (isMatchCompleted && scoresChanged && gameState.teamScores && gameState.teams) {
            const scoreDifference = Math.abs(currentTotalA - currentTotalB);
            let isShutout = false; // Track if this is a shutout (losing team has 0 points)
            
            if (currentTotalA > currentTotalB) {
                // Team A won
                winningTeamPoints = scoreDifference;
                winningTeamPlayers = gameState.teams.teamA || [];
                isShutout = currentTotalB === 0; // Team B was shut out
                // console.log(`🏆 MATCH COMPLETED - Team A wins with ${scoreDifference} points!${isShutout ? ' (SHUTOUT!)' : ''}`);
            } else if (currentTotalB > currentTotalA) {
                // Team B won  
                winningTeamPoints = scoreDifference;
                winningTeamPlayers = gameState.teams.teamB || [];
                isShutout = currentTotalA === 0; // Team A was shut out
                // console.log(`🏆 MATCH COMPLETED - Team B wins with ${scoreDifference} points!${isShutout ? ' (SHUTOUT!)' : ''}`);
            }
            
            // DOUBLE POINTS FOR SHUTOUT: If the losing team has 0 points, double the points awarded
            if (isShutout && winningTeamPoints > 0) {
                winningTeamPoints *= 2;
                // console.log(`🔥 SHUTOUT BONUS! Points doubled to ${winningTeamPoints} for shutting out the opposing team!`);
            }
            
            // Award points to all winning team players
            if (winningTeamPoints > 0 && winningTeamPlayers.length > 0) {
                winningTeamPlayers.forEach(playerName => {
                    if (!playerPointsWon[playerName]) {
                        playerPointsWon[playerName] = 0;
                    }
                    playerPointsWon[playerName] += winningTeamPoints;
                    // console.log(`🏆 Awarding ${winningTeamPoints} points to ${playerName}`);
                });
                
                // Update our tracking of previous scores (only once)
                previousTeamScores.teamA = currentTotalA;
                previousTeamScores.teamB = currentTotalB;
                matchPointsAwarded = true;
                
                // Save to localStorage as backup
                savePointsToLocalStorage();
                // Play win sound for match victory (including blocked games)
                if (winSound && winSound.isLoaded()) {
                    try {
                        winSound.play();
                    } catch (error) {
                        console.error('❌ Error playing win sound:', error);
                    }
                }
            }
        }
        
        // Create array with player data and calculate CUMULATIVE points across all matches
        const playersWithPoints = gameState.jugadoresInfo.map(player => {
            let cumulativePoints = 0;
            
            // Get cumulative points from previous games if available
            if (player.pointsWon !== undefined) {
                cumulativePoints = player.pointsWon;
                // Sync server data with local tracking to maintain consistency
                playerPointsWon[player.name] = cumulativePoints;
                // console.log(`Player ${player.displayName}: Using server cumulative points = ${cumulativePoints}`);
            } else {
                // If no server data exists, check if we have local tracking for this player
                if (!playerPointsWon[player.name]) {
                    playerPointsWon[player.name] = 0;
                    
                    // SYNC MECHANISM: If this is a reconnection scenario, try to infer points
                    // from team scores and match completion status
                    if (gameState.matchNumber > 1 || (gameState.teamScores && 
                        (gameState.teamScores.teamA > 0 || gameState.teamScores.teamB > 0))) {
                        // console.log(`🔄 Player ${player.displayName} may have reconnected, checking for missed points...`);
                        
                        // Try to calculate what points this player should have based on match history
                        // This is a basic approximation - in a real system, the server should track this
                        if (gameState.teamScores && gameState.teams && gameState.matchNumber > 1) {
                            const teamAScore = gameState.teamScores.teamA || 0;
                            const teamBScore = gameState.teamScores.teamB || 0;
                            
                            // If one team has significantly more points, assume completed matches
                            if (teamAScore >= 70 || teamBScore >= 70) {
                                if (gameState.teams.teamA && gameState.teams.teamA.includes(player.name)) {
                                    // Estimate points for Team A player based on completed matches
                                    const estimatedPoints = Math.floor(teamAScore / 70) * (teamAScore > teamBScore ? Math.abs(teamAScore - teamBScore) : 0);
                                    playerPointsWon[player.name] = estimatedPoints;
                                    // console.log(`🔄 Estimated ${estimatedPoints} points for reconnected Team A player ${player.displayName}`);
                                } else if (gameState.teams.teamB && gameState.teams.teamB.includes(player.name)) {
                                    // Estimate points for Team B player based to completed matches
                                    const estimatedPoints = Math.floor(teamBScore / 70) * (teamBScore > teamAScore ? Math.abs(teamBScore - teamAScore) : 0);
                                    playerPointsWon[player.name] = estimatedPoints;
                                    // console.log(`🔄 Estimated ${estimatedPoints} points for reconnected Team B player ${player.displayName}`);
                                }
                            }
                        }
                    }
                }
                
                // Use the current cumulative points (which may have been updated by the match completion logic above)
                cumulativePoints = playerPointsWon[player.name];
            }
            
            return {
                displayName: player.displayName,
                points: cumulativePoints
            };
        }).sort((a, b) => b.points - a.points);
        
        let html = '';
        playersWithPoints.forEach((player, index) => {
            const rank = index + 1;
            let rankIcon = '';
            let rankColor = '#E0E0E0';
            
            // Add rank icons and colors
            switch(rank) {
                case 1:
                    rankIcon = '🥇';
                    rankColor = '#FFD700'; // Gold
                    break;
                case 2:
                    rankIcon = '🥈';
                    rankColor = '#C0C0C0'; // Silver
                    break;
                case 3:
                    rankIcon = '🥉';
                    rankColor = '#CD7F32'; // Bronze
                    break;
                case 4:
                    rankIcon = '4️⃣';
                    rankColor = '#A0A0A0'; // Gray
                    break;
            }
            
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 2px 0; color: white; font-size: 11px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-size: 14px;">${rankIcon}</span>
                        <span style="color: ${rankColor}; font-weight: bold; font-size: 10px;">${rank}.</span>
                        <span style="color: #E0E0E0;">${player.displayName}</span>
                    </div>
                    <span style="color: #FFF; font-weight: bold;">${player.points}</span>
                </div>
            `;
        });
        
        contentDiv.innerHTML = html;
    };
    
    // Update immediately if we have data
    if (gameState && gameState.jugadoresInfo) {
        window.updatePointsTableContent();
    }
}



function createPointsTable(playerPositions) {
    // This old function is now disabled - the real table is created in setup()
    // console.log('Old createPointsTable called - using new immediate table instead');
}

function updateTeamInfo() {
    const teamInfoDiv = document.getElementById('team-info');
    if (!teamInfoDiv || !gameState.teams || !gameState.jugadoresInfo) return;
    const { teams, matchNumber } = gameState;
    
    const getDisplayName = (internalName) => {
        const player = gameState.jugadoresInfo.find(p => p.name === internalName);
        return player ? player.displayName : internalName;
    };

    // Only show match/team info as before, no room/points legend here
    let teamsHtml = '';
    if (window.innerWidth < 900) {
        // MOBILE: Do not show Match 1
        if (teams.teamA && teams.teamA.length > 0) { teamsHtml += `<b>${window.lang.t('team')} A:</b> ${teams.teamA.map(getDisplayName).join(' & ')}<br>`; }
        if (teams.teamB && teams.teamB.length > 0) { teamsHtml += `<b>${window.lang.t('team')} B:</b> ${teams.teamB.map(getDisplayName).join(' & ')}<br>`; }
    } else {
        teamsHtml = `<b>${window.lang.t('match')} ${matchNumber || 1}</b><br>`;
        if (teams.teamA && teams.teamA.length > 0) { teamsHtml += `<b>${window.lang.t('team')} A:</b> ${teams.teamA.map(getDisplayName).join(' & ')}<br>`; }
        if (teams.teamB && teams.teamB.length > 0) { teamsHtml += `<b>${window.lang.t('team')} B:</b> ${teams.teamB.map(getDisplayName).join(' & ')}<br>`; }
    }
    teamInfoDiv.innerHTML = teamsHtml;
}

function updateRoomInfo() {
    // If the lobby is visible, hide the legend and return
    const lobby = document.getElementById('lobby-container');
    var legendDiv = document.getElementById('room-points-legend');
    if (lobby && window.getComputedStyle(lobby).display !== 'none') {
        if (legendDiv) legendDiv.style.display = 'none';
        return;
    }
    // Remove legacy points-objective element if present
    const legacyPointsObj = document.getElementById('points-objective');
    if (legacyPointsObj && legacyPointsObj.parentNode) {
        legacyPointsObj.parentNode.removeChild(legacyPointsObj);
    }
    // Aggressively remove or hide any old room/points/objective elements except the new legend
    // Only remove elements whose id or class STARTS WITH room, points, or objective, and never remove team-info
    const aggressiveSelectors = [
        '[id^="room"]:not(#room-points-legend):not(#team-info)',
        '[id^="points"]:not(#room-points-legend):not(#team-info)',
        '[id^="objective"]:not(#room-points-legend):not(#team-info)',
        '[class^="room"]:not(.team-info)',
        '[class^="points"]:not(.team-info)',
        '[class^="objective"]:not(.team-info)'
    ];
    document.querySelectorAll(aggressiveSelectors.join(',')).forEach(el => {
        if (el.id !== 'room-points-legend' && el.id !== 'team-info' && !el.classList.contains('team-info')) {
            try {
                el.parentNode && el.parentNode.removeChild(el);
            } catch (e) {
                el.style.display = 'none';
            }
        }
    });

    // Place the room/points legend to the right of the Match info container
    let matchDiv = document.getElementById('team-info');
    if (!legendDiv) {
        legendDiv = document.createElement('div');
        legendDiv.id = 'room-points-legend';
        legendDiv.style.position = 'absolute';
        legendDiv.style.top = '';
        legendDiv.style.left = '';
        legendDiv.style.zIndex = '20';
        legendDiv.style.background = 'rgba(0,0,0,0.18)'; // Subtle, light background for readability
        legendDiv.style.color = '#fff';
        legendDiv.style.fontWeight = 'bold';
        legendDiv.style.fontSize = '18px';
        legendDiv.style.padding = '2px 12px 2px 10px';
        legendDiv.style.borderRadius = '7px';
        legendDiv.style.boxShadow = '0 1px 4px rgba(0,0,0,0.10)'; // Very light shadow
        legendDiv.style.pointerEvents = 'none';
        legendDiv.style.userSelect = 'none';
        document.body.appendChild(legendDiv);
    }
    // Position legendDiv to the right of matchDiv
    if (matchDiv) {
        const rect = matchDiv.getBoundingClientRect();
        legendDiv.style.top = `${rect.top + window.scrollY}px`;
        legendDiv.style.left = `${rect.right + 16 + window.scrollX}px`;
    } else {
        // fallback to top left if matchDiv not found
        legendDiv.style.top = '8px';
        legendDiv.style.left = '12px';
    }
    if (gameState && gameState.roomId && gameState.targetScore) {
        legendDiv.textContent = `${gameState.roomId.replace(' ', '-')} ${window.lang.t('to')} ${gameState.targetScore} ${window.lang.t('points').toLowerCase()}`;
        legendDiv.style.display = 'block';
    } else if (gameState && gameState.roomId) {
        legendDiv.textContent = gameState.roomId.replace(' ', '-');
        legendDiv.style.display = 'block';
    } else {
        legendDiv.textContent = '';
        legendDiv.style.display = 'none';
    }
}

function updateScoreboard() {
    const scoreboardDiv = document.getElementById('scoreboard');
    if (!scoreboardDiv || !gameState.teamScores) return;
    const { teamScores } = gameState;
    scoreboardDiv.innerHTML = `
        ${window.lang.t('team')} A: ${teamScores.teamA || 0}<br>
        ${window.lang.t('team')} B: ${teamScores.teamB || 0}
    `;
}

function drawMessages() {
    const messageDiv = document.getElementById('message-display');
    if (!messageDiv) return;
    if (messageDisplay.text && millis() - messageDisplay.time < 4000) {
        messageDiv.innerText = messageDisplay.text;
        messageDiv.style.display = 'block';
    } else {
        messageDiv.innerText = '';
        messageDiv.style.display = 'none';
    }
}

/**
 * Creates a small visual domino tile as an HTML element
 */
function createTinyDomino() {
    const tinyTile = document.createElement('div');
    tinyTile.className = 'tiny-domino';
    tinyTile.style.cssText = `
        width: 12px;
        height: 20px;
        background: #f5f5f5;
        border: 1px solid #333;
        border-radius: 2px;
        display: inline-block;
        margin: 0 1px;
        position: relative;
        box-shadow: 0 1px 2px rgba(0,0,0,0.3);
    `;
    
    // Add a tiny divider line
    const divider = document.createElement('div');
    divider.style.cssText = `
        position: absolute;
        top: 50%;
        left: 1px;
        right: 1px;
        height: 1px;
        background: #333;
        transform: translateY(-50%);
    `;
    tinyTile.appendChild(divider);
    
    return tinyTile;
}

/**
 * Creates a container with tiny domino tiles representing the tile count
 */
function createTinyTilesDisplay(tileCount) {
    const container = document.createElement('div');
    container.className = 'tiny-tiles-container';
    container.style.cssText = `
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        margin-left: 5px;
        max-width: 80px;
        gap: 1px;
    `;
    
    // Create tiny dominoes up to the tile count (max 7 for visual clarity)
    const tilesToShow = Math.min(tileCount, 7);
    for (let i = 0; i < tilesToShow; i++) {
        container.appendChild(createTinyDomino());
    }
    
    // If more than 7 tiles, add a "+X" indicator
    if (tileCount > 7) {
        const extraIndicator = document.createElement('span');
        extraIndicator.textContent = `+${tileCount - 7}`;
        extraIndicator.style.cssText = `
            font-size: 10px;
            color: #666;
            margin-left: 2px;
            font-weight: bold;
        `;
        container.appendChild(extraIndicator);
    }
    
    return container;
}


// =============================================================================
// == CANVAS DRAWING FUNCTIONS                                                ==
// =============================================================================

function drawHand() {
    if (!myPlayerHand) return;
// player hand for mobile   
   let tileWidth, tileHeight, gap;
if (window.innerWidth < 900) {
    tileWidth = 35; // or your preferred size
    tileHeight = 70;
    gap = 6;
} else {
    tileWidth = 50;
    tileHeight = 100;
    gap = 10;
}
    const handWidth = myPlayerHand.length > 0 ? myPlayerHand.length * (tileWidth + gap) - gap : 0;
    let handStartY = height - tileHeight - 20;
    // For mobile, move hand just above UI bottom
    if (window.innerWidth < 900) {
        // 10px above bottom edge
        handStartY = window.innerHeight - tileHeight - 10;
    }
    let handStartX = (width - handWidth) / 2;
    // Move hand 2 tiles to the right on mobile
    if (window.innerWidth < 900) {
        handStartX += 2 * (tileWidth + gap);
    }
    myPlayerHand.forEach((tile, i) => {
        drawSingleDomino(tile, handStartX + i * (tileWidth + gap), handStartY, tileWidth, tileHeight, i === selectedTileIndex, false);
    });
}

function drawPips(pips, x, y, w, h, isHorizontal = false) {
    const patterns = {
      1: [[0.5, 0.5]],
      2: [[0.25, 0.25], [0.75, 0.75]],
      3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
      4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
      5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
      6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]]
    };
    
    if (pips === 0 || !patterns[pips]) return;

    push();
    translate(x + w / 2, y + h / 2);
    if (pips === 6 && isHorizontal) {
        rotate(PI / 2);
    }

    const currentPattern = patterns[pips];
    fill(0);
    noStroke();
    const pipSize = w / 6.5;

    currentPattern.forEach(p => {
        const pipX = (p[0] - 0.5) * w;
        const pipY = (p[1] - 0.5) * h;
        ellipse(pipX, pipY, pipSize, pipSize);
    });
    pop();
}

// NEW: Added isHighlighted parameter
function drawSingleDomino(domino, x, y, w, h, isSelected, isReversed, isHighlighted = false) {
    push();
    translate(x, y);

    if (isHighlighted) {
        strokeWeight(4);
        stroke(0, 255, 255); // Bright cyan color for the glow
    } else {
        strokeWeight(isSelected ? 3 : 1.5);
        stroke(isSelected ? 'yellow' : 'black');
    }

    fill(245);
    rect(0, 0, w, h, 6);
    strokeWeight(1);
    stroke(0);
    
    const val1 = isReversed ? domino.right : domino.left;
    const val2 = isReversed ? domino.left : domino.right;

    if (w > h) { // Horizontal Tile
        line(w / 2, 4, w / 2, h - 4);
        drawPips(val1, 0, 0, w / 2, h, true);
        drawPips(val2, w / 2, 0, w / 2, h, true);
    } else { // Vertical Tile
        line(4, h / 2, w - 4, h / 2);
        drawPips(val1, 0, 0, w, h / 2, false);
        drawPips(val2, 0, h / 2, w, h / 2, false);
    }
    pop();
}

function updateMatchesWon() {
    const container = document.getElementById('matches-won-container');
    if (!container) return;

    if (!gameState.jugadoresInfo || gameState.jugadoresInfo.length === 0) {
        container.innerHTML = ''; 
        return;
    }

    container.style.display = 'block';
    
    // Create a more compact, grid-style layout
    let matchesWonHtml = `
        <div style="
            background: rgba(0, 0, 0, 0.7); 
            padding: 8px; 
            border-radius: 6px; 
            font-size: 11px;
            min-width: 102px;
            border: 1px solid #444;
        ">
            <div style="
                font-weight: bold; 
                text-align: center; 
                margin-bottom: -2px; 
                color: #FFD700;
                font-size: 11px;
                border-bottom: 1px solid #666;
                padding-bottom: 3px;
                line-height: 1.1;
            ">🏆<br>${window.lang.t('games_won').replace(' ', '<br>')}</div>
    `;

    gameState.jugadoresInfo.forEach(playerInfo => {
        const stats = gameState.playerStats ? gameState.playerStats[playerInfo.name] : null;
        const wins = stats ? stats.matchesWon : 0;
        
        // Truncate name to fit in 9 characters max
        const displayName = playerInfo.displayName.length > 8 
            ? playerInfo.displayName.substring(0, 8) + '…' 
            : playerInfo.displayName;
            
        matchesWonHtml += `
            <div style="
                display: flex; 
                justify-content: space-between; 
                align-items: center;
                margin: 1px 0; 
                padding: 1px 3px;
                font-size: 10px;
                line-height: 1.2;
            ">
                <span style="color: #E0E0E0; font-weight: normal;">${displayName}</span>
                <span style="
                    color: #FFF; 
                    font-weight: bold; 
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1px 4px;
                    border-radius: 3px;
                    font-size: 10px;
                ">${wins}</span>
            </div>
        `;
    });

    matchesWonHtml += '</div>';
    container.innerHTML = matchesWonHtml;
}



/**
 * Draws the entire board of played dominoes, handling the layout logic.
 * This is your original function, with the glow logic integrated.
 */
function drawBoard() {
    // 52. Check if board data exists and has spinner tile
    if (!gameState.board || gameState.board.length === 0 || !gameState.spinnerTile) return;

    // 53. Extract board data and define domino dimensions
    const { board, spinnerTile } = gameState;
    // 54. Set standard domino dimensions and spacing
    let long, short, gap;
    if (window.innerWidth < 900) {
        long = 70 * 0.82; // Shrink for mobile
        short = 35 * 0.82;
        gap = 1.5;
    } else {
        long = 100 * 0.95;
        short = 50 * 0.95;
        gap = 2;
    }
    // 55. Calculate board center Y position
    let boardCenterY;
    let spinnerX, spinnerY;
    // Mobile: spinner starts 18% below top edge and centered
    if (window.innerWidth < 900) {
        boardCenterY = height * 0.18;
        const isSpinnerDouble = spinnerTile.left === spinnerTile.right;
        const spinnerW = isSpinnerDouble ? short : long;
        const spinnerH = isSpinnerDouble ? long : short;
        spinnerX = width / 2 - spinnerW / 2;
        spinnerY = boardCenterY - spinnerH / 2;
    } else {
        boardCenterY = height / 2 - 218;
        const isSpinnerDouble = spinnerTile.left === spinnerTile.right;
        const spinnerW = isSpinnerDouble ? short : long;
        const spinnerH = isSpinnerDouble ? long : short;
        spinnerX = width / 2 - spinnerW / 2;
        spinnerY = boardCenterY - spinnerH / 2;
    }

    // 56. Find spinner tile index in the board array
    const spinnerIndex = board.findIndex(t => t.left === spinnerTile.left && t.right === spinnerTile.right);
    // 57. Exit if spinner tile not found in board
    if (spinnerIndex === -1) return;

    // 58. Initialize array to store drawable tile data
    let drawableTiles = new Array(board.length);

    // 59. Check if spinner tile is a double to determine orientation
    const isSpinnerDouble = spinnerTile.left === spinnerTile.right;
    // 60. Set spinner tile dimensions (horizontal for non-doubles, vertical for doubles)
    const spinnerW = isSpinnerDouble ? short : long;
    const spinnerH = isSpinnerDouble ? long : short;
    // 61. Calculate spinner tile X position (centered horizontally)
    // spinnerX already set above
    // 62. Calculate spinner tile Y position
    // spinnerY already set above
    // 63. Store spinner tile drawable data
    drawableTiles[spinnerIndex] = { domino: spinnerTile, x: spinnerX, y: spinnerY, w: spinnerW, h: spinnerH, isReversed: false };





// --- Right Side of Spinner ---
// 94. Initialize right side connection point based on spinner orientation
let connR;
if (isSpinnerDouble) {
    // For double (vertical) spinner: connect at right edge, middle height
    connR = { x: spinnerX + spinnerW, y: spinnerY + spinnerH / 2 };
} else {
    // For non-double (horizontal) spinner: connect at right edge, middle height
    connR = { x: spinnerX + spinnerW, y: spinnerY + spinnerH / 2 };
}
// 95. Set initial direction vector pointing right
let dirR = { x: 1, y: 0 };
// 96. Initialize counters for right side layout logic
let straightCountR = 0, turnCountR = 0;
// 97. Set initial turn trigger threshold
let turnAfterR = 5;

// 98. Loop through dominoes on right side of spinner (forwards)
for (let i = spinnerIndex + 1; i < board.length; i++) {
    // 99. Get current domino and check if it's a double
    const domino = board[i];
    const isDouble = domino.left === domino.right;
    // 100. Declare position and dimension variables
    let x, y, w, h;
    // 101. Get previous domino to check if it was a double (previous in array for right side)
    const prevDomino = board[i - 1];
    const prevWasDouble = prevDomino && prevDomino.left === prevDomino.right;

    // Special handling for doubles on right side - check if we're at a turn position
    const tileNumberFromSpinner = i - spinnerIndex;
    const isAtTurnPosition = (turnCountR < 2 && straightCountR >= turnAfterR);
    const isSpecialDouble = (isAtTurnPosition && isDouble);

    // 102. Check if it's time to make a turn on right side (but not for special double)
    if (turnCountR < 2 && straightCountR >= turnAfterR && !isSpecialDouble) {
        // 103. Store old direction before changing
        const oldDir = { ...dirR };
        // 104. Calculate new direction (90-degree counter-clockwise turn for symmetry)
        dirR = { x: -oldDir.y, y: oldDir.x };

        // 105. Set domino dimensions based on new direction
        w = (dirR.x !== 0) ? long : short;
        h = (dirR.x !== 0) ? short : long;

        // 106. Check if previous domino was a double for special positioning
        if (prevWasDouble) {
            // 107. First turn positioning after double (top right)
            if (oldDir.x === 1) {
                x = connR.x - w - gap/2;          // Position to the left of connection point
                y = connR.y  + w;       // Center vertically with slight downward offset
            
            // 108. Second turn positioning after double (bottom right)
            } else if (oldDir.y === 1) {            // <<<<<<< UNIFIED LOGIC APPLIED
             
             x = connR.x - w - (w * 0.5);  // Use tile width + 50% instead of fixed long + short            
             y = connR.y - h;             
            }

        // 109. Regular turn positioning (not after double)
        } else {
            // 110. First turn positioning (regular)
            if (oldDir.x === 1) {
                x = connR.x + gap;
                y = connR.y - h / 2 + (h * 0.25);  // Use 25% of tile height instead of fixed 25

            // 111. Second turn positioning (regular)
            } else if (oldDir.y === 1) {            // Second turn positioning (regular)
               y = connR.y + gap;
               x = connR.x - w / 2 - (w * 0.25);   // Use 25% of tile width instead of fixed (long / 4)
            }
        }

        // 112. Increment turn counter and update settings
        turnCountR++;
        turnAfterR = 3;
        straightCountR = 0;

    // 113. Straight line positioning (no turn) OR special double handling
    } else {
        // Handle special double at turn positions
        if (isSpecialDouble) {
            // Place double PERPENDICULAR to current direction of travel
            if (dirR.x !== 0) { // Currently moving horizontally
                // Place double vertically (perpendicular to horizontal movement)
                w = short;
                h = long;
            } else { // Currently moving vertically
                // Place double horizontally (perpendicular to vertical movement)
                w = long;
                h = short;
            }
            
            // Position based on current direction (before the turn)
            if (dirR.x === 1) { // Moving right - place double vertically to the right
                x = connR.x + gap;
                y = connR.y - h / 2;
            } else if (dirR.y === 1) { // Moving down - place double horizontally below
                x = connR.x - w / 2;
                y = connR.y + gap;
            } else if (dirR.x === -1) { // Moving left - place double vertically to the left
                x = connR.x - w - gap;
                y = connR.y - h / 2;
            } else if (dirR.y === -1) { // Moving up - place double horizontally above
                x = connR.x - w / 2;
                y = connR.y - h - gap;
            }
            
            // NOW simulate the turn AFTER positioning the double
            const oldDir = { ...dirR };
            dirR = { x: -oldDir.y, y: oldDir.x };
            
            // Increment turn counter and update settings
            turnCountR++;
            turnAfterR = 3;
            straightCountR = 0;
        } else {
            // 114. Set domino dimensions based on direction and double status
            if (dirR.x !== 0) { // Horizontal line
                w = isDouble ? short : long;
                h = isDouble ? long : short;
            } else { // Vertical line (down branch)
                w = isDouble ? long : short;
                h = isDouble ? short : long;
            }

            // 115. Position domino based on current direction
            if (dirR.x === 1) { x = connR.x + gap; y = connR.y - h / 2; }
            // 116. Position for down direction
            else if (dirR.y === 1) { y = connR.y + gap; x = connR.x - w / 2; }
            // 117. Position for left direction
            else { x = connR.x - w - gap; y = connR.y - h / 2; }
        }
    }

    // 118. Determine if domino should be visually reversed
    const isReversed = (dirR.x === -1);
    // 119. Store domino drawable data
    drawableTiles[i] = { domino, x, y, w, h, isReversed };

    // 120. Update connection point based on domino direction
    if (isSpecialDouble) {
        // For special double, connect at bottom edge middle since it's always vertical
        // But set the connection point based on the NEW direction after the simulated turn
        if (dirR.x === 1) { // New direction is right
            connR = { x: x + w, y: y + h / 2 };
        } else if (dirR.y === 1) { // New direction is down
            connR = { x: x + w / 2, y: y + h };
        } else if (dirR.x === -1) { // New direction is left
            connR = { x: x, y: y + h / 2 };
        } else if (dirR.y === -1) { // New direction is up
            connR = { x: x + w / 2, y: y };
        }
    } else if (dirR.x === 1) { connR = { x: x + w, y: y + h / 2 }; } 
    else if (dirR.x === -1) { connR = { x: x, y: y + h / 2 }; } 
    else if (dirR.y === 1) { connR = { x: x + w / 2, y: y + h }; } // Downward turn
    else { connR = { x: x + w / 2, y: y }; }
    
    // 121. Increment straight counter
    straightCountR++;
}



    // --- Left Side of Spinner ---
    // 94. Initialize left side connection point based on spinner orientation
    let connL;
    if (isSpinnerDouble) {
        // For double (vertical) spinner: connect at left edge, middle height
        connL = { x: spinnerX, y: spinnerY + spinnerH / 2 };
    } else {
        // For non-double (horizontal) spinner: connect at left edge, middle height
        connL = { x: spinnerX, y: spinnerY + spinnerH / 2 };
    }
    // 95. Set initial direction vector pointing left
    let dirL = { x: -1, y: 0 };
    // 96. Initialize counters for left side layout logic
    let straightCountL = 0, turnCountL = 0;
    // 97. Set initial turn trigger threshold
    let turnAfterL = 5;

    // 98. Loop through dominoes on left side of spinner (backwards)
    for (let i = spinnerIndex - 1; i >= 0; i--) {
        // 99. Get current domino and check if it's a double
        const domino = board[i];
        const isDouble = domino.left === domino.right;
        // 100. Declare position and dimension variables
        let x, y, w, h;
        // 101. Get previous domino to check if it was a double (next in array for left side)
        const prevDomino = board[i + 1];
        const prevWasDouble = prevDomino && prevDomino.left === prevDomino.right;

        // Special handling for doubles on left side - check if we're at a turn position
        const tileNumberFromSpinner = spinnerIndex - i;
        const isAtTurnPosition = (turnCountL < 2 && straightCountL >= turnAfterL);
        const isSpecialDouble = (isAtTurnPosition && isDouble);

// 102. Check if it's time to make a turn on left side (but not for special double)
if (turnCountL < 2 && straightCountL >= turnAfterL && !isSpecialDouble) {
    // 103. Store old direction before changing
    const oldDir = { ...dirL };
    // 104. Calculate new direction (90-degree counter-clockwise turn)
    dirL = { x: oldDir.y, y: -oldDir.x };

    // 105. Set domino dimensions based on new direction
    w = (dirL.x !== 0) ? long : short;
    h = (dirL.x !== 0) ? short : long;

    // 106. Check if previous domino was a double for special positioning
    if (prevWasDouble) {
        // 107. First turn positioning after double (top left)
        if (oldDir.x === -1) {                  // First turn on the top left
            x = connL.x - w / 2 + (short * 0.53);
            y = connL.y + short/2 + (short * 0.52);
   //         y = connL.y + short / 2 + 25.5;
        // 108. Second turn positioning after double (bottom left)
        } else if (oldDir.y === 1) {            // Second turn on the bottom left.
            x = connL.x + h ;
            y = connL.y - w/2 ;  // Position above the connection point going up
        }
    
    // 109. Regular turn positioning (not after double)
    } else {
        // 110. First turn positioning (regular)
        if (oldDir.x === -1) {
            x = connL.x - w - gap;
            y = connL.y - h / 2 + (short * 0.5);

        // 111. Second turn positioning (regular)
        } else if (oldDir.y === 1) {
            y = connL.y + gap;
            x = connL.x - short / 2;
        }
    }

    // 112. Increment turn counter and update settings
    turnCountL++;
    turnAfterL = 3;
    straightCountL = 0;

    // 113. Straight line positioning (no turn) OR special double handling
    } else {
        // Handle special double at turn positions
        if (isSpecialDouble) {
            // Place double PERPENDICULAR to current direction of travel
            if (dirL.x !== 0) { // Currently moving horizontally
                // Place double vertically (perpendicular to horizontal movement)
                w = short;
                h = long;
            } else { // Currently moving vertically
                // Place double horizontally (perpendicular to vertical movement)
                w = long;
                h = short;
            }
            
            // Position based on current direction (before the turn)
            if (dirL.x === -1) { // Moving left - place double vertically to the left
                x = connL.x - w - gap;
                y = connL.y - h / 2;
            } else if (dirL.y === 1) { // Moving down - place double horizontally below
                x = connL.x - w / 2;
                y = connL.y + gap;
            } else if (dirL.x === 1) { // Moving right - place double vertically to the right
                x = connL.x + gap;
                y = connL.y - h / 2;
            } else if (dirL.y === -1) { // Moving up - place double horizontally above
                x = connL.x - w / 2;
                y = connL.y - h - gap;
            }
            
            // NOW simulate the turn AFTER positioning the double
            const oldDir = { ...dirL };
            dirL = { x: oldDir.y, y: -oldDir.x };
            
            // Increment turn counter and update settings
            turnCountL++;
            turnAfterL = 3;
            straightCountL = 0;
        } else {
            // 114. Set domino dimensions based on direction and double status
            if (dirL.x !== 0) { // Horizontal line
                w = isDouble ? short : long;
                h = isDouble ? long : short;
            } else { // Vertical line (down branch)
                w = isDouble ? long : short;
                h = isDouble ? short : long;
            }

            // 115. Position domino based on current direction
            if (dirL.x === -1) { x = connL.x - w - gap; y = connL.y - h / 2; }
            // 116. Position for down direction
            else if (dirL.y === 1) { y = connL.y + gap; x = connL.x - w / 2; }
            // 117. Position for right direction
            else { x = connL.x + gap; y = connL.y - h / 2; }
        }
    }

    // 118. Determine if domino should be visually reversed (opposite of right side)
    const isReversed = !(dirL.x === -1 || dirL.y === -1);
    // 119. Store domino drawable data
    drawableTiles[i] = { domino, x, y, w, h, isReversed };

        // 120. Update connection point based on domino direction
        if (isSpecialDouble) {
            // For special double, set the connection point based on the NEW direction after the simulated turn
            if (dirL.x === -1) { // New direction is left
                connL = { x: x, y: y + h / 2 };
            } else if (dirL.y === 1) { // New direction is down
                connL = { x: x + w / 2, y: y + h };
            } else if (dirL.x === 1) { // New direction is right
                connL = { x: x + w, y: y + h / 2 };
            } else if (dirL.y === -1) { // New direction is up
                connL = { x: x + w / 2, y: y };
            }
        } else if (dirL.x === 1) { connL = { x: x + w, y: y + h / 2 }; } // Rightward direction - connect at right edge
        else if (dirL.x === -1) { connL = { x: x, y: y + h / 2 }; }
        else if (dirL.y === 1) { connL = { x: x + w / 2, y: y + h }; }
        else if (dirL.y === -1) { connL = { x: x + w / 2, y: y }; } // Upward direction - connect at top
        else { connL = { x: x + w / 2, y: y }; }
        
        // 121. Increment straight counter
        straightCountL++;
    }

    // --- Draw all tiles ---
    // 122. Loop through all drawable tiles to render them
    drawableTiles.forEach(t => {
        if (t) {
            // 123. Initialize highlight state
            let isHighlighted = false;
            // 124. Check if this tile should be highlighted (recently played)
            if (lastPlayedHighlight.tile && 
                millis() - lastPlayedHighlight.timestamp < 3000 &&
                t.domino.left === lastPlayedHighlight.tile.left && 
                t.domino.right === lastPlayedHighlight.tile.right) {
                isHighlighted = true;
            }
            // 125. Draw the domino with all calculated properties
            drawSingleDomino(t.domino, t.x, t.y, t.w, t.h, false, t.isReversed, isHighlighted);
        }
    });
}



function clientHasValidMove() {
    if (!myPlayerHand || myPlayerHand.length === 0) return false;
    if (gameState.isFirstMove) {
        if (gameState.isFirstRoundOfMatch) {
            // First round of match: must play double 6
            return myPlayerHand.some(t => t.left === 6 && t.right === 6);
        } else if (gameState.isAfterTiedBlockedGame) {
            // After a tied blocked game: player with double 6 can play any tile
            return myPlayerHand.length > 0;
        } else {
            // Regular first move of a new round
            return true;
        }
    }
    return myPlayerHand.some(t => t.left === gameState.leftEnd || t.right === gameState.leftEnd || t.left === gameState.rightEnd || t.right === gameState.rightEnd);
}

/**
 * Validate if a specific tile can be played at a specific position
 */
function isValidTilePlay(tile, position) {
    // console.log('🔍 isValidTilePlay called:', { tile, position, gameState: gameState });
    
    if (!tile || !gameState) {
        // console.log('❌ Missing tile or gameState');
        return false;
    }
    
    // Check if it's first move
    if (gameState.isFirstMove) {
        // console.log('🎯 First move validation');
        if (gameState.isFirstRoundOfMatch) {
            // First round of match: must play double 6
            const isValid = tile.left === 6 && tile.right === 6;
            // console.log('🎯 First round - need double 6:', isValid);
            return isValid;
        } else if (gameState.isAfterTiedBlockedGame) {
            // After a tied blocked game: player with double 6 can play any tile
            // console.log('🎯 After tied game - any tile valid');
            return true;
        } else {
            // Regular first move of a new round
            // console.log('🎯 Regular first move - any tile valid');
            return true;
        }
    }
    
    // Check if tile matches board ends
    // console.log('🎯 Board ends check - leftEnd:', gameState.leftEnd, 'rightEnd:', gameState.rightEnd);
    if (position === 'left') {
        const isValid = tile.left === gameState.leftEnd || tile.right === gameState.leftEnd;
        // console.log('🎯 Left position validation:', isValid);
        return isValid;
    } else if (position === 'right') {
        const isValid = tile.left === gameState.rightEnd || tile.right === gameState.rightEnd;
        // console.log('🎯 Right position validation:', isValid);
        return isValid;
    }
    
    // console.log('❌ Invalid position:', position);
    return false;
}


// =============================================================================
// == VOICE CHAT FUNCTIONS                                                    ==
// =============================================================================

// Enable audio auto-play after first user interaction
let audioAutoPlayEnabled = false;

// Enhanced audio unlock system with audio pool
function enableAudioAutoPlay() {
    if (window.audioSystemInitialized) return;
    window.audioSystemInitialized = true;
    
    const initializeAudioSystem = async () => {
        try {
            // Initialize audio context
            if (!window.globalAudioContext) {
                window.globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const audioContext = window.globalAudioContext;
            
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            
            // Play silent audio to unlock
            const silentAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmgfCStdgtJvHwA=');
            silentAudio.volume = 0.01;
            await silentAudio.play();
            
            // Create initial audio pool
            createAudioPool();
            
            // Set up periodic audio context maintenance
            setInterval(() => {
                if (audioContext.state === 'suspended') {
                    audioContext.resume().catch(() => {});
                }
            }, 3000);
            
            console.log('🎵 Audio system initialized with enhanced auto-play support');
            
        } catch (error) {
            console.log('🎵 Audio system initialization failed:', error.name);
            // Try again after a short delay
            setTimeout(() => {
                window.audioSystemInitialized = false;
            }, 5000);
        }
    };
    
    // Initialize on any user interaction
    const interactions = ['click', 'touchstart', 'touchend', 'keydown', 'mousedown', 'pointerdown'];
    interactions.forEach(eventType => {
        document.addEventListener(eventType, initializeAudioSystem, { once: true });
    });
    
    // Also try to initialize immediately (might work if user already interacted)
    initializeAudioSystem();
}

function showAudioUnlockedNotification() {
    // Show a brief notification that audio is now enabled
    const notification = document.createElement('div');
    notification.innerHTML = '🎵 Voice messages will now auto-play!';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        font-size: 14px;
        z-index: 1000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Check and request microphone permissions
async function checkMicrophonePermissions() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return false;
        }

        // Check if we're in a secure context (including local networks)
        const isSecureContext = window.location.protocol === 'https:' || 
                               window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1' ||
                               window.location.hostname.startsWith('192.168.') ||
                               window.location.hostname.startsWith('10.') ||
                               window.location.hostname.startsWith('172.') ||
                               window.location.hostname === '0.0.0.0';
        
        if (!isSecureContext) {
            return false;
        }

        // Try to get permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop immediately
        return true;
    } catch (error) {
        console.log('🎤 Microphone permission check failed:', error.name);
        return false;
    }
}

async function startVoiceRecording() {
    try {
        // Check if we're on HTTPS or localhost (including IP variations)
        const isSecureContext = window.location.protocol === 'https:' || 
                               window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1' ||
                               window.location.hostname.startsWith('192.168.') ||
                               window.location.hostname.startsWith('10.') ||
                               window.location.hostname.startsWith('172.') ||
                               window.location.hostname === '0.0.0.0';
        
        if (!isSecureContext) {
            // Be more permissive for development - allow if it looks like local development
            const isDevelopment = window.location.hostname.includes('localhost') ||
                                window.location.hostname.includes('127.0.0.1') ||
                                window.location.port !== '' || // Any port suggests development
                                window.location.hostname === window.location.hostname.toLowerCase(); // Basic dev check
            
            if (!isDevelopment) {
                alert('🔒 Voice recording requires HTTPS. You can listen to voice messages, but recording needs the live site.');
                return;
            }
            
            // Continue for development contexts
            console.log('🔧 Development mode: allowing voice chat on', window.location.hostname);
        }

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('🎤 Voice chat is not supported on this device/browser.');
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        });
        
        // Try different audio formats for better compatibility
        let options = { mimeType: 'audio/webm;codecs=opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'audio/webm' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: 'audio/mp4' };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = {}; // Use default
                }
            }
        }
        
        mediaRecorder = new MediaRecorder(stream, options);
        audioChunks = [];
        
        // console.log("🎤 Using audio format:", mediaRecorder.mimeType);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
                // console.log("🎤 Audio chunk received:", event.data.size, "bytes");
            }
        };
        
        mediaRecorder.onstop = () => {
            // console.log("🎤 Recording stopped, processing audio...");
            const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
            // console.log("🎤 Audio blob size:", audioBlob.size, "bytes");
            sendVoiceMessage(audioBlob);
            // Stop all tracks to release microphone
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        // console.log("🎤 Grabando...");
        
        // Visual feedback
        const voiceBtn = document.getElementById('voice-chat-btn');
        if (voiceBtn) {
            voiceBtn.style.backgroundColor = '#ff4444';
            voiceBtn.textContent = '🔴 Grabando...';
        }
        
    } catch (error) {
        console.error("🎤 Error accessing microphone:", error);
        
        let errorMessage = "Could not access microphone. ";
        
        if (error.name === 'NotAllowedError') {
            errorMessage += "Please allow microphone permissions in your browser settings.";
        } else if (error.name === 'NotFoundError') {
            errorMessage += "No microphone found on this device.";
        } else if (error.name === 'NotSupportedError') {
            errorMessage += "Microphone not supported on this browser.";
        } else if (error.name === 'NotReadableError') {
            errorMessage += "Microphone is already in use by another app.";
        } else if (window.location.protocol !== 'https:' && 
                   window.location.hostname !== 'localhost' && 
                   window.location.hostname !== '127.0.0.1') {
            errorMessage += "Voice chat requires HTTPS for security. Please use the live site.";
        } else {
            errorMessage += "Please check your browser permissions and try again.";
        }
        
        alert(errorMessage);
    }
}

function stopVoiceRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        // console.log("🎤 Recording stopped");
        
        // Reset visual feedback
        const voiceBtn = document.getElementById('voice-chat-btn');
        if (voiceBtn) {
            voiceBtn.style.backgroundColor = '#4CAF50';
            voiceBtn.textContent = '🎤 Presione y hable';
        }
    }
}

function sendVoiceMessage(audioBlob) {
    // console.log("🎤 Sending voice message, blob size:", audioBlob.size);
    
    if (audioBlob.size === 0) {
        console.error("🎤 Audio blob is empty!");
        return;
    }
    
    // Convert to base64 and send via socket
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64Audio = reader.result.split(',')[1];
        const myDisplayName = gameState.jugadoresInfo?.find(p => p.name === myJugadorName)?.displayName || 'Unknown';
        
        // console.log("🎤 Base64 audio length:", base64Audio.length);
        // console.log("🎤 Sending as:", myDisplayName);
        
        socket.emit('voiceMessage', { 
            audio: base64Audio, 
            sender: myDisplayName,
            timestamp: Date.now()
        });
        
        // Add to chat as voice message indicator
        const messagesDiv = document.getElementById('chat-messages');
        const messageElement = document.createElement('p');
        messageElement.innerHTML = `<b>You:</b> 🎤 Voice Message (${Math.round(audioBlob.size/1024)}KB)`;
        messageElement.style.fontStyle = 'italic';
        messageElement.style.color = '#888';
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };
    
    reader.onerror = (error) => {
        console.error("🎤 Error reading audio blob:", error);
    };
    
    reader.readAsDataURL(audioBlob);
}

function playVoiceMessage(data) {
    try {
        // console.log("🎵 Received voice message from:", data.sender);
        
        // Convert base64 back to audio
        const audioData = `data:audio/wav;base64,${data.audio}`;
        
        // Add to chat immediately
        const messagesDiv = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        const senderName = data.sender || 'Unknown';
        
        // Use a pooled audio element for better consistency
        const audio = getPooledAudio(audioData);
        
        // Smart auto-play with single retry for 100% success
        const attemptAutoPlay = async () => {
            try {
                // Ensure audio context is ready
                await ensureAudioContextReady();
                
                // Primary attempt: Direct play
                await audio.play();
                return true;
                
            } catch (error) {
                console.log("🎵 Auto-play failed:", error.name);
                
                // ONE smart retry: wait for next event loop and try fresh audio
                try {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    // Get a fresh audio element for the retry
                    const retryAudio = new Audio(audioData);
                    retryAudio.volume = 0.8;
                    retryAudio.preload = 'auto';
                    
                    await retryAudio.play();
                    
                    // Success! Replace our audio reference with the working one
                    returnAudioToPool(audio);
                    audio.src = retryAudio.src;
                    audio.currentTime = retryAudio.currentTime;
                    audio.onended = retryAudio.onended;
                    audio.onerror = retryAudio.onerror;
                    
                    return true;
                    
                } catch (retryError) {
                    console.log("🎵 Retry also failed:", retryError.name);
                    return false;
                }
            }
        };
        
        // Try auto-play with exhaustive retry strategy
        attemptAutoPlay().then(success => {
            if (success) {
                console.log("🎵 Voice message auto-playing successfully");
                messageElement.innerHTML = `<b>${senderName}:</b> 🎵 <span style="color: #4CAF50;">Playing voice message...</span>`;
                messagesDiv.appendChild(messageElement);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                
                audio.onended = () => {
                    messageElement.innerHTML = `<b>${senderName}:</b> 🎤 Voice message <span style="color: #666; font-size: 0.9em;">(played)</span>`;
                    console.log("🎵 Voice message ended");
                    returnAudioToPool(audio);
                };
                
                audio.onerror = () => {
                    messageElement.innerHTML = `<b>${senderName}:</b> ❌ Voice message (playback error)`;
                    returnAudioToPool(audio);
                };
                
                // Successful auto-play: keep it simple
                // expandAudioPool();
                
            } else {
                showPlayButton();
            }
        });
        
        function showPlayButton() {
            returnAudioToPool(audio); // Return unused audio to pool
            
            const playButton = document.createElement('button');
            playButton.innerHTML = '▶️ Play';
            playButton.style.cssText = `
                background: #4CAF50; 
                color: white; 
                border: none; 
                padding: 4px 8px; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 12px;
                margin-left: 8px;
            `;
            
            messageElement.innerHTML = `<b>${senderName}:</b> 🎤 Voice message `;
            messageElement.appendChild(playButton);
            messagesDiv.appendChild(messageElement);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            playButton.addEventListener('click', async () => {
                playButton.innerHTML = '🔄';
                playButton.disabled = true;
                
                try {
                    // Get a fresh audio element for manual play
                    const manualAudio = getPooledAudio(audioData);
                    
                    await manualAudio.play();
                    playButton.innerHTML = '🎵';
                    
                    manualAudio.onended = () => {
                        playButton.innerHTML = '✅';
                        playButton.style.background = '#666';
                        returnAudioToPool(manualAudio);
                    };
                    
                    // Manual play successful - simple refresh
                    createAudioPool();
                    console.log("🎵 Manual play successful - audio pool refreshed");
                    
                } catch (playError) {
                    console.log("🎵 Manual play failed:", playError);
                    playButton.innerHTML = '❌';
                    playButton.style.background = '#ff4444';
                    playButton.disabled = false;
                    playButton.title = 'Try again';
                }
            });
        }
        
    } catch (error) {
        console.error("🎵 Voice message error:", error);
        
        // Fallback message
        const messagesDiv = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        const senderName = data.sender || 'Unknown';
        messageElement.innerHTML = `<b>${senderName}:</b> 🎤 Voice message (error)`;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

// Simplified audio pool management - back to what worked
let audioPool = [];
let audioPoolSize = 3; // Back to smaller, working size

function getPooledAudio(audioData) {
    if (audioPool.length > 0) {
        const audio = audioPool.pop();
        audio.src = audioData;
        audio.currentTime = 0;
        audio.volume = 0.8;
        return audio;
    } else {
        const audio = new Audio(audioData);
        audio.volume = 0.8;
        audio.preload = 'auto';
        return audio;
    }
}

function returnAudioToPool(audio) {
    if (audioPool.length < audioPoolSize && audio) {
        // Clean up the audio element before returning to pool
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.onended = null;
        audio.onerror = null;
        audioPool.push(audio);
    }
}

function createAudioPool() {
    // Create initial pool of audio elements
    while (audioPool.length < audioPoolSize) {
        const audio = new Audio();
        audio.volume = 0.8;
        audio.preload = 'auto';
        audioPool.push(audio);
    }
    console.log("🎵 Audio pool created with", audioPool.length, "elements");
}

function expandAudioPool() {
    // Add more audio elements after successful plays
    if (audioPool.length < audioPoolSize + 2) {
        const audio = new Audio();
        audio.volume = 0.8;
        audio.preload = 'auto';
        audioPool.push(audio);
        console.log("🎵 Audio pool expanded to", audioPool.length, "elements");
    }
}

async function forceAudioUnlock() {
    try {
        // Force audio context resume
        if (window.globalAudioContext) {
            if (window.globalAudioContext.state === 'suspended') {
                await window.globalAudioContext.resume();
            }
            
            // Play multiple silent buffers to force unlock
            for (let i = 0; i < 3; i++) {
                const buffer = window.globalAudioContext.createBuffer(1, 1, 22050);
                const source = window.globalAudioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(window.globalAudioContext.destination);
                source.start(0);
            }
        }
        
        // Also try with HTML audio
        const forceUnlockAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmgfCStdgtJvHwA=');
        forceUnlockAudio.volume = 0.005; // Extra quiet
        await forceUnlockAudio.play();
        
        console.log("🎵 Force audio unlock completed");
        
    } catch (error) {
        console.log("🎵 Force unlock failed:", error.name);
    }
}

async function ensureAudioContextReady() {
    try {
        if (!window.globalAudioContext) {
            window.globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const audioContext = window.globalAudioContext;
        
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log("🎵 Audio context resumed");
        }
        
        return true;
    } catch (error) {
        console.log("🎵 Audio context setup failed:", error.name);
        return false;
    }
}

// =============================================================================
// == SIMPLE TILE ANIMATION SYSTEM                                            ==
// =============================================================================

/**
 * Start a simple tile animation from start position to end position
 */
function startTileAnimation(tile, startPos, endPos, playerName = null) {
    // Force reset animation state first
    isAnimating = false;
    animatingTile = null;
    animatingPlayerName = null;
    
    // Store animation data
    animatingTile = tile;
    animatingPlayerName = playerName;
    animationStartTime = millis();
    animationProgress = 0;
    isAnimating = true;
    
    // Set positions
    animationStartPos = { ...startPos };
    animationEndPos = { ...endPos };
}

/**
 * Cancel/stop any current tile animation (for invalid moves)
 */
function cancelTileAnimation(specificPlayer = null) {
    // If a specific player is provided, only cancel their animation
    if (specificPlayer && animatingPlayerName !== specificPlayer) {
        return; // This animation is not from the specified player
    }
    
    isAnimating = false;
    animatingTile = null;
    animatingPlayerName = null;
    animationProgress = 0;
    // console.log('🚫 Tile animation cancelled due to invalid move');
}

/**
 * Get the hand position for any player based on their actual game position
 */
function getPlayerHandPositionByName(playerName) {
    if (playerName === myJugadorName) {
        // For myself, use the actual selected tile position if available
        return getPlayerHandPosition(selectedTileIndex || 0);
    } else {
        // For other players, use their actual position in the game
        const playerPositions = determinePlayerPositions();
        const position = playerPositions[playerName];
        
        switch(position) {
            case 'bottom':
                return { x: width/2, y: height - 60 }; // Bottom center
            case 'top':
                return { x: width/2, y: 60 }; // Top center
            case 'right':
                return { x: width - 60, y: height/2 }; // Right side
            case 'left':
                return { x: 60, y: height/2 }; // Left side
            default:
                // Fallback to generic positions if position not found
                if (playerName.includes('1')) {
                    return { x: width/2, y: height - 60 }; // Bottom
                } else if (playerName.includes('2')) {
                    return { x: width - 60, y: height/2 }; // Right
                } else if (playerName.includes('3')) {
                    return { x: width/2, y: 60 }; // Top
                } else if (playerName.includes('4')) {
                    return { x: 60, y: height/2 }; // Left
                } else {
                    return { x: width/2, y: height - 60 }; // Default bottom
                }
        }
    }
}

/**
 * Get the position of a specific tile in the current player's hand
 */
function getPlayerHandPosition(tileIndex) {
    const tileWidth = 50, tileHeight = 100, gap = 10;
    const handWidth = myPlayerHand.length > 0 ? myPlayerHand.length * (tileWidth + gap) - gap : 0;
    const handStartY = height - tileHeight - 20;
    const handStartX = (width - handWidth) / 2;
    
    // Calculate the center position of the specific tile
    const tileX = handStartX + tileIndex * (tileWidth + gap) + tileWidth / 2;
    const tileY = handStartY + tileHeight / 2;
    
    return { x: tileX, y: tileY };
}

/**
 * Draw the animated tile if animation is active
 */
function drawAnimatedTile() {
    if (!isAnimating || !animatingTile) {
        return;
    }
    
    // Calculate total animation time (move + pause)
    const totalDuration = animationDuration + animationPauseDuration;
    const elapsed = millis() - animationStartTime;
    
    let currentX, currentY;
    let scaleFactor = 1.5; // Base scale during animation
    
    if (elapsed <= animationDuration) {
        // Phase 1: Moving to center
        const moveProgress = elapsed / animationDuration;
        const easedProgress = easeInOutQuad(moveProgress);
        
        currentX = lerp(animationStartPos.x, animationEndPos.x, easedProgress);
        currentY = lerp(animationStartPos.y, animationEndPos.y, easedProgress);
        scaleFactor = 1.5 + 0.5 * easedProgress; // Grow during movement
        
    } else if (elapsed <= totalDuration) {
        // Phase 2: Paused at center
        currentX = animationEndPos.x;
        currentY = animationEndPos.y;
        scaleFactor = 2.0; // Largest at center
        
        // Gentle pulsing effect during pause
        const pulseProgress = (elapsed - animationDuration) / animationPauseDuration;
        scaleFactor += 0.2 * Math.sin(pulseProgress * Math.PI * 4);
        
        } else {
            // Animation complete
            isAnimating = false;
            animatingTile = null;
            
            // Apply any pending hand update now that animation is done
            if (window.pendingHandUpdate) {
                // console.log('📋 Applying pending hand update');
                myPlayerHand = window.pendingHandUpdate;
                window.pendingHandUpdate = null;
            }
            
            // Execute delayed board update if one is pending
            if (window.delayedBoardUpdate) {
                window.delayedBoardUpdate();
                window.delayedBoardUpdate = null;
            }
            
            return;
        }
        
    // Draw the animated tile with enhanced visuals
    push();
    translate(currentX, currentY);
    
    // Add glow effect
    drawingContext.shadowColor = 'rgba(255, 215, 0, 0.8)'; // Golden glow
    drawingContext.shadowBlur = 25;
    
    // Scale the tile
    scale(scaleFactor);
    
    // Add rotation for more dynamic effect
    const rotation = 0.3; // Slight rotation
    rotate(rotation);
    
    // Draw the tile (larger size with highlight)
    drawSingleDomino(animatingTile, -40, -20, 80, 40, false, false, true);
    
    // Reset shadow
    drawingContext.shadowBlur = 0;
    
    pop();
}

/**
 * Draw persistent animation that won't be affected by game state changes
 */
function drawPersistentAnimation() {
    if (!window.currentPlayerAnimation || !window.currentPlayerAnimation.isActive) {
        return;
    }
    
    const anim = window.currentPlayerAnimation;
    const totalDuration = animationDuration + animationPauseDuration;
    const elapsed = millis() - anim.startTime;
    
    if (elapsed >= totalDuration) {
        // Animation complete
        window.currentPlayerAnimation.isActive = false;
        
        // Execute delayed board update if one is pending
        if (window.delayedBoardUpdate) {
            window.delayedBoardUpdate();
            window.delayedBoardUpdate = null;
        }
        
        return;
    }
    
    let currentX, currentY;
    let scaleFactor = 1.5;
    
    if (elapsed <= animationDuration) {
        // Phase 1: Moving to center
        const moveProgress = elapsed / animationDuration;
        const easedProgress = easeInOutQuad(moveProgress);
        
        currentX = lerp(anim.startPos.x, anim.endPos.x, easedProgress);
        currentY = lerp(anim.startPos.y, anim.endPos.y, easedProgress);
        scaleFactor = 1.5 + 0.5 * easedProgress;
        
    } else {
        // Phase 2: Paused at center
        currentX = anim.endPos.x;
        currentY = anim.endPos.y;
        scaleFactor = 2.0;
        
        const pulseProgress = (elapsed - animationDuration) / animationPauseDuration;
        scaleFactor += 0.2 * Math.sin(pulseProgress * Math.PI * 4);
    }
    
    // Draw the animated tile
    push();
    translate(currentX, currentY);
    
    // Add glow effect
    drawingContext.shadowColor = 'rgba(255, 215, 0, 0.8)';
    drawingContext.shadowBlur = 25;
    
    scale(scaleFactor);
    rotate(0.3);
    
    drawSingleDomino(anim.tile, -40, -20, 80, 40, false, false, true);
    
    drawingContext.shadowBlur = 0;
    pop();
}

/**
 * Easing function for smooth animation
 */
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}



// Make the Leave Game function globally accessible immediately
function handleLeaveGame(event) {
    // console.log('🚪 handleLeaveGame called!');
    // console.log('🚪 Event:', event);
    
    try {
        // console.log('🚪 Available variables:', {
        //    myJugadorName: typeof myJugadorName !== 'undefined' ? myJugadorName : 'undefined',
         //   gameState: typeof gameState !== 'undefined' ? gameState : 'undefined',
        //    socket: typeof socket !== 'undefined' && socket ? 'connected' : 'not connected',
        //    isSpanish: typeof isSpanish !== 'undefined' ? isSpanish : 'undefined'
       // });
        
        if (event) {
            event.preventDefault();
        }
        
        // console.log('🚪 Leave game requested');
        
        // Simple confirmation
        if (confirm('Are you sure you want to leave this game?')) {
            // console.log('🚪 Player confirmed leave game');
            
            // Use fallback values
            const roomCode = (typeof gameState !== 'undefined' && gameState?.roomId) ? gameState.roomId : 'Sala-1';
            const playerName = (typeof myJugadorName !== 'undefined' && myJugadorName) ? myJugadorName : 'Unknown';
            const playerId = (typeof socket !== 'undefined' && socket?.id) ? socket.id : 'unknown';
            
            // console.log('🚪 Sending leave game data:', { roomCode, playerName, playerId });
            
            // Only emit if socket is available
            if (typeof socket !== 'undefined' && socket) {
                socket.emit('leaveGame', {
                    roomCode: roomCode,
                    playerId: playerId,
                    playerName: playerName
                });
                // console.log('🚪 Leave game event emitted successfully');
            } else {
                console.error('🚪 Socket not available, redirecting immediately');
                window.location.href = 'index.html';
                return;
            }
            
            // Show leaving message
            alert('Leaving game...');
            
            // Set a timeout to redirect if server doesn't respond
            setTimeout(() => {
                // console.log('🚪 Leave game timeout, forcing redirect');
                window.location.href = 'index.html';
            }, 3000);
        } else {
            // console.log('🚪 Player cancelled leave game');
        }
    } catch (error) {
        console.error('🚪 Error in handleLeaveGame:', error);
        alert('Error leaving game: ' + error.message);
    }
}

// Make sure it's globally accessible
window.handleLeaveGame = handleLeaveGame;

// Test function to debug button issues
function testLeaveButton() {
    // console.log('🔧 Test function called!');
    alert('Test function works!');
}
window.testLeaveButton = testLeaveButton;

// Add event listeners for Leave Game buttons when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // console.log('🚪 Setting up Leave Game button event listeners...');
    
    // Desktop button
    const desktopBtn = document.getElementById('leave-game-btn-desktop');
    if (desktopBtn) {
        desktopBtn.addEventListener('click', function(event) {
            // console.log('🚪 Desktop Leave Game button clicked via event listener');
            handleLeaveGame(event);
        });
        // console.log('🚪 Desktop Leave Game button event listener added');
    } else {
        // console.log('🚪 Desktop Leave Game button not found');
    }
    
    // Mobile button
    const mobileBtn = document.getElementById('leave-game-btn-mobile');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', function(event) {
            // console.log('🚪 Mobile Leave Game button clicked via event listener');
            handleLeaveGame(event);
        });
        // console.log('🚪 Mobile Leave Game button event listener added');
    } else {
        // console.log('🚪 Mobile Leave Game button not found');
    }
});


