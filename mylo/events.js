import * as config from '../core/config.js';
import { getCachedInteraction, registerCommand,registerApplicationCommand, storeCachedInteractionData } from '../guild/commands.js';

import { getMyLOConnectedMessageForInteraction } from './mylo.js';

export default async function(client)
{    
    const myloCommand = {
        name: 'mylo',
        description: 'A series of commands for integrating with MyLO. Currently prototyped and not implemented.', 
        options: [  
            {
                name: "connect", type:"SUB_COMMAND", description: "Connect your Discord Account to your MyLO Account",
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
            }
        }
        // If the interaction isn't a slash command, return
        else if (interaction.isMessageComponent() && interaction.message.interaction)
        {
            console.log(interaction.message.interaction.commandName);
            console.log(interaction.message.interaction.options.getSubcommand());
            if (interaction.message.interaction.commandName === "mylo") 
            {
                var subCommand = interaction.options.getSubcommand();
                if (subCommand === "connect")
                {
                    await doMyLOConnectCommandButton(interaction, await getCachedInteraction(interaction.guild, interaction.message.interaction.id));
                }
            }
        }
    });

}

async function doMyLOConnectCommand(interaction)
{
    console.log("mylo connect original interaction", interaction.id);

    
    await interaction.deferReply({ ephemeral: interaction.guild != null });

    await interaction.editReply(await getMyLOConnectedMessageForInteraction(interaction, "Connect Your Discord Account"));
}

