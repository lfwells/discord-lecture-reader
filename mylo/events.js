import { getCachedInteraction, registerCommand,registerApplicationCommand, } from '../guild/commands.js';
import { deleteStudentProperty, isStudentMyLOConnected } from '../student/student.js';

import { checkMyLOAccessAndReply, getMyLOConnectedMessageForInteraction, getMyLOContentEmbed, getMyLOContentLink, getMyLOData } from './mylo.js';
import { MessageActionRow, MessageButton, MessageSelectMenu } from 'discord.js';
import { setGuildContextForInteraction } from '../core/errors.js';
import { traverseContentTree, traverseContentTreeSearch } from './routes.js';
import { pluralize } from '../core/utils.js';

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

    const myloContentCommand = {
        name: 'mylo_page',
        description: 'Search for a MyLO page to hot-link. Bot will list possible pages to publicly post',
        options: [  
            {
                name: "search", type: "STRING", description: "Search term to find a page on MyLO",
                required: true
            },
            //optionally tag another member
            {
                name: "member", type: "USER", description: "Tag another member to share the link with",
                required: false
            },
            //optionally search it just for yourself
            {
                name: "private", type: "BOOLEAN", description: "Only show the link to you (useful for searching for yourself)",
                required: false
            }
        ]
    }
    
    await registerApplicationCommand(client, myloCommand);


    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, myloContentCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {
        setGuildContextForInteraction(interaction);
        
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
            else if (interaction.commandName == "mylo_page")
            {
                await doMyLOPageCommand(interaction);
            }
        }
        // If the interaction isn't a slash command, return
        else if (interaction.isMessageComponent() && interaction.message.interaction)
        {
            if (interaction.customId == "disconnect") 
            {
                await doMyLODisconnectCommandButton(interaction, await getCachedInteraction(interaction.guild, interaction.message.interaction.id));
            }

            if (interaction.customId.startsWith("mylo_page_"))
            {
                await doMyLOPageSelectCommand(interaction);
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

async function doMyLOPageCommand(interaction)
{
    
    await interaction.deferReply({ ephemeral: true });

    var root = (await getMyLOData(interaction.guild, "content")).data().data;
    let search = interaction.options.getString("search");
    let flatContent = traverseContentTreeSearch(root, e => (e.Title ?? "").toLowerCase().includes(search.toLowerCase()))
        .map(e => { return { Title: e.Title, Id: e.ModuleId ?? e.TopicId, IsHidden: e.IsHidden } });
    console.log({flatContent});

    //indicate if no results found
    if (flatContent.length == 0)
    {
        await interaction.editReply({ content: "No pages found matching that search term."});
        return;
    }

    //if only one result, ask the user if they would like to post it
    if (flatContent.length == 1)
    {
        var page = flatContent[0];
        var pageEmbed = {
            title: page.Title,
            description: `Would you like to post a link to this page?`
        };
        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(`mylo_page_${page.Id}`)
                    .setLabel('Yes, post a link')
                    .setStyle('PRIMARY')
            );
        await interaction.editReply({ embeds: [ pageEmbed ], components: [ row ] });
        return;
    }

    //otherwise show a discord dropdown box of all possible options (without going over the documented limit of options)
    var options = flatContent.map((e,i) => { return { label: e.Title, value: `mylo_page_${e.Id}` } });
    if (options.length > 25) options = options.slice(0, 25);
    console.log({options});

    var selectRow = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId(`mylo_page_select`)
                .setPlaceholder('Select a page to link')
                .addOptions(options)
            )
        
    await interaction.editReply({ content: `Found ${pluralize(options.length, "page")}. Select a page to link:`, components: [ selectRow ]});
}

async function doMyLOPageSelectCommand(interaction)
{
    //get the id of the page from the interaction
    var pageID = interaction.customId.replace("mylo_page_", "");
    if (pageID == "select")
        pageID = interaction.values[0].replace("mylo_page_", "");
    await interaction.deferReply({ ephemeral: false });

    let root = traverseContentTree((await getMyLOData(interaction.guild, "content")).data().data, pageID);
    console.log({root});
    let html = root.Description?.Html;
    //extract a youtube embed url from the html
    let youtubeURL = html?.match(/https:\/\/www.youtube.com\/embed\/[a-zA-Z0-9_-]{11}/)?.[0];
    //convert that embed url into a regular youtube link
    if (youtubeURL) youtubeURL = youtubeURL.replace("https://www.youtube.com/embed/", "https://www.youtube.com/watch?v=");
    let content = `<@${interaction.member.id}> shared a link to a MyLO page:`;
    
    let embed = await getMyLOContentEmbed(root, interaction.guild, youtubeURL);
    //if there was a youtube url, obtain the thumbnail image for the video id
    if (youtubeURL)
    {
        let videoID = youtubeURL.replace("https://www.youtube.com/watch?v=", "");
        embed.image = { url: `https://img.youtube.com/vi/${videoID}/0.jpg` };
    }

    await interaction.editReply({ embeds: [embed], content });
}