import moment from "moment";
import { applicationInteractionsCollection, db } from "../core/database.js";
import { setGuildContextForInteraction } from "../core/errors.js";
import { getGuildDocument, hasFeature } from "./guild.js";
import { removeEmpty } from "../core/utils.js";

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

export const newGuilds = []; //managed by the guildCreate event, to make sure new servers get commands registered when the bot is added 

const adminOnlyCommands = ["award", "todo", "Mark TODO", "role_select_message", "Flag Message", "Un-flag Message", "flagged", "checklist", "forum_channel",
                                "mute_all", "unmute_all",

                                "mylo" //TODOMYLO: remove when its ready for people
];

export const allCommandData = {}
export const adminCommandData = {}

export async function registerCommand(guild, commandData)
{
    if (adminOnlyCommands.findIndex(e => e == commandData.name) == -1)
        allCommandData[commandData.name] = commandData;
    else
        adminCommandData[commandData.name] = commandData;

    if ( registerAllOnStartUp || commandsToRegenerate.findIndex(e => e == commandData.name) >= 0 || newGuilds.findIndex(g => g.id == guild.id) >= 0)
    {
        console.log("Registering Command", commandData.name," on ", guild.name, "...");
        await guild.commands.create(commandData)
    }
    else
    {
        registerCommandIfNotAlreadyRegistered(guild, commandData); // NOTE: not await
    }
}
async function registerCommandIfNotAlreadyRegistered(guild, commandData)
{
    //check if the command is registerd
    var commands = await guild.commands.fetch();
    var command = commands.find(e => e.name == commandData.name);
    if (!command)
    {
        console.log("Registering Command", commandData.name," because not previously found on ", guild.name, " ...");
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
        setGuildContextForInteraction(interaction);
        
        // If the interaction isn't a slash command, return
        if ((!interaction.isCommand() && !interaction.isContextMenu())) return;
    
        await cacheInteraction(interaction);
    });

    client.on('messageDelete', async function(message)
    {
        if (message.interaction)
        {
            var id = message.interaction.id;
            console.log("deleted interaction", message.interaction.id);
            await storeCachedInteractionData(message.guild, id, {deleted:true});
        }
    });
}
async function cacheInteraction(interaction)
{
    var options = interaction.options.data;
    options.forEach(o => {
        if (o.message)
            o.message = o.message.id;
            console.log(o);
        if (o.user)
            o.user = o.user.id;
        if (o.member)
            o.member = o.member.id;
    });
    var data = {
        id: interaction.id,
        commandName: interaction.commandName,
        subCommand: interaction.options?.getSubcommand(false) ?? null,
        memberID: interaction.member?.id ?? interaction.user?.id ?? null,
        channelID: interaction.channel?.id ?? null,
        token:interaction.token,
        timestamp: moment().utc(),
        options: options //this is SUPER limited...
    };

    await storeCachedInteractionData(interaction.guild, interaction.id, data);
    //var guildDocument = await getGuildDocument(interaction.guild.id);
    //await guildDocument.collection("interactions").doc(interaction.id).update(data, {merge:true});
}
async function getCachedInteractionDocument(guild, interactionID)
{
    if (guild != null)
    {
        var guildDocument = await getGuildDocument(guild.id);
        return await guildDocument.collection("interactions").doc(interactionID);
    }
    else
    {
        return await applicationInteractionsCollection.doc(interactionID);
    }
}
export async function getCachedInteraction(guild, interactionID)
{
    //console.log(guild.id, interactionID);
    var interactionDocument = await getCachedInteractionDocument(guild, interactionID);
    var interactionSnapshot = await interactionDocument.get();
    var interaction = interactionSnapshot.data();
    if (!interaction) return null;
    //add helpers for the options getters
    if (interaction.options)
    {
        interaction.options.find = function(predicate) {
            //console.log("finding", predicate, Object.values(interaction.options));
            return Object.values(interaction.options).find(predicate);
        };
        interaction.options.getString = function(key)  { var r = interaction.options.find((e) => { /*console.log({e, typeCheck:e.type=="STRING", nameCheck: e.name == key, key});*/ return e.type ==  "STRING"  && e.name == key;}); console.log({r, key});return r ? r.value : null; }
        interaction.options.getBoolean = function(key) { var r =  interaction.options.find(e => e.type == "BOOLEAN" && e.name == key); return r ? r.value : null; }
        interaction.options.getInteger = function(key) { var r =  interaction.options.find(e => e.type == "INTEGER" && e.name == key); return r ? r.value : null; }
        interaction.options.getUser = function(key) { var r =  interaction.options.find(e => e.type == "USER" && e.name == key); return r ? r.user : null; }
        interaction.options.getMember = function(key) { var r =  interaction.options.find(e => e.type == "USER" && e.name == key); return r ? r.member : null; }
        //TODO: others
        interaction.options.getMessage = function() {
            var r =  interaction.options.find(e => e.type == "_MESSAGE" ); return r ? r.message : null; 
        }
    }

    interaction.guild = guild;
    return interaction;
}

export async function storeCachedInteractionData(guild, interactionID, data)
{
    var interactionDocument = await getCachedInteractionDocument(guild, interactionID);
    //remove all undefined items from data
    data = removeEmpty(data);
    await interactionDocument.set(data, {merge: true, ignoreUndefinedProperties:true});
    
    return await getCachedInteraction(guild, interactionID);
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

export function loadCommands(req,res,next)
{
    req.commands = {...allCommandData, ...adminCommandData};
    res.locals.commands = req.commands;
    next();
}