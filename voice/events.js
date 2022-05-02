import { adminCommandOnly, pluralize } from '../core/utils.js';
import { registerCommand } from '../guild/commands.js';

export default async function(client)
{
    const muteAllCommand = {
        name: 'mute_all',
        description: '(ADMIN ONLY) Mutes all people in the same voice channel that you are in.',
        options: [{
            name: "force",
            description: "Server mute people, even if they are self-muted (default is false)",
            type: "BOOLEAN"
        }]
    }; 
    const unmuteAllCommand = {
        name: 'unmute_all',
        description: '(ADMIN ONLY) Unmutes all people in the same voice channel that you are in who were previously muted.',
    }; 

    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, muteAllCommand);
        await registerCommand(guild, unmuteAllCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {
        // If the interaction isn't a slash command, return
        if (interaction.isCommand() && interaction.guild)
        {
            if (interaction.commandName === "mute_all") 
            {
                await doMuteAllCommand(interaction);            
            }
            else if (interaction.commandName === "unmute_all") 
            {
                await doUnMuteAllCommand(interaction);            
            }
            
        }
    });
}

async function doMuteAllCommand(interaction)
{
    if (await adminCommandOnly(interaction)) return;

    var force = interaction.options.getBoolean("force") ?? false;

    
    await interaction.deferReply({ephemeral:true});

    var member = interaction.member;
    var count = 0;
    let channel = member.voice.channel;
    if (channel == undefined)
    {
        return await interaction.editReply({ content: "You are not in a voice channel." });
    }
    for (let m of channel.members) {
        var member = m[1];
        if (member.voice.selfMute == false || force)
        {
            member.voice.setMute(true);
            count++;
        }
    }
            
    await interaction.editReply({ content: `Muted ${pluralize(count,"Member")}` });
}

async function doUnMuteAllCommand(interaction)
{
    if (await adminCommandOnly(interaction)) return;

    
    await interaction.deferReply({ephemeral:true});

    var member = interaction.member;
    var count = 0;
    let channel = member.voice.channel;
    if (channel == undefined)
    {
        return await interaction.editReply({ content: "You are not in a voice channel." });
    }
    for (let m of channel.members) {
        var member = m[1];
        if (member.voice.serverMute == true)
        {
            member.voice.setMute(false);
            count++;
        }
    }
            
    await interaction.editReply({ content: `Unmuted ${pluralize(count,"Member")}` });
}
