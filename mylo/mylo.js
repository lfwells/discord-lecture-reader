import { getStudent, isStudentMyLOConnected } from "../student/student.js";
import { MessageActionRow, MessageButton } from 'discord.js';
import { oauthDiscordMyLOConnect, scopeMyLOConnect } from '../core/login.js';
/*
TODO: 
- bot application commands need a cache, and need to basically handle guild == null
- /mylo disconnect
- do a sample /mylo grades command 
- /mylo status (shows connected or not) meh, connect does that now
- proactive bot sending dm on joining server if student not connected (and not notified before)

*/

export async function getMyLOConnectedMessageForInteraction(interaction, withEmbedTitle)
{
    var studentDiscordID = interaction.member.id;
    return await getMyLOConnectedMessage(studentDiscordID, interaction, withEmbedTitle);
}
export async function getMyLOConnectedMessage(studentDiscordID, interaction, withEmbedTitle)
{
    var student = getStudent(studentDiscordID);
    if (isStudentMyLOConnected(studentDiscordID))
    {
        var connectedEmbed = {
            title: "Discord Account Connected to MyLO",
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
                    //.setCustomId('primary')
                    .setLabel('Disconnect Account')
                    .setStyle('LINK')
                    .setURL(`https://131.217.172.176/myloDisconnect/${interaction.id}/${interaction.guild.id}`)
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