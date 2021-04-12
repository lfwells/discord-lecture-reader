import * as config from '../core/config.js';
import { handleAwardNicknames, isAwardChannelID } from "./awards.js";

export default function(client)
{
    client.on('message', async (msg) => 
    {
        if (await isAwardChannelID(msg.channel))
        {
            //detect update to awards (add)
            console.log("message added in off topics list");
            handleAwardNicknames(client, msg.channel);
        }
    });

    client.on('messageUpdate', async(msg) =>
    {
        if (await isAwardChannelID(msg.channel))
        {
            //detect update to awards (edit)
            console.log("message update in off topics list");
            handleAwardNicknames(client, msg.channel);
        }
    });

    client.on('messageDelete', async(msg) =>
    {
        if (await isAwardChannelID(msg.channel))
        {
            //detect update to awards (delete)
            console.log("message delete in off topics list");
            handleAwardNicknames(client, msg.channel);
        }
    });
}