import Discord from 'discord.js';
const client = new Discord.Client();
export default function getClient() { return client };

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
        console.log("SENT: "+reply);
    } 
    else
    {
        console.log("(would have) SENT: "+reply);
    }
    return result;
}