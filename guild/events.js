import { init_client } from '../core/client.js';
import { getGuildDocument, getGuildProperty, guessConfigurationValues, hasFeature, init_admin_users } from "./guild.js";
import * as config from "../core/config.js";
import { newGuilds } from './commands.js';

export default async function(client)
{
    client.on('guildCreate', async (guild) => 
    {
        console.log("guildCreate", Object.assign({
            name:guild.name,
        }, config.DEFAULT_GUILD_PROPERTIES)); 

        newGuilds.push(guild);
        

        var guildDocument = await getGuildDocument(guild.id);
        guildDocument.set(
            Object.assign({
                name:guild.name,
            }, config.DEFAULT_GUILD_PROPERTIES),
            { merge: true }
        );

        await guessConfigurationValues(guild, true); //save = true

        await init_client(client);

        const index = newGuilds.indexOf(guild);
        if (index > -1) {
            newGuilds.splice(index, 1); // 2nd parameter means remove one item only
        }

    });

    client.on("guildUpdate", async (oldGuild, newGuild) => {
        //console.log("guildUpdate", newGuild); 
        var guildDocument = await getGuildDocument(newGuild.id);
        guildDocument.set(
            {
                name:newGuild.name
            },
            { merge: true }
        );
        init_client(client);
    });

    client.on("guildMemberUpdate", function(oldMember, newMember){
        console.log(`a guild member changes - i.e. new role, removed role, nickname.`);
        if (oldMember.user.id != client.user.id)
        {
            init_admin_users(oldMember.guild);
        }
        else
        {
            console.log("Just got kicked from a guild! "+oldMember.guild.id);
        }
    });

    //TODO: only send a message if we've NEVER seen them before (or maybe send a "welcome back" message)
    client.on("guildMemberAdd", async function(newMember) {
        console.log("a new guild member has joined!");
        if (hasFeature(newMember.guild, "dm_intro"))
        {
            newMember.send(`Hello ${newMember.displayName} and welcome to the **${newMember.guild.name}** Server!`);
            newMember.send(`I'm ${await getGuildProperty("botName", newMember.guild,"UTAS Bot")}. I'm a bot that you might see from time to time on the server. I'm here to help out and make the server more awesome!`);
            newMember.send(`If you would like to know more about what I can do, then type \`/help\` here or on the server.`);
            newMember.send(`I now feature a "profile" page, where you can track your achievements and stats across all your UTAS Discord Units. You can view it here: https://utasbot.com/profile/${newMember.id}`);
            newMember.send(`Note, I *am* a robot, and staff members *won't* read these messages!`);
        }
    });
    //Handle DM replies
    client.on("messageCreate", function(message)
    {
        if (message.inGuild() == false)
        {
            if (message.author.id != client.user.id)
            {
                message.reply("I am just a robot, messages sent here *are not seen by staff*. If you have a question for a staff member, please contact them directly.")
            }
        }
    });
}