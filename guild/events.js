import { init_client } from '../core/client.js';
import { getGuildDocument } from "./guild.js";

export default async function(client)
{
    client.on('guildCreate', async (guild) => 
    {
        console.log("guildCreate", guild); 
        var guildDocument = getGuildDocument(guild.id);
        guildDocument.set({
            name:guild.name
        });
        init_client(client);
    });

    client.on("guildUpdate", async (oldGuild, newGuild) => {
        console.log("guildUpdate", newGuild); 
        var guildDocument = getGuildDocument(newGuild.id);
        guildDocument.set({
            name:newGuild.name
        });
        init_client(client);
    });
}