//discord
import getClient from './core/client.js'; 

//web server
import { app } from "./core/server.js";

//web server routes
import init_routes from './core/routes.js';
init_routes(app);

//import things need to initialize discord
import * as guild from "./guild/guild.js";
import init_award_events from './awards/events.js';
import init_responder_events from './responder/events.js';
import init_attendance_events from './attendance/events.js';

//listen for when discord is logged in
const client = getClient();
client.on('ready', async () => 
{
	console.log(`Logged in as ${client.user.tag}!`);

	//save all the guilds etc to db
	guild.init(client);

	//register the appropriate discord event listeners
	init_award_events(client);
	init_responder_events(client);
	init_attendance_events(client);
});

//login with discord auth token
import token from './core/token.js';
client.login(token);

//register for errors to be posted to test server
import * as errors from './core/errors.js';