import { init_client } from '../core/client.js';
import { getGuildDocument, init_admin_users } from "./guild.js";
import * as config from "../core/config.js";

export default async function(client)
{
    client.on('guildCreate', async (guild) => 
    {
        console.log("guildCreate", Object.assign({
            name:guild.name,
        }, config.DEFAULT_GUILD_PROPERTIES)); 
        var guildDocument = await getGuildDocument(guild.id);
        guildDocument.set(
            Object.assign({
                name:guild.name,
            }, config.DEFAULT_GUILD_PROPERTIES),
            { merge: true }
        );
        init_client(client);
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
        console.error(`a guild member changes - i.e. new role, removed role, nickname.`);
        init_admin_users(oldMember.guild);
    });
}