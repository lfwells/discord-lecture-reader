import { getStudent, isStudentMyLOConnected } from "../student/student.js";
import { MessageActionRow, MessageButton } from 'discord.js';
import { scopeMyLOConnect } from '../core/login.js';
import { oauthDiscordMyLOConnect } from "../_oathDiscordMyLOFlow.js";
import { getGuildDocument, getGuildProperty } from "../guild/guild.js";
import { ROBO_LINDSAY_ID } from "../core/config.js";
import fetch, { Headers } from 'node-fetch';
import { setInterval } from 'timers';

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
    let topics = root.Structure;
    if (root.Topics != undefined) topics = root.Topics;
    if (topics)
    {
        if (forumChannel)
        {
            topics.reverse();
        }
        for (var topic of topics) 
        {
            if(topic.IsHidden) continue;
            
            res.write(`Creating thread: ${topic.Title}\n`);

            var message = {
                content: await getMyLOContentLink(topic, channel.guild)
            };

            if (forumChannel)
            {
                
                //look in the topic description for a youtube embed url, and extract the youtube link from it
                let foundYoutube = topic.Description.Html.match(/<iframe.*?src="https:\/\/www.youtube.com\/embed\/(.*?)".*?<\/iframe>/);
                if (foundYoutube)
                {
                    message.content += `\nhttps://www.youtube.com/watch?v=${foundYoutube[1]}`;
                }

                var newThread = await channel.threads.create({
                    name: topic.Title,
                    message
                });
                messages.push(newThread);
            }
            else
            {
                message.content = "# [" + topic.Title + "]("+message.content+")";
                let foundYoutube = topic.Description.Html.match(/<iframe.*?src="https:\/\/www.youtube.com\/embed\/(.*?)".*?<\/iframe>/);
                if (foundYoutube)
                {
                    message.content += `\n[YouTube Video](https://www.youtube.com/watch?v=${foundYoutube[1]})`;
                }

                var newMessage = await channel.send(message);
                console.log({newMessage});
                
                var newThread = await newMessage.startThread({
                    name: topic.Title
                });

                //var newMessage = newThread.send(message);
                messages.push(newMessage);
            }
        }
    }
    return messages;
}
export async function postChannelLinks(res, channel, forumChannel, root, singleLevel) 
{ 
    var messages = [];
    let topics = root.Structure;
    if (root.Topics != undefined) topics = root.Topics;
    if (topics)
    {
        for (var topic of topics)
        {
            if(topic.IsHidden) continue;
            
            res.write(`Creating message: ${topic.Title}\n`);

            var message = {
                //content: `**${getModuleTitle(module.Title)} - ${topic.Title}**\n${await getMyLOContentLink(topic, channel.guild)}`
                embeds:[
                    {
                        title:singleLevel ? 
                            `${topic.Title}` :
                            `${getModuleTitle(root.Title)} - ${topic.Title}`,
                        description:`${await getMyLOContentLink(topic, channel.guild)}`
                    },
                ]
            };
            //look in the topic description for a youtube embed url, and extract the youtube link from it
            let foundYoutube = topic.Description.Html.match(/<iframe.*?src="https:\/\/www.youtube.com\/embed\/(.*?)".*?<\/iframe>/);
            if (foundYoutube)
            {
                message.content = `https://www.youtube.com/watch?v=${foundYoutube[1]}`;
            }

            var newMessage = await channel.send(message);
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

    console.log({root});    
    var messages = [];
    var modules = root.Structure;
    if (root.Modules != undefined) modules = root.Modules;
    for (var module of modules)
    {
        console.log({module});
        if(module.isHidden) continue;
            
        if (module.Type == 0 || module.ModuleId != undefined)
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
    }
    return messages;
}
export async function deleteCategoryChannels(res, category)
{
    for await (var c of Array.from(category.children.values()))
    {
        res.write(`\tDeleting ${c.name}.\n`);
        await c.delete();
    }
}
export async function unarchiveAllThreads(guild)
{
    async function un(guild) { 
        for (const channel of guild.channels.cache.values()) {
            if (channel.isText() && !channel.isThread() && !channel.isVoice()) { 
                try {
                    // Fetch both active and archived threads
                    const activeThreads = await channel.threads.fetchActive();
                    const archivedThreads = await channel.threads.fetchArchived({ limit: 100 });

                    const allThreads = [...activeThreads.threads.values(), ...archivedThreads.threads.values()];

                    for (const thread of allThreads) {
                        if (thread.ownerId && (await thread.fetchOwner())?.user?.bot) {
                            if (thread.archived) {
                                console.log(`Unarchiving thread: ${thread.name}`);
                                await thread.setArchived(false);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching threads for ${channel.name}:`, error);
                }
            }
        }
    }

    un(guild).catch(console.error);
    // Schedule the unarchiveAllThreads function to run every 10 minutes
    setInterval(() => {
        // Replace 'yourGuild' with the actual guild object
        un(guild).catch(console.error);
    }, 10 * 60 * 1000);
}
export async function postChannelsWithThreads(res, category, forumChannel, root) 
{ 
    return await createChannels(res, category, root, forumChannel, postChannelThreads);
}
export async function postChannelsWithLinks(res, category, forumChannel, root) 
{  
    return await createChannels(res, category, root, forumChannel, postChannelLinks);
}

export async function getMyLOContentLink(item, guild)
{
    let OrgID = await getGuildProperty("myLOOrgID", guild);
    if (item.ModuleId != undefined)
        return `https://mylo.utas.edu.au/d2l/le/content/${OrgID}/Home?itemIdentifier=D2L.LE.Content.ContentObject.ModuleCO-${item.ModuleId}`;
    else if (item.TopicId != undefined)
    {
        if (item.Url?.startsWith("http"))
            return item.Url;
        else
            return `https://mylo.utas.edu.au/d2l/le/content/${OrgID}/viewContent/${item.TopicId}/View`;
    }
    else
        return '';
    
}
export async function getMyLOContentEmbed(item, guild, appendToDescription)
{
    let link = await getMyLOContentLink(item, guild);  
    return {
        title: item.Title,
        url: link,
        description: `${item.Description.Text} ${appendToDescription ?? ""}`,
        footer: { text: link.substr(0,2000) }
    };
    
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
                    .setURL(`https://utasbot.dev/myloDisconnect/${interaction.id}/${interaction.guild?.id ?? "dm"}`)
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

export async function getMyLOConnectedOAuthUser(auth) 
{
    var myHeaders = new Headers({
        "Authorization": `${auth.token_type} ${auth.access_token}`,
    });
    var result = await fetch('https://discord.com/api/users/@me', {
        headers:myHeaders 
    });
	var response = result.json();
    return response;
}