import { db, guildsCollection } from "../core/database.js";

export default async function(client)
{
    client.on('guildCreate', guild => 
    {
        console.log("guildCreate", guild); 
        var guildDocument = guildsCollection.doc(guild.id);
        guildDocument.set({
            name:guild.name
        });
    });

    client.on("guildUpdate", (oldGuild, newGuild) => {
        console.log("guildUpdate", newGuild); 
        var guildDocument = guildsCollection.doc(newGuild.id);
        guildDocument.set({
            name:newGuild.name
        });
    });
}