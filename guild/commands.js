import { getGuildDocument } from "./guild.js";

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

export async function registerCommand(guild, commandData)
{
    if (registerAllOnStartUp || commandsToRegenerate.findIndex(e => e == commandData.name) >= 0)
    {
        console.log("Registering Command", commandData.name,"...");
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
            console.log("Unregistering Command", commandData.name,"...");
            await guild.commands.delete(commandData);
        }
    }));
}

//we store every interaction by its id, and store its options, since in future we only get partial data
export function init_interaction_cache(client)
{
    client.on('interactionCreate', async function(interaction) 
    {
        // If the interaction isn't a slash command, return
        if (!interaction.isCommand()) return;
    
        await cacheInteraction(interaction);
    });
}
async function cacheInteraction(interaction)
{
    var data = {
        id: interaction.id,
        commandName: interaction.commandName,
        options: interaction.options.data //this is SUPER limited...
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