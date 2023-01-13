import { getStudent, isStudentMyLOConnected } from "../student/student.js";
import { MessageActionRow, MessageButton } from 'discord.js';
import { scopeMyLOConnect } from '../core/login.js';
import { oauthDiscordMyLOConnect } from "../_oathDiscordMyLOFlow.js";
import { getGuildDocument } from "../guild/guild.js";
import { ROBO_LINDSAY_ID } from "../core/config.js";

async function getMyLODataDoc(guild, key) { return (await getGuildDocument(guild.id)).collection("mylo").doc(key); }
export async function storeMyLOData(guild, data)
{
    //data = { structure: data };
    //data = data.map((item) => item.Title);
    var keys = Object.keys(data);
    for (var key of keys)
    {
        console.log({key});
        let document = await getMyLODataDoc(guild, key);
        await document.set({data:data[key]});
    }
    return "Upload Complete";
}
export async function getMyLOData(guild, key)
{
    let document = await getMyLODataDoc(guild, key);
    return await document.get();
}

//TODO: implement all link generators
export async function postChannelThreads(res, channel, forumChannel, root, singleLevel) 
{    
    var messages = [];
    if (root.Structure)
    {
        if (forumChannel)
        {
            root.Structure.reverse();
        }
        for (var topic of root.Structure)
        {
            res.write(`Creating thread: ${topic.Title}\n`);

            var message = {
                content: getMyLOContentLink(topic)
            };

            var newThread = forumChannel ? await channel.threads.create({
                name: topic.Title,
                message
            }) :  await channel.threads.create({
                name: topic.Title
            });
            if (forumChannel)
            {
                messages.push(newThread);
            }
            else
            {
                var newMessage = newThread.send(message);
                messages.push(newMessage);
            }
        }
    }
    return messages;
}
export async function postChannelLinks(res, channel, forumChannel, root, singleLevel) 
{ 
    var messages = [];
    if (root.Structure)
    {
        for (var topic of root.Structure)
        {
            res.write(`Creating message: ${topic.Title}\n`);

            var message = {
                //content: `**${getModuleTitle(module.Title)} - ${topic.Title}**\n${getMyLOContentLink(topic)}`
                embeds:[
                    {
                        title:singleLevel ? 
                            `${topic.Title}` :
                            `${getModuleTitle(root.Title)} - ${topic.Title}`,
                        description:`${getMyLOContentLink(topic)}`
                    }
                ]
            };

            var newMessage = channel.send(message);
            messages.push(newMessage);
        }
    }
    return messages;
}
function getModuleTitle(title)
{
    title = title.split(" - ")[0];
    return title;
}
async function createChannels(res, category, root, forumChannel, doWithChannel)
{
    let everyoneRole = category.guild.roles.cache.find(r => r.name === '@everyone');

    var messages = [];
    for (var module of root.Structure)
    {
        if (module.Type == 0)
        {
            let title = getModuleTitle(module.Title);
            title = title.replace(/[^\w\s]/gi, '').replaceAll(" ", "-").toLowerCase();
            res.write(`Creating module channel: ${title}\n`);

            var newChannel = await category.createChannel(title, {
                type: forumChannel ? 15 : 0, 
                permissionOverwrites: [
                    {
                      id: everyoneRole.id,
                      deny: ['SEND_MESSAGES', 'CREATE_PUBLIC_THREADS', 'CREATE_PRIVATE_THREADS'],
                   },
                   {
                     id: ROBO_LINDSAY_ID,
                     allow: ['SEND_MESSAGES', 'CREATE_PUBLIC_THREADS', 'CREATE_PRIVATE_THREADS'],
                  },
                ],
            });
            
            var newMessages = await doWithChannel(res,newChannel,forumChannel,module);
            messages.push(...newMessages);
        }
        break;
    }
    return messages;
}
export async function postChannelsWithThreads(res, category, forumChannel, root) 
{ 
    return await createChannels(res, category, root, forumChannel, postChannelThreads);
}
export async function postChannelsWithLinks(res, category, forumChannel, root) 
{  
    return await createChannels(res, category, root, forumChannel, postChannelLinks);
}

