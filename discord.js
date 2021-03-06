//discord
import { getClient, init_client } from './core/client.js'; 

//web server
import { app } from "./core/server.js";

//web server routes
import init_routes from './core/routes.js';
init_routes(app);

//import things need to initialize discord
import * as guild from "./guild/guild.js";

//listen for when discord is logged in
const client = getClient();
client.on('ready', async () => 
{
	console.log(`Logged in as ${client.user.tag}!`);

	//save all the guilds etc to db
	guild.init(client);

	init_client(client);
});

//login with discord auth token
import token from './core/token.js';
client.login(token);

//register for errors to be posted to test server
import { initErrorHandler } from './core/errors.js';
initErrorHandler(client);