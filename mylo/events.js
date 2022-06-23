import { getCachedInteraction, registerCommand,registerApplicationCommand, } from '../guild/commands.js';
import { deleteStudentProperty, isStudentMyLOConnected } from '../student/student.js';

import { checkMyLOAccessAndReply, getMyLOConnectedMessageForInteraction } from './mylo.js';
import { MessageActionRow, MessageButton } from 'discord.js';

export default async function(client)
{    
    const myloCommand = {
        name: 'mylo',
        description: 'A series of commands for integrating with MyLO. Currently prototyped and not implemented.', 
        options: [  
            {
                name: "connect", type:"SUB_COMMAND", description: "Connect your Discord Account to your MyLO Account",
            },
            {
                name: "disconnect", type:"SUB_COMMAND", description: "Connect your Discord Account to your MyLO Account",
            },
            {
                name: "grades", type:"SUB_COMMAND", description: "Show your grades for this unit.",
            },
        ]
    };
    
    await registerApplicationCommand(client, myloCommand);
    /*
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, myloCommand);
    });*/

    client.on('interactionCreate', async function(interaction) 
    {
        //only allow lindsay accounts
        //if (interaction.member.id != '318204205435322368' && interaction.member.id != '201865409207468032') return;

        // If the interaction isn't a slash command, return
        if (interaction.isCommand())// && interaction.guild)
        {
            if (interaction.commandName === "mylo") 
            {
                var subCommand = interaction.options.getSubcommand();
                if (subCommand === "connect")
                {
                    await doMyLOConnectCommand(interaction);
                }
                else if (subCommand === "disconnect")
                {
                    await doMyLODisconnectCommand(interaction);
                }
                else if (subCommand === "grades")
                {
                    await doMyLOGradesCommand(interaction);
                }
            }
        }
        // If the interaction isn't a slash command, return
        else if (interaction.isMessageComponent() && interaction.message.interaction)
        {
            if (interaction.customId == "disconnect") 
            {
                await doMyLODisconnectCommandButton(interaction, await getCachedInteraction(interaction.guild, interaction.message.interaction.id));
            }
        }
    });

}

async function doMyLOConnectCommand(interaction)
{    
    await interaction.deferReply({ ephemeral: interaction.guild != null });

    await interaction.editReply(await getMyLOConnectedMessageForInteraction(interaction, "Connect Your Discord Account"));
}

async function doMyLODisconnectCommand(interaction)
{
    await interaction.deferReply({ ephemeral: interaction.guild != null });

    if (await isStudentMyLOConnected(interaction.member.id ?? interaction.user.id) == false)
    {
        await interaction.editReply({ content: "Your Discord Account is not connected to MyLO."});
        return;
    }
    
    var disconnectEmbed = {
        title: "Are you sure you want to disconnect your Discord Account from your MyLO Account?",
       description: "You can reconnect again at any time using `/mylo connect`"
    };

    const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId("disconnect")
                .setLabel('Yes I am sure, disconnect my accounts')
                .setStyle('DANGER')
        );

        const rows = [ row ];
        interaction.editReply({ embeds: [ disconnectEmbed ], components: rows  });
}
async function doMyLODisconnectCommandButton(interaction, originalInteraction)
{
    var memberID = interaction.member.id ?? interaction.user.id;
    await deleteStudentProperty(memberID, "studentID");

    var disconnectedEmbed = {
        title: "Discord Account Disconnected from MyLO",
       description: "You can reconnect again at any time using `/mylo connect`"
    };

    await interaction.update({ embeds: [ disconnectedEmbed ] , components: [] });
}

async function doMyLOGradesCommand(interaction)
{
    await interaction.deferReply({ ephemeral: interaction.guild != null });

    if (await checkMyLOAccessAndReply(interaction)) return;

    var gradesEmbed = {
        title: "Grades for KIT305 Mobile Application Development",
        description: "These are the grades entered in the MyLO Gradebook. Please contact the Unit Coordinator if you think something is incorrect.",
        fields: [
            { name: "Assignment 1 - Prototyping", value: "80 HD" },
            { name: "Assignment 2 - Android Application", value: "79 DN" },
            { name: "Assignment 3 - iOS Application", value: "PP 53" },
            { name: "Assignment 4 - Flutter Application", value: "--" },
            { name: "Assignment 5 - Reflection Report", value: "--" },
            { name: "Tutorials", value: "8 / 10 (80%)" },
        ]
    };
    await interaction.editReply({ embeds: [ gradesEmbed ]});
}

