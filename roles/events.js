import { adminCommandOnly } from "../core/utils.js";
import { MessageActionRow, MessageButton } from 'discord.js';
import { assignRole, getRoleByName, getRoleByNameOrCreate, hasRole, unAssignRole } from "./roles.js";
import { registerCommand } from "../guild/commands.js";

export default async function (client)
{
    //commands (/role_select_message)
    //TODO: allow people to un-select a role by clicking it again
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
        await registerCommand(guild, roleSelectCommand);
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
    var roles = [];
    for (var i = 1; i <= 8; i++)
    {
        var option = interaction.options.getString("role_"+i);
        if (option != null)
            roles.push(option);
    }
    //msg += roles.join(",");

    var response_message = interaction.options.getString("response_message") ?? "Thanks!";
    var limit_to_one = interaction.options.getBoolean("limit_to_one") ?? true;
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
        var humanRoleName = i.customId;
        var unpickedRoles = [];
        var roleName = humanRoleName.toLowerCase();

        await Promise.all(Object.values(roleObjects).map( async (role) => 
        { 
            if (role.name.toLowerCase() == roleName)
            {
                if (limit_to_one == false && await hasRole(interaction.guild, i.member, role))
                {
                    await unAssignRole(interaction.guild, i.member, role);
                    console.log(`unassigned ${i.member.nickname ?? i.member.username} from ${role.name}`);

                    unpickedRoles.push(role.name);
                }
                else
                {
                    await assignRole(interaction.guild, i.member, role);
                    console.log(`assigned ${i.member.nickname ?? i.member.username} to ${role.name}`);
                }
            }
            else if (limit_to_one)
            {
                var hadRole = await hasRole(interaction.guild, i.member, role);

                await unAssignRole(interaction.guild, i.member, role);
                console.log(`unassigned ${i.member.nickname ?? i.member.username} from ${role.name}`);

                if (hadRole) unpickedRoles.push(role.name);
            }
        }));

        await i.update({ content: msg, components: rows });

        var unpickedText = "";
        if (unpickedRoles.length > 0)
            unpickedText = `Unassigned from ${unpickedRoles.map(e => `**${e}**`).join(", ")}.\n`;
        await i.followUp({
            content: `Assigned **${humanRoleName}**.\n${unpickedText}\n${response_message}`,
            ephemeral: true
        });
    });
    
    collector.on('end', collected => console.log(`Collected ${collected.size} items`));
    
    await interaction.editReply({ content: msg, components: rows });
}