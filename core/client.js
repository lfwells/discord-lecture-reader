import { Client, Intents } from 'discord.js';
const client = new Client({ 
    intents: [ 
        Intents.FLAGS.GUILDS, 
        Intents.FLAGS.GUILD_INVITES, 
        Intents.FLAGS.GUILD_MEMBERS, 
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS, 
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_MESSAGES, 
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_SCHEDULED_EVENTS
    ],
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
import init_poll_events from '../polls/events.js';
import init_audit_events from '../audit/events.js';
import init_todo_events from '../todo/events.js';
import { init_roles } from '../invite/roles.js';

export async function init_client(client)
{
    client.removeAllListeners();

	//register the appropriate discord event listeners
	await init_guild_events(client);
	await init_award_events(client);
	await init_responder_events(client);
	await init_attendance_events(client);
	await init_invite_events(client);
    await init_roles(client);
	await init_analytics_events(client);  
	await init_poll_events(client);  
	await init_audit_events(client);   
    await init_todo_events(client);
}
