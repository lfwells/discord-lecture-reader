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
        Intents.FLAGS.GUILD_SCHEDULED_EVENTS,
        Intents.FLAGS.DIRECT_MESSAGES,
    ],partials: ["CHANNEL"],
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
export async function send(channel, message, dontLogIt)
{
    if (channel && channel.send)
    {
        var result = null;
        if (config.enableSendMessagesAndReplies)
        {
            result = await channel.send(message);
            if (!dontLogIt) console.log("SENT: "+message);
        } 
        else
        {
            if (!dontLogIt) console.log("(would have) SENT: "+message);
        }
        return result;
    }
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
import init_role_events from '../roles/events.js';
import init_help_events from '../help/events.js';
import init_threader_events from "../threader/events.js";
import { init_application_commands, init_interaction_cache } from '../guild/commands.js';

var activityInterval;
export async function init_client(client)
{
    console.log("Begin init_client...");
    client.removeAllListeners();

    if (activityInterval) clearTimeout(activityInterval);
    activityInterval = setInterval(() => {
        client.user.setActivity(`${client.guilds.cache.size} Servers | /help`, { type: 'WATCHING' })
    }, 60000);

	//register the appropriate discord event listeners
    console.log("Init Application Commands...");await init_application_commands(client);
    console.log("Init Guild Events...");	    await init_guild_events(client);
	console.log("Init Award Events...");	    await init_award_events(client);
	console.log("Init Responder Events...");	await init_responder_events(client);
	console.log("Init Attendance Events...");	await init_attendance_events(client);
	console.log("Init Invite Events...");	    await init_invite_events(client);
	console.log("Init Analytics Events...");	await init_analytics_events(client);  
	console.log("Init Poll Events...");	        await init_poll_events(client);  
	console.log("Init Audit Events...");	    await init_audit_events(client);   
    console.log("Init TODO Events...");	        await init_todo_events(client);
    console.log("Init Role Events...");	        await init_role_events(client);
    console.log("Init Interaction Cache...");   await init_interaction_cache(client);
    console.log("Init Help Events...");         await init_help_events(client);
    console.log("Init Threader Events...");        await init_threader_events(client);
    console.log("End init_client.");
}
