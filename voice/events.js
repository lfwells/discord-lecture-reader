import { getClassList } from '../classList/classList.js';
import { setGuildContextForInteraction } from '../core/errors.js';
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
    const snapCommand = {
        name: 'snap',
        description: 'Kicks and Bans half of the people from the server at random, like Thanos!',
    }; 

    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, muteAllCommand);
        await registerCommand(guild, unmuteAllCommand);
        await registerCommand(guild, snapCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {
        setGuildContextForInteraction(interaction);
        
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
            else if (interaction.commandName === "snap") 
            {
                await doSnapCommand(interaction);            
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


async function doSnapCommand(interaction)
{
    console.log("doSnapCommand");
    await interaction.deferReply({ephemeral: false});

    var content = "Okay not really but, here's who would have been kicked:\n";
    var classList = await getClassList(interaction.guild);
    
    let shuffled = classList
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);


    var n = shuffled.length / 2;
    let chosen = shuffled
        .slice(0, n)
        .sort((a, b) => a.discordName.localeCompare(b.discordName));

    content += chosen.map(e => e.discordName).join("\n");

    content = content.substr(0, 2000);
    
    await interaction.editReply({ content });
}
