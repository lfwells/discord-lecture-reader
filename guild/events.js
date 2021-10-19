import { init_client } from '../core/client.js';
import { getGuildDocument, init_admin_users } from "./guild.js";

export default async function(client)
{
    client.on('guildCreate', async (guild) => 
    {
        //console.log("guildCreate", guild); 
        var guildDocument = getGuildDocument(guild.id);
        guildDocument.set(
            {
                name:guild.name
            },
            { merge: true }
        );
        init_client(client);
    });

    client.on("guildUpdate", async (oldGuild, newGuild) => {
        //console.log("guildUpdate", newGuild); 
        var guildDocument = getGuildDocument(newGuild.id);
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
        init_admin_users(oldMember.client);
    });
}