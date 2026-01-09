import { offTopicCommandOnly, pluralize } from '../core/utils.js';
import { MessageActionRow, MessageButton } from 'discord.js';
import { registerCommand, storeCachedInteractionData } from '../guild/commands.js';
import { setGuildContextForInteraction } from '../core/errors.js';

export default async function(client)
{    
    //commands (/profile)
    // The data for our command]
    const profileCommand = {
        name: 'profile',
        description: 'Generates a link to your (or someone else\'s) UTAS Bot profile'.,
        options: [{
            name: 'user',
            type: 'MEMBER',
            description: 'The profile you would like a link to (defaults to YOU)',
            required: false,
        }, {
            name: "public",
            type: "BOOLEAN",
            description: "Whether or not to show the link publicly (defaults to TRUE)",
            required: false
        }],}; 

    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, profileCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {
        setGuildContextForInteraction(interaction);
        
        // If the interaction isn't a slash command, return
        if (interaction.isCommand() && interaction.guild)
        {
            if (interaction.commandName === "profile") 
            {
                await doProfileCommand(interaction);            
            }
        }
    });

}


async function doProfileCommand(interaction)
{
    //only allow in off topic
    if (await offTopicCommandOnly(interaction)) return;
    
    await interaction.deferReply();

    await storeCachedInteractionData(interaction.guild, interaction.id, { });

    const row = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('primary')
            .setLabel("Open Profile")
            .setStyle('LINK')
            .setEmoji('🔗')
    );

    const rows = [ row ]

    await interaction.editReply({ components: rows });
}
