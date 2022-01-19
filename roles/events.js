import { adminCommandOnly } from "../core/utils.js";
import { MessageActionRow, MessageButton } from 'discord.js';
import { assignRole, getRoleByName, getRoleByNameOrCreate, unAssignRole } from "./roles.js";

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
        }/*,{ //roles 6 onwards would need another row, too lazy!
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
        }*/,{
            name: 'response_message',
            type: 'STRING',
            description: 'Custom response to show a user after they click a button. Will only appear for that user.',
            required: false,
        },{
            name: 'limit_to_one',
            type: 'BOOLEAN',
            description: 'Prevent users from selecting more than one option (if they do, roles are switched). Default: TRUE',
            required: false,
        }],
    };
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        //await guild.commands.create(roleSelectCommand);
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

    //testing because ran out of commands for the day lol
    //MOVE CONTENT LATER TO doRoleSelectCommand
    client.on("messageCreate", async function(interaction)
    {
        if (interaction.content && interaction.content.startsWith("/role_select_command"))
        {
            var msg = "Please select your campus";
            var roles = ["Hobart", "Launceston"];
            var limit_to_one = true;
            var roleObjects = {};
            
            const rows = [];

            await Promise.all(roles.map( async (role) => 
            { 
                var roleName = role;
                
                //get or create the role object
                var role = await getRoleByNameOrCreate(interaction.guild, roleName);
                roleObjects[roleName] = role;

                const row = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(roleName)
                            .setLabel(roleName)
                            .setStyle('PRIMARY')
                    );    
                rows.push(row);
            }));
            
            const collector = interaction.channel.createMessageComponentCollector({ time: 150000000 });
            collector.on('collect', async i => {
                var roleName = i.customId.toLowerCase();

                await Promise.all(Object.values(roleObjects).map( async (role) => 
                { 
                    if (role.name.toLowerCase() == roleName)
                    {
                        await assignRole(interaction.guild, i.member, role);
                        console.log(`assigned ${i.member.name} to ${role.name}`);
                    }
                    else
                    {
                        await unAssignRole(interaction.guild, i.member, role);
                        console.log(`unassigned ${i.member.name} from ${role.name}`);
                    }
                }));

                //TODO: unassign the others based upon the param

                await i.update({ content: msg, components: rows });

                //TODO: respond ephemerally
            });
            
            collector.on('end', collected => console.log(`Collected ${collected.size} items`));

            await interaction.reply({content: msg, components: rows});
        }
    });
}
async function doRoleSelectCommand(interaction)
{
    if (await adminCommandOnly(interaction)) return;
            
    await interaction.deferReply();

    var msg = interaction.options.getString("message");
    var roles = [];
    for (var i = 1; i <= 8; i++)
    {
        var option = interaction.options.getString("role_"+i);
        roles.push(option);
    }
    msg += roles.join(",");


    
    await interaction.editReply({ content: msg });
}