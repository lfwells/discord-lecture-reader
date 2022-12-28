import { asyncForEach } from "../core/utils.js";
import { getGuildDocument, getGuildProperty } from "../guild/guild.js";

export async function getForums(guild)
{
    return await getGuildProperty("forums", guild, {});
}

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
        try
        {
            var channel = await guild.channels.fetch(messageChannelPair.channel);
            var message = await channel.messages.fetch(messageChannelPair.message);
            console.log(message.content);
            messagesPopulated.push(message);
        }
        catch (DiscordAPIError) { console.log("missing a deleted message when move/copy flagged"); }
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
    
    var lenBefore = data.messages.length;
    if (data.messages.findIndex(m => m.message == message) == -1)
    {
        data.messages.push({ 
            message,
            channel
        });
    }
    var lenAfter = data.messages.length;

    await saveFlaggedDocumentData(guild, user, data);

    return lenAfter > lenBefore;
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
export async function deleteFlaggedDocument(guild, user)
{
    var deleteCount = await clearFlaggedMessages(guild, user);
    var document = await getFlaggedDocument(guild, user);
    await document.delete();
    return deleteCount;
}
export async function postFlaggedMessagesEphemeral(interaction, message)
{
    message.ephemeral = true;

    var postedMessage = await interaction.editReply(message);

    /* TODO: the below doesn't quite work due to ephemeral not having an id
    potential solution = DM a message and store that

    //get the stored message
    var data = await getFlaggedDocumentData(interaction.guild, interaction.user);

    //if none, post and store message
    //if found, but not the same channel, post new and store message
    if (data.ephemeral == undefined || data.ephemeral.channel != interaction.channel.id)
    {
        var postedMessage = await interaction.editReply(message);
        console.log(postedMessage);
        return;
        data.ephemeral = {
            message:postedMessage.id,
            channel:interaction.channel.id
        };
        console.log(data);
        await saveFlaggedDocumentData(interaction.guild, interaction.user, data);
    }
    //if found, and same message, update message
    else
    {
        var channelObj = await interaction.guild.channels.fetch(interaction.channel.id);
        var postedMessage = await channelObj.messages.fetch(data.ephemeral.message);
        await postedMessage.edit(message);
    }
    */
}

