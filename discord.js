//discord
import { getClient, init_client } from './core/client.js'; 

//import things need to initialize discord
import init_guilds from "./guild/guild.js";
import init_students from "./student/student.js";


import { init_db } from './core/database.js';


import { initErrorHandler } from './core/errors.js';
import { init_server } from "./core/server.js";
import { init_google } from './analytics/sheets.js';

//listen for when discord is logged in
const client = getClient();
client.on('ready', async () => 
{
	await init_db(); 

	console.log(`Logged in as ${client.user.tag}!`);

	//google sheets
	await init_google();

	//save all the guilds etc to db
	await init_students(client);
	await init_guilds(client);

	await init_client(client);


	//register for errors to be posted to test server
	initErrorHandler(client);

	//web server
	init_server();

	console.log('\u0007');
	console.log("---------\nREADY\n---------"); 
});

//login with discord auth token
import token from './core/token.js';  
console.log("Logging in to Discord...");  
await client.login(token).catch(reason => {

    console.log("Login failed: " + reason);
    console.log("Token used: " + token);

}); 