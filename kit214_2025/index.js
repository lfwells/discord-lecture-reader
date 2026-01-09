import { Router } from "express";
import { games, rooms, initFakeData } from "./data.js";
import bodyParser from "body-parser";
import express  from 'express';
import path from 'path';
import https from 'https';
import fs from 'fs';


export default function(app)
{  
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    initFakeData();


// Middleware to parse JSON bodies. It only runs if the
// Content-Type header matches 'application/json'.
app.use(express.json());

// Middleware to parse URL-encoded bodies. It only runs if the
// Content-Type header matches 'application/x-www-form-urlencoded'.
app.use(express.urlencoded({ extended: true }));

    app.use("/kit214", express.json());

    //enable cors
    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        next();
    });

    app.use("/kit214/vm3", VM3);
    app.use("/kit214/vm2", VM2);
}

function checkAPIKey(req, res, next)
{
    const apiKey = req.headers['x-api-key'];
    if (apiKey !==  'secret123') {
        return res.status(403).json({ error: "Missing API Key (set one on the homepage by clicking shield icon)" });
    }
    next();
}



const VM3 = express.Router();

VM3.get('/info', (req, res) => {
    res.json({ name: "Lindsay's Sample API" });
});
VM3.get("/joke", (req, res) => {
    res.status(418).json({ message: "Why did the scarecrow win an award? Because he was outstanding in his field!" });
});

//games
VM3.get('/game', (req, res) => {
    res.json(games.map(g => ({ id: g.id, title: g.title, url: g.url, tickRate: g.tickRate, maxPlayers: g.maxPlayers, qrInstructions: g.qrInstructions, hidePlayers: g.hidePlayers })));
});
VM3.get('/game/:id', (req, res) => {
    const game = games.find(g => g.id === req.params.id);
    if (!game) {
        return res.status(404).json({ error: "Game not found" });
    }
    res.json({  id: game.id, title: game.title, url: game.url, tickRate: game.tickRate, maxPlayers: game.maxPlayers, qrInstructions: game.qrInstructions, hidePlayers: game.hidePlayers});
});
VM3.post('/game/', checkAPIKey, (req, res) => {
    const newGame = req.body;
    if (!newGame || !newGame.id || !newGame.title || !newGame.url) {
        return res.status(400).json({ error: "Invalid game data" });
    }
    if (games.find(g => g.id === newGame.id)) {
        return res.status(400).json({ error: "Game ID already exists" });
    }
    newGame.rooms = [];
    games.push(newGame);
    res.status(201).json(newGame);
});
VM3.put('/game/:id', checkAPIKey, (req, res) => {
    const gameIndex = games.findIndex(g => g.id === req.params.id);
    if (gameIndex === -1) {
        return res.status(404).json({ error: "Game not found" });
    }
    const updatedGame = req.body;
    if (!updatedGame || !updatedGame.id || !updatedGame.title || !updatedGame.url) {
        return res.status(400).json({ error: "Invalid game data" });
    }
    if (updatedGame.id !== req.params.id && games.find(g => g.id === updatedGame.id)) {
        return res.status(400).json({ error: "Game ID already exists" });
    }
    // Preserve all existing data in the room objects, and only update with provided fields (merge)
    updatedGame.rooms = games[gameIndex].rooms.map((room, idx) => {
        const updatedRoom = (updatedGame.rooms && updatedGame.rooms[idx]) || {};
        return { ...room, ...updatedRoom };
    });
    games[gameIndex] = { ...games[gameIndex], ...updatedGame };
    res.status(200).json(updatedGame);
});
VM3.delete('/game/:id', checkAPIKey, (req, res) => {
    const gameIndex = games.findIndex(g => g.id === req.params.id);
    if (gameIndex === -1) {
        return res.status(404).json({ error: "Game not found" });
    }
    //also need to remove any rooms associated with this game
    const gameRooms = games[gameIndex].rooms.map(r => r.id);
    for (const roomId of gameRooms) {
        const roomIndex = rooms.findIndex(r => r.id === roomId);
        if (roomIndex !== -1) {
            rooms.splice(roomIndex, 1);
        }
    }
    games.splice(gameIndex, 1);
    res.status(200).json({ message: "Game deleted" });
});

