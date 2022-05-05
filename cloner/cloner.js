import { getClient } from '../core/client.js';
import { loadAllMessagesForChannel } from "../analytics/analytics.js";
import { postIndividualMessages } from "../threader/events.js";
import { asyncForEach } from '../core/utils.js';

export async function confirmCloneSettings(originalGuild, guild)
{
    
}
export async function cloneSettings(originalGuild, guild)
{
    
}

//TODO: choose if this should be in a thread
//TODO: chose if this should show the original post time
export async function cloneChannel(sourceChannelID, destinationChannelID, sourceGuild, destinationGuild)
{
    var client = getClient();

    var sourceChannel = await client.channels.fetch(sourceChannelID);
    var destinationChannel = await client.channels.fetch(destinationChannelID);

    var messages = await loadAllMessagesForChannel(sourceChannel);

    console.log(`cloning ${messages.length} messages from ${sourceChannel} in ${sourceGuild} to ${destinationChannel} in ${destinationGuild} `);

    await postIndividualMessages(destinationChannel, messages, false); //ephemeral=false
    /*
    await asyncForEach(messages, async (message) => {
        console.log("cloning message "+message.id);
        await destinationChannel.send(message);
    });*/

    return `Cloned ${messages.length} messages from ${sourceChannel} in ${sourceGuild} to ${destinationChannel} in ${destinationGuild} `;
}