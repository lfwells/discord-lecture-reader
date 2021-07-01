import * as config from '../core/config.js';
import { guildsCollection } from "../core/database.js";

export default function(client)
{
    client.on('message', async (msg) =>  
    {
        if (msg.channel.id == config.ERROR_LOG_CHANNEL_ID) return; //dont get stuck in a loop recording error logs lol
        console.log(msg);
        var guildDocument = guildsCollection.doc(msg.guild.id);
        var record = {};
        record.dump = JSON.stringify(msg);
        record.author = msg.author.id;
        record.channel = msg.channel.id;
        record.content = msg.content;
        console.log(record);

        await guildDocument.collection("analytics").add(record);
    });
}