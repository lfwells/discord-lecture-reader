import * as config from '../core/config.js';
import { handleAwardNicknames } from "./awards.js";

export default function(client)
{
    client.on('message', async (msg) => 
    {
        console.log("check check");
    //detect update to awards (add)
    if (msg.channel.id == config.OFF_TOPIC_LISTS_CHANNEL_ID)
    {
        console.log("message added in off topics list");
        handleAwardNicknames(client);
    }
    });

    client.on('messageUpdate', async(msg) =>
    {
    //detect update to awards (edit)
    if (msg.channel.id == config.OFF_TOPIC_LISTS_CHANNEL_ID)
    {
        console.log("message update in off topics list");
        handleAwardNicknames(client);
    }
    });
    client.on('messageDelete', async(msg) =>
    {
    //detect update to awards (delete)
    if (msg.channel.id == config.OFF_TOPIC_LISTS_CHANNEL_ID)
    {
        console.log("message delete in off topics list");
        handleAwardNicknames(client);
    }
    });
}