import { getGuildDocument, hasFeature } from "./guild.js";

/*
    TODO: Application Commands instead of these
    TODO: fix admin-only commands

    Discord complains when we register too many commands are generated in a day
    And we don't need to generate existing commands
    Only need to regenerate a command if it is:
        a) New; or
        b) something about it changed (command name, args, etc -- NOT code content)
    To regenerate, add the command name (with no slash) to the array below.

    Similarly, to delete old commands, use the variables below
*/
const unregisterAllOnStartUp = false; //put back to false
const registerAllOnStartUp = false; //put back to false
const commandsToRegenerate = []; //put back to []
const commandsToUnregister = []; //put back to []
const applicationCommandsToRegenerate = []; //put back to []
const applicationCommandsToUnregister = []; //put back to []

const adminOnlyCommands = ["award", "todo", "Mark TODO", "role_select_message"];

export const allCommandData = {}

export async function registerCommand(guild, commandData)
{
    if (adminOnlyCommands.findIndex(e => e == commandData.name) == -1)
        allCommandData[commandData.name] = commandData;

    if (registerAllOnStartUp || commandsToRegenerate.findIndex(e => e == commandData.name) >= 0)
    {
        console.log("Registering Command", commandData.name," on ", guild.name, "...");
        await guild.commands.create(commandData)
    }
}
export async function unregisterAllCommandsIfNecessary(guild)
{
    var commands = await guild.commands.fetch(); 
    await Promise.all(commands.map( async (commandData) => 
    { 
        if (unregisterAllOnStartUp || commandsToUnregister.findIndex(e => e == commandData.name) >= 0)
        {
            console.log("Unregistering Command", commandData.name," on ", guild.name, "...");
            await guild.commands.delete(commandData);
        }
    }));
}

export async function init_application_commands(client)
{
    await unregisterAllApplicationCommandsIfNecessary(client);
}

export async function registerApplicationCommand(client, commandData)
{
    allCommandData[commandData.name] = commandData;
    if (registerAllOnStartUp || applicationCommandsToRegenerate.findIndex(e => e == commandData.name) >= 0)
    {
        console.log("Registering Application Command", commandData.name,"...");
        await client.application.commands.create(commandData)
    }
}
export async function unregisterAllApplicationCommandsIfNecessary(client)
{
    var commands = await client.application.commands.fetch(); 
    await Promise.all(commands.map( async (commandData) => 
    { 
        if (unregisterAllOnStartUp || applicationCommandsToUnregister.findIndex(e => e == commandData.name) >= 0)
        {
            console.log("Unregistering Application Command", commandData.name,"...");
            await client.application.commands.delete(commandData);
        }
    }));
}

export async function commandEnabledForGuild(commandName, guild)
{
    if (commandName == "flex") return await hasFeature(guild, "achievements");
    if (commandName == "leaderboard") return await hasFeature(guild, "achievements");
    if (commandName == "stats") return await hasFeature(guild, "analytics");
    if (commandName == "statsme") return await hasFeature(guild, "analytics");
    if (commandName == "statsweek") return await hasFeature(guild, "analytics");
    if (commandName == "nextsession") return await hasFeature(guild, "sessions");
    return true;
}

//we store every interaction by its id, and store its options, since in future we only get partial data
export function init_interaction_cache(client)
{
    client.on('interactionCreate', async function(interaction) 
    {
        // If the interaction isn't a slash command, return
        if ((!interaction.isCommand() && !interaction.isContextMenu()) || interaction.guild == undefined) return;
    
        await cacheInteraction(interaction);
    });
}
async function cacheInteraction(interaction)
{
    var options = interaction.options.data;
    options.forEach(o => {
        if (o.message)
            o.message = o.message.id;
    });
    var data = {
        id: interaction.id,
        commandName: interaction.commandName,
        options: options //this is SUPER limited...
    };
    console.log(data);

    var guildDocument = await getGuildDocument(interaction.guild.id);
    await guildDocument.collection("interactions").doc(interaction.id).set(data);
}
export async function getCachedInteraction(guild, interactionID)
{
    var guildDocument = await getGuildDocument(guild.id);
    var interactionSnapshot = await guildDocument.collection("interactions").doc(interactionID).get();
    var interaction = interactionSnapshot.data();

    //add helpers for the options getters
    if (interaction.options)
    {
        interaction.options.getString = function(key)  { var r = interaction.options.find(e => e.type ==  "STRING"  && e.name == key); return r ? r.value : null; }
        interaction.options.getBoolean = function(key) { var r =  interaction.options.find(e => e.type == "BOOLEAN" && e.name == key); return r ? r.value : null; }
        interaction.options.getInteger = function(key) { var r =  interaction.options.find(e => e.type == "INTEGER" && e.name == key); return r ? r.value : null; }
        //TODO: others
        interaction.options.getMessage = function() {
            var r =  interaction.options.find(e => e.type == "_MESSAGE" ); return r ? r.message : null; 
        }
    }

    return interaction;
}

export async function assertOption(interaction, optionName, type, message)
{
    if (!interaction["get"+type](optionName))
    {
        var msg = message ?? `${type} option \`${optionName}\` missing!`;
        interaction.reply(msg, {ephemeral:true});
        return true;
    }
    return false;
}