import * as config from '../core/config.js';
import { MessageActionRow, MessageButton } from 'discord.js';
import { getCachedInteraction, registerCommand,registerApplicationCommand, storeCachedInteractionData } from '../guild/commands.js';

import { oauthDiscordMyLOConnect, scopeMyLOConnect } from '../core/login.js';

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

    const rows = [ row ]

    await interaction.editReply({ components: rows });
}

async function doMyLOConnectCommandButton(i, originalInteraction)
{
    if (i.customId === 'primary') {
        //await i.deferUpdate();
        //await wait(4000);
        
        originalInteraction = await storeCachedInteractionData(i.guild, originalInteraction.id, { clicks: originalInteraction.clicks + 1 });
        
        var extra = "";
        if (config.LINDSAYS_SERVERS.indexOf(i.guild.id) >= 0)
        {
            if (originalInteraction.clicks == 5) extra = ", oh boy, here we go.";
            if (originalInteraction.clicks == 10) extra = ", clicky clicky! That feels nice!";
            if (originalInteraction.clicks == 11) extra = ", (ew)";
            if (originalInteraction.clicks == 69) extra = ", nice.";
            if (originalInteraction.clicks == 420) extra = ", go to bed, kiddos.";
            if (originalInteraction.clicks == 666) extra = ", now you've done it!";
            if (originalInteraction.clicks == 777) extra = ", cha-ching!";
        }

        await i.update({ content: pluralize(originalInteraction.clicks, "click") + extra });
    }
}
