import { adminCommandOnly } from "../core/utils.js";

export default async function (client)
{
    //commands (/role_select_message)
    //TODO: a way of allowing only one option (and unassigning from other roles)
    // The data for our command
    const roleSelectCommand = {
        name: 'role_select_message',
        description: '(ADMIN ONLY) Provides users with buttons to self-assign themselves to roles (e.g. Select Campus)', //TODO: actually admin only
        options: [{
            name: 'message',
            type: 'STRING',
            description: 'The prompt to show users above the role select buttons.',
            required: true,
        },{
            name: 'role_1',
            type: 'STRING',
            description: 'Name of the first role button to appear (role will be automatically created if not found).',
            required: true,
        },{
            name: 'role_2',
            type: 'STRING',
            description: 'Name of second role button to appear (role will be automatically created if not found).',
            required: false,
        },{
            name: 'role_3',
            type: 'STRING',
            description: 'Name of third role button to appear (role will be automatically created if not found).',
            required: false,
        },{
            name: 'role_4',
            type: 'STRING',
            description: 'Name of fourth role button to appear (role will be automatically created if not found).',
            required: false,
        },{
            name: 'role_5',
            type: 'STRING',
            description: 'Name of fifth role button to appear (role will be automatically created if not found).',
            required: false,
        },{
            name: 'role_6',
            type: 'STRING',
            description: 'Name of sixth role button to appear (role will be automatically created if not found).',
            required: false,
        },{
            name: 'role_7',
            type: 'STRING',
            description: 'Name of seventh role button to appear (role will be automatically created if not found).',
            required: false,
        },{
            name: 'role_8',
            type: 'STRING',
            description: 'Name of eighth role button to appear (role will be automatically created if not found).',
            required: false,
        },{
            name: 'response_message',
            type: 'STRING',
            description: 'Custom response to show a user after they click a button. Will only appear for that user.',
            required: false,
        },{
            name: 'limit_to_one',
            type: 'BOOLEAN',
            description: 'Prevent users from selectin more than one option (if they do, roles are switched).',
            required: false,
        }],
    };
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await guild.commands.create(roleSelectCommand);//TODO: this is an admin command
    });

    client.on('interactionCreate', async function(interaction) 
    {
        // If the interaction isn't a slash command, return
        if (!interaction.isCommand()) return;
    
        // Check if it is the correct command
        if (interaction.commandName === "role_select_message") 
        {
            await doRoleSelectCommand(interaction);
        }
    });
}
async function doRoleSelectCommand(interaction)
{
    if (await adminCommandOnly(interaction)) return;
            
    await interaction.deferReply();

    var msg = interaction.options.getString("message");

    await interaction.editReply({ content: msg });
}