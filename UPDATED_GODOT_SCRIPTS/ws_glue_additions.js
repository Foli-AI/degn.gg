// ADD TO: public/games/sol-bird/client/ws-glue.js
// Add these functions to the existing ws-glue.js file

// Send finish event when player reaches end
window.sendFinishEvent = function(playerId) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'FINISH',
            matchKey: matchKey,
            playerId: playerId,
            finishTime: Date.now()
        }));
        console.log('[ws-glue] Sent FINISH event:', playerId);
    } else {
        console.warn('[ws-glue] WebSocket not open, cannot send finish event.');
    }
};

// Send match result (rankings) when all players finish or timer expires
window.sendMatchResult = function(rankings) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'MATCH_RESULT',
            matchKey: matchKey,
            playerId: playerId,
            rankings: rankings
        }));
        console.log('[ws-glue] Sent MATCH_RESULT:', rankings);
    } else {
        console.warn('[ws-glue] WebSocket not open, cannot send match result.');
    }
};

