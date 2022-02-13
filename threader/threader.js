import { asyncForEach } from "../core/utils.js";
import { getGuildDocument } from "../guild/guild.js";

async function getFlaggedDocument(guild, user)
{
    var collection = (await getGuildDocument(guild.id)).collection("flagged");
    var document = await collection.doc(user.id);
    return document;
}
async function getFlaggedDocumentData(guild, user)
{
    var document = await getFlaggedDocument(guild, user);
    var data = await document.get();
    return data.data() ?? {};
}
async function saveFlaggedDocumentData(guild, user, data)
{
    var document = await getFlaggedDocument(guild, user);
    await document.update(data, { merge: true });
}
export async function getFlaggedMessageIDs(guild, user)
{
    var data = await getFlaggedDocumentData(guild, user);
    return data.messages ?? [];
}
export async function getFlaggedMessages(guild, user)
{
    var messages = await getFlaggedMessageIDs(guild, user);
    var messagesPopulated = [];
    await asyncForEach(messages, async (messageChannelPair) => 
    { 
        var channel = await guild.channels.fetch(messageChannelPair.channel);
        var message = await channel.messages.fetch(messageChannelPair.message);
        console.log(message.content);
        messagesPopulated.push(message);
    });
    return messagesPopulated;
}
export async function addFlaggedMessage(guild, user, message, channel)
{
    var data = await getFlaggedDocumentData(guild, user);
    if (data.messages == undefined)
    {
        data.messages = [];
    }
    console.log(message);
    data.messages.push({ 
        message,
        channel
    });
    await saveFlaggedDocumentData(guild, user, data);
}
export async function removeFlaggedMessage(guild, user, message)
{
    var data = await getFlaggedDocumentData(guild, user);
    if (data.messages == undefined)
    {
        data.messages = [];
    }
    var lenBefore = data.messages.length;
    data.messages = data.messages.filter((v) => {
        return v.message != message;
    });
    var lenAfter = data.messages.length;
    await saveFlaggedDocumentData(guild, user, data);

    return lenAfter < lenBefore;
}
export async function clearFlaggedMessages(guild, user)
{
    var messages = await getFlaggedMessageIDs(guild, user);
    await saveFlaggedDocumentData(guild, user, { messages: [] });

    return messages.length;
}
export async function postFlaggedMessagesEphemeral(guild, user, channel)
{
    //get the stored message
    //if none, post and store message
    //if found, but not the same channel, post new and store message
    //if found, and same message, update message
}