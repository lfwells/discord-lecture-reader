import * as config from '../core/config.js';
import { reply } from '../core/client.js';
import { isOutsideTestServer, getStatus } from '../core/utils.js';
import replies from './replies.js';
import { getGuildDocument } from '../guild/guild.js';

//lindsay in the chat (KIT305 only)
//TODO: make this configurable etc
export default async function(client) 
{
    client.on('messageCreate', async (msg) =>  
    {
        if (msg.inGuild() == false) return;
        if (isOutsideTestServer(msg.channel.guild)) return;
        
        if ([config.SIMPLE_POLL_BOT_ID, config.LINDSAY_ID, client.user.id].indexOf(msg.author.id) == -1)
        {
            //be a reply guy
            if (msg.mentions.everyone == false  && msg.mentions.has(client.user)) 
            { 
                //we check, whether the bot is mentioned, client.user returns the user that the client is logged in as
                //this is where you put what you want to do now
                var replyMessage = replies[Math.floor(Math.random() * replies.length)];
                await reply(msg, replyMessage);
            }

            var m = msg.cleanContent.toLowerCase();
            if (msg.guild.id == config.KIT305_SERVER || msg.guild.id == config.KIT109_S2_2021_SERVER) //TODO: this will get out of hand
            {
                if (msg.mentions.everyone == false  && (m.indexOf("lindsay") >= 0 || msg.mentions.has(config.LINDSAY_ID)))
                {
                    var status = await getStatus(config.LINDSAY_ID, msg.guild);
                    
                    var guildDocument = await getGuildDocument(msg.guild.id);
                    var guildDocumentSnapshot = await guildDocument.get();
                    var lastAutoReply = await guildDocumentSnapshot.get("lastAutoReply");
                    if (!lastAutoReply)
                    lastAutoReply = 0;

                    var d = new Date();
                    var now = d.getTime();
                    var AUTO_REPLY_TIMEOUT = 1000 * 60 * 60; //every hr

                    console.log("detect a lindsay mention", status, now - lastAutoReply);

                    //TODO this timeout should be per channel, but is currently per server
                    if ((now - lastAutoReply) > AUTO_REPLY_TIMEOUT)
                    {
                    var replied = false;
                    if (status.available == "dnd")
                    {
                        if (status.status)
                            await reply(msg, "<@"+config.LINDSAY_ID+">'s status says '"+status.status+"' (do not disturb)-- he might not be able to reply");
                        else
                            await reply(msg, "<@"+config.LINDSAY_ID+"> is set to Do Not Disturb, he may be busy -- perhaps someone here can help?");
                        replied = true;
                    }
                    if (status.available == "idle")
                    {
                        if (status.status)
                            await reply(msg, "<@"+config.LINDSAY_ID+">'s status says '"+status.status+"' -- he might not be able to reply");
                        else
                            await reply(msg, "<@"+config.LINDSAY_ID+"> is idle -- lets see if he shows up?");
                        replied = true;
                    }
                    if (status.available == "offline")
                    {
                        if (status.status)
                            await reply(msg, "<@"+config.LINDSAY_ID+">'s status says '"+status.status+"' (offline) -- he might not be able to reply");
                        else
                            await reply(msg, "<@"+config.LINDSAY_ID+"> is (supposedly) offline -- lets see if he shows up?");
                        replied = true;
                    }
                    
                    if (replied)
                    {
                        guildDocument.update({
                            lastAutoReply:now
                            });
                        }
                    }
                }
            }
        }
    });
}