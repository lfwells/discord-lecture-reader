import Discord from 'discord.js';
const client = new Discord.Client({ 
    intents: Discord.Intents.ALL,
    fetchAllMembers: true
});
export function getClient() { return client };

import * as config from "./config.js";

export async function reply(originalMessage, message)
{
    var result = null;
    if (config.enableSendMessagesAndReplies)
    {
        result = await originalMessage.reply(message);
        console.log("REPLIED: "+message);
    } 
    else
    {
        console.log("(would have) REPLIED: "+message);
    }
    return result;
}
export async function send(channel, message)
{
    var result = null;
    if (config.enableSendMessagesAndReplies)
    {
        result = await channel.send(message);
        console.log("SENT: "+message);
    } 
    else
    {
        console.log("(would have) SENT: "+message);
    }
    return result;
}

import init_award_events from '../awards/events.js';
import init_responder_events from '../responder/events.js';
import init_attendance_events from '../attendance/events.js';
import init_invite_events from '../invite/events.js';
import init_analytics_events from '../analytics/events.js';
import init_guild_events from '../guild/events.js';

export async function init_client(client)
{
    client.removeAllListeners();

	//register the appropriate discord event listeners
	await init_guild_events(client);
	await init_award_events(client);
	init_responder_events(client);
	await init_attendance_events(client);
	init_invite_events(client);
	init_analytics_events(client); 
}