export function getMyLOContentLink(item)
{
    //TODO: orgID
    let OrgID = 505363;
    if (item.Type == 0)
        return `https://mylo.utas.edu.au/d2l/le/content/${OrgID}/Home?itemIdentifier=D2L.LE.Content.ContentObject.ModuleCO-${item.Id}`;
    else if (item.Type == 1)
        return `https://mylo.utas.edu.au/d2l/le/content/${OrgID}/viewContent/${item.Id}/View`;
    
}

//-------------------------------------------------------------
//everything after here is the old (unapproved) mylo connection
//-------------------------------------------------------------

/*
TODO: 
- /mylo disconnect
- /mylo status (shows connected or not) meh, connect does that now
- proactive bot sending dm on joining server if student not connected (and not notified before)

*/
export async function checkMyLOAccessAndReply(interaction, allowDM)
{
    //also check this isn't being run as a bot command
    if (interaction.guild == null && !allowDM)
    {
        interaction.editReply({ content: "You should run this command in the server of a unit." });
        return true;
    }

    var studentDiscordID = interaction.member?.id ?? interaction.user.id;
    if (isStudentMyLOConnected(studentDiscordID))
    {
        return false;
    }
    await interaction.editReply(await getMyLOConnectedMessageForInteraction(interaction, "You need to link your Discord Account to your MyLO Account to run this command"));
    return true;
}

export async function getMyLOConnectedMessageForInteraction(interaction, withEmbedTitle, withEmbedTitleForAlreadyConnected, withButtonText)
{
    var studentDiscordID = interaction.member?.id ?? interaction.user.id;
    return await getMyLOConnectedMessage(studentDiscordID, interaction, withEmbedTitle, withEmbedTitleForAlreadyConnected, withButtonText);
}
export async function getMyLOConnectedMessage(studentDiscordID, interaction, withEmbedTitle, withEmbedTitleForAlreadyConnected, withButtonText)
{
    var student = getStudent(studentDiscordID);
    if (isStudentMyLOConnected(studentDiscordID))
    {
        var connectedEmbed = {
            title: withEmbedTitleForAlreadyConnected ?? "Discord Account Connected to MyLO",
            fields: [
                { name: "Student ID", value:student.studentID }
            ],
        };
        if (interaction == null)
        {
            return { embeds: [ connectedEmbed ], components: []  };
        }
        else
        {
        
            const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setLabel(withButtonText ?? 'Disconnect Account')
                    .setStyle('LINK')
                    .setURL(`http://131.217.172.176/myloDisconnect/${interaction.id}/${interaction.guild?.id ?? "dm"}`)
                    .setEmoji('❌')
            );

            const rows = [ row ];
            return { embeds: [ connectedEmbed ], components: rows  };
        }
    }
    else
    {
        if (interaction == null)
        {
            var notConnectedEmbed = {
                title: withEmbedTitle ?? "Discord Account Not Connected to MyLO",
                description: "Connecting your Discord account will allow you run Discord Bot commands that read from your MyLO profile.\n\nNote that the bot will store an authentication token and *nothing else* about you.\n\nRun `/mylo connect` to Connect Your Account",
                fields: [],
            };
            
            return { embeds: [ notConnectedEmbed ], components:[]};
        }

        
        var notConnectedWithButtonEmbed = {
            title: withEmbedTitle ?? "Discord Account Not Connected to MyLO",
            description: "Connecting your Discord account will allow you run Discord Bot commands that read from your MyLO profile.\n\nNote that the bot will store an authentication token and *nothing else* about you.",
            fields: [],
        };

        const discordOauth = oauthDiscordMyLOConnect.generateAuthUrl({
            scope: scopeMyLOConnect, 
            //TODO: encode?
            state: JSON.stringify({ 
                guildID:interaction.guild?.id, 
                interactionID:interaction.id,
            }), 
        });

        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    //.setCustomId('primary')
                    .setLabel('Connect Discord Account to MyLO Account')
                    .setStyle('LINK')
                    .setURL(discordOauth)
                    .setEmoji('🔗')
            );

        const rows = [ row ];
        return { embeds:[ notConnectedWithButtonEmbed ], components: rows };
    }
}