//rooms
VM3.get('/game/:id/room', (req, res) => {
    const gameId = req.params.id;
    const filteredRooms = rooms.filter(room => room.gameId === gameId);
    res.json(filteredRooms);
});
VM3.get("/game/:id/room/:roomID", (req, res) => {
    const room = rooms.find(r => r.id === req.params.roomID);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }
    res.status(200).json(room);
});
VM3.get('/game/:id/room/:roomID', (req, res) => {
    const room = rooms.find(r => r.id === req.params.roomID && r.gameId === req.params.id);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }
    res.json(room);
});
VM3.post('/game/:id/room', checkAPIKey, (req, res) => {
    const id = Math.random().toString(36).substring(2, 5).toUpperCase();
    const newroom = { id, gameId: req.params.id, players: [] };
    
    //also need to add a new room to the game's rooms array
    const game = games.find(g => g.id === req.params.id);
    if (!game) {
        return res.status(404).json({ error: "Game not found" });
    }

    const settings = req.body || {};

    rooms.push(newroom);
    if (game) {
        game.rooms.push({ id, state: game.initialState(settings), settings: settings, players: [] });
    }
    res.status(201).json(newroom);
});
VM3.delete('/game/:id/room/:roomID', checkAPIKey, (req, res) => {
    const roomIndex = rooms.findIndex(r => r.id === req.params.roomID);
    if (roomIndex === -1) {
        return res.status(404).json({ error: "Room not found" });
    }
    const game = games.find(g => g.id === req.params.id);
    if (game) {
        game.rooms = game.rooms.filter(r => r.id !== req.params.roomID);
    }
    rooms.splice(roomIndex, 1);
    res.status(200).json({ message: "Room deleted" });
});

//players
VM3.get('/game/:id/room/:roomID/player', (req, res) => {
    const room = rooms.find(r => r.id === req.params.roomID);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }
    res.status(200).json(room.players);
});
VM3.post("/game/:id/room/:roomID/player", (req, res) => {
    const room = rooms.find(r => r.id === req.params.roomID);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }

    //player id is user input
    const playerId = req.body.name;
    if (!playerId) {
        return res.status(400).json({ error: "Player ID is required" });
    }

    if (room.players.includes(playerId)) {
        return res.status(400).json({ error: "Player ID already in use" });
    }

    //get the game object itself
    var game = games.find(g => g.id === req.params.id);
    if (!game) {
        return res.status(404).json({ error: "Game not found" });
    }

    if (room.players.length >= game.maxPlayers) {
        return res.status(409).json({ error: "Room is full" });
    }


    //also call addPlayer to add a player to the room
    var game = games.find(g => g.id === req.params.id);
    if (!game) {
        return res.status(404).json({ error: "Game not found" });
    }
    var gameRoom = game.rooms.find(r => r.id === req.params.roomID);
    if (!gameRoom) {
        return res.status(404).json({ error: "Game room not found" });
    }
    game.addPlayer(gameRoom, playerId);

    room.players.push(playerId);
    res.status(200).json({ playerId });
});
VM3.put("/game/:id/room/:roomID/player/:name", (req, res) => {
    const room = rooms.find(r => r.id === req.params.roomID);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }
    const playerId = req.params.name;
    if (!playerId) {
        return res.status(400).json({ error: "Player ID is required" });
    }

    if (!room.players.includes(playerId)) {
        return res.status(400).json({ error: "Player ID not found in room" });
    }
    
    //for now, just allow changing the name (id)
    const newPlayerId = req.body.name;
    if (!newPlayerId) {
        return res.status(400).json({ error: "New Player ID is required" });
    }
    if (room.players.includes(newPlayerId)) {
        return res.status(400).json({ error: "New Player ID already in use" });
    }

    //also need to update in the game room
    var game = games.find(g => g.id === req.params.id);
    if (!game) {
        return res.status(404).json({ error: "Game not found" });
    }
    var gameRoom = game.rooms.find(r => r.id === req.params.roomID);
    if (!gameRoom) {
        return res.status(404).json({ error: "Game room not found" });
    }
    const playerIndex = gameRoom.players.indexOf(playerId);
    if (playerIndex !== -1) {
        gameRoom.players[playerIndex] = newPlayerId;
    }
    
    const playerIndex2 = room.players.indexOf(playerId);
    if (playerIndex2 !== -1) {
        room.players[playerIndex2] = newPlayerId;
    }

    res.status(200).json({ playerId: newPlayerId });
});
VM3.delete("/game/:id/room/:roomID/player/:name", (req, res) => {
    const room = rooms.find(r => r.id === req.params.roomID);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }
    const playerId = req.params.name;
    if (!playerId) {
        return res.status(400).json({ error: "Player ID is required" });
    }

    if (!room.players.includes(playerId)) {
        return res.status(400).json({ error: "Player ID not found in room" });
    }
    
    var game = games.find(g => g.id === req.params.id);
    if (!game) {
        return res.status(404).json({ error: "Game not found" });
    }
    var gameRoom = game.rooms.find(r => r.id === req.params.roomID);
    if (!gameRoom) {
        return res.status(404).json({ error: "Game room not found" });
    }
    game.removePlayer(gameRoom, playerId);

    room.players = room.players.filter(p => p !== playerId);
    res.status(200).json({ message: "Thanks for playing!" });
});

