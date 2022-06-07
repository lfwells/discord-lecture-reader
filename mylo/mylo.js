import { getStudent, isStudentMyLOConnected } from "../student/student.js";
import { MessageActionRow, MessageButton } from 'discord.js';
import { oauthDiscordMyLOConnect, scopeMyLOConnect } from '../core/login.js';
/*
TODO: 
- bot application commands need a cache, and need to basically handle guild == null
- add a Disconnect button to the connected embed
- /mylo disconnect
- do a sample /mylo grades command 
- /mylo status (shows connected or not)
- proactive bot sending dm on joining server if student not connected (and not notified before)

*/

export async function getMyLOConnectedMessageForInteraction(interaction)
{
    var studentDiscordID = interaction.member.id;
    return await getMyLOConnectedMessage(studentDiscordID, interaction);
}
export async function getMyLOConnectedMessage(studentDiscordID, interaction)
{
    var student = getStudent(studentDiscordID);
    if (isStudentMyLOConnected(studentDiscordID))
    {
        var connectedEmbed = {
            title: "MyLO Account Connected",
            fields: [
                { name: "Student ID", value:student.studentID }
            ],
        };
        return { embeds: [ connectedEmbed], components:[] };
    }
    else
    {
        if (interaction == null)
        {
            var notConnectedEmbed = {
                title: "MyLO Account Not Connected",
                description: "Run `/mylo connect` to Connect Your Account",
                fields: [],
            };
            
            return { embeds: [ notConnectedEmbed ], components:[]};
        }

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
                    .setLabel('Connect Discord account to MyLO Account')
                    .setStyle('LINK')
                    .setURL(discordOauth)
                    .setEmoji('🔗')
            );

        const rows = [ row ];
        return { embeds:[], components: rows };
    }
}