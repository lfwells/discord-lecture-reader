import { getStudent, isStudentMyLOConnected } from "../student/student.js";
import { MessageActionRow, MessageButton } from 'discord.js';
import { scopeMyLOConnect } from '../core/login.js';
import { oauthDiscordMyLOConnect } from "../_oathDiscordMyLOFlow.js";
import { getGuildDocument } from "../guild/guild.js";

export async function storeMyLOData(guild, data)
{
    //data = { structure: data };
    //data = data.map((item) => item.Title);
    var keys = Object.keys(data);
    for (var key of keys)
    {
        console.log({key});
        let document = (await getGuildDocument(guild.id)).collection("mylo").doc(key);
        await document.set(data);
    }
    return "Upload Complete";
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