//VM2
const VM2 = express.Router();
//game
VM2.get("/:game/", (req, res) => {
    const game = games.find(g => g.id === req.params.game);
    if (!game) {
        return res.status(404).json({ error: "Game not found" });
    }
    res.status(200).json(game);
});
VM2.get("/:game/settings", (req, res) => {
    const game = games.find(g => g.id === req.params.game);
    if (!game) {
        return res.status(404).json({ error: "Game not found" });
    }
    res.status(200).json(game.settings || []);
});
VM2.get("/:game/room/:roomID/state", (req, res) => {
    const game = games.find(g => g.id === req.params.game);
    if (!game) {
        return res.status(404).json({ error: "Game not found" });
    }

    const room = game.rooms.find(r => r.id === req.params.roomID);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }

    const size = req.query.width && req.query.height ? { width: parseInt(req.query.width), height: parseInt(req.query.height) } : { width: 800, height: 600 };
    res.status(200).json(game.output(room.state, size, room.settings));
});
VM2.get("/:game/room/:roomID/input", (req, res) => {
    const game = games.find(g => g.id === req.params.game);
    if (!game) {
        return res.status(404).json({ error: "Game not found" });
    }
    
    const room = game.rooms.find(r => r.id === req.params.roomID);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }

    res.status(200).json(game.inputs(room.state, room.settings));
});
VM2.post("/:game/room/:roomID/input", (req, res) => {
    const playerId = req.body.name;
    if (!playerId) {
        return res.status(400).json({ error: "Player ID is required" });
    }

    const game = games.find(g => g.id === req.params.game);
    if (!game) {
        return res.status(404).json({ error: "Game not found" });
    }
    
    const room = game.rooms.find(r => r.id === req.params.roomID);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }
    
    const input = req.body.input;
    if (!input) {
        return res.status(400).json({ error: "Input is required" });
    }
    
    room.state = game.handleInput(room.state, input, playerId);
    res.status(200).json({ input }); //TODO: success object (and check others)
});
VM2.get("/:game/room/:roomID/tick", (req, res) => {
    const game = games.find(g => g.id === req.params.game);
    if (!game) {
        return res.status(404).json({ error: "Game not found" });
    }
    
    const room = game.rooms.find(r => r.id === req.params.roomID);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }
    
    const size = req.query.width && req.query.height ? { width: parseInt(req.query.width), height: parseInt(req.query.height) } : { width: 800, height: 600 };
    room.state = game.tick(room.state, size);
    res.status(200).json(game.output(room.state, size, room.settings));
});

