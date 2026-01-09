export const games = [
    {
        id: "hello_world",
        title: "Hello World",
        url: "https://utasbot.dev/kit214/vm2/hello_world",
        qrInstructions: "Scan the QR code to join the game!",
        //hidePlayers: true,
        tickRate: 1000,
        maxPlayers: 100,
        inputs: (state, settings) => { return [ { text: "Click Me", iconUrl: "" } ]; },
        handleInput: (state, input, playerId) => {
            if (input === "Click Me") {
                state.clicks = (state.clicks || 0) + 1;
            }
            return state;
        },
        tick: (state, size) => { return state; },
        output: (state, size, settings) => {
            return [ 
                { type: "text", x: 0, y: 0, width: size.width, height: size.height, color: "#000000", text: `${state.clicks || 0} ${settings['Append Text']}`, textAlign: "center", fontSize: 48 },
            
    ];
        },
        
        rooms: [],
        initialState: (settings) => { return { clicks: 0 }; },
        settings: [
            { name: "Append Text", defaultValue: "Speckled Frogs" }
        ],
        addPlayer: (room, name) => { } ,
        removePlayer: (room, name) => { } ,   
    },
    {
        id: "voting",
        title: "Voting",
        url: "https://utasbot.dev/kit214/vm2/voting",
        maxPlayers: 2000,
        inputs: (state, settings) =>{
            var options = settings.VotingOptions ? settings.VotingOptions.split(",") : ["Option1", "Option2", "Option3"];
            return options.map(option => ({ text: option, iconUrl: "" }));
        },
        handleInput: (state, input, playerId) => { //TODO: only allow one vote per player
            if (state[input] !== undefined) {
                state[input] += 1;
            }
            return state;
        },
        tickRate: 1000,
        tick: (state, size) => {
            return state;
        },
        output: (state, size) => {
            var items = [];
            var keys = Object.keys(state);
            var y = 16;
            var max = Math.max(...Object.values(state), 1);
            for (var i = 0; i < keys.length; i++) 
            {
                var key = keys[i];
                var value = state[key];
                items.push( { type: "text", x: 16, y: y, width: size.width, height: 32, color: "#000000", text: `${key}`, fontSize: 24 } );
                y += 32+8;    
                items.push( { type: "box", x: 16, y: y, width: value * 32, height: 32, color: value == max ? "#f96c6cff" : "#0aae8d", text: `${value}`, textAlign: "center" } );
                y += 32+16+8; 
            }

            items.push({ type: "circle", image: "https://pbs.twimg.com/profile_images/1751551892965240832/wZC0QNYZ_400x400.jpg",
                    x: size.width - 256, y: size.height - 256, radius: 256, color: "#00ff00", text: "Dr Wells", textAlign: "center",
                    textColor: "#d03737ff", fontSize: 32
             });


            
            return items;
        },
        rooms: [],
        initialState: (settings) => { 
            var options = settings.VotingOptions ? settings.VotingOptions.split(",") : ["Option1", "Option2", "Option3"];
            return options.reduce((acc, option) => {
                acc[option] = 0;
                return acc;
            }, {});
        },
        settings: [
            { name: "VotingOptions", defaultValue: "Rumi,Mira,Zoey" },
            { name: "OrUseScrape", defaultValue: "false" },
        ],
        addPlayer: (room, name) => { } ,
        removePlayer: (room, name) => { } ,
    },{
        id: "platform",
        title: "Game 1",
        url: "https://utasbot.dev/kit214/vm2/platform",
        tickRate: 30,
        maxPlayers: 4, 
        inputs: (state, settings) => { 
            return [
                { text: "jump", iconUrl: "http://example.com/up.png", disabled: false },
                { text: "left", iconUrl: "http://example.com/left.png", disabled: false },
                { text: "right", iconUrl: "http://example.com/right.png", disabled: false },
            ];
        },
        handleInput: (state, input, playerId) => {
            var player = state.players.find(p => p.name === playerId);
            if (!player) return state;
            //jump
            if (input === "jump" && player.y === 0) {
                player.velocity = 10; // jump impulse
            }
            //left and right
            if (input === "left") {
                player.x -= 5;
            }
            if (input === "right") {
                player.x += 5;
            }
            return state;
        },
        tick: (state, size) => {
            for (var player of state.players) {
                player.acceleration = -0.5; // gravity

                player.velocity += player.acceleration;
                player.y += player.velocity;
                console.log(player);
                if (player.y < 0) {
                    player.y = 0;
                    player.velocity = 0;
                }
            }
            for (var obstacle of state.obstacles) {
                obstacle.x -= 20; // move obstacles left
                if (obstacle.x + obstacle.width < 0) {
                    obstacle.x = size.width + 100; // respawn off screen
                }
            }
            return state;
        },
        output: (state, size) => {
            var items = [];
            for (var i = 0; i < state.players.length; i++) {
                var player = state.players[i];
                items.push({ type: "box", x: player.x, y: size.height - 50 - player.y, width: 50, height: 50, color: player.color, text: `${player.name}` });
            }
            for (var obstacle of state.obstacles) {
                items.push(obstacle);
            }   
            return items;
        },
        rooms: [],
        initialState: (settings) => { 
            //generate 10 obstacles, each at a random y position, each with a height of 20, and spaced 200 apart
            var obstacles = [];
            for (var i = 0; i < 10; i++) {
                var y = 0;//size.height - Math.floor(Math.random() * 100) ;
                obstacles.push({ type: "box", x: i * 200 + 300, y: y, width: 50, height: 20, color: "#654321", text: "" });
            }
            return {players:[], obstacles}; 
        },
        settings: [],

        addPlayer: (room, name) => { room.state.players.push({ name: name, x: 100 + room.state.players.length * 60, y: 0, velocity: 0, acceleration: 0, color: '#' + Math.floor(Math.random()*16777215).toString(16) });  } ,
        removePlayer: (room, name) => { room.state.players = room.state.players.filter(p => p.name !== name); } ,
    },
];

export const rooms = [
    { id: "ABC", gameId: "platform", players: [], state: [], settings: { } },
    { id: "DEF", gameId: "voting", players: [], state: [], settings: { VotingOptions: "Option1,Option2,Option3" } }
];
export function initFakeData()
{
    games.forEach(game => {
        game.rooms = rooms.filter(room => room.gameId === game.id);
        game.rooms.forEach(room => {
            room.state = game.initialState(room.settings);
        });
    });
}
