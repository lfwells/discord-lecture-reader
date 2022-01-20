/*
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
    if (registerAllOnStartUp || commandsToRegenerate.findIndex(e => e == commandData.name))
    {
        await guild.commands.create(commandData)
    }
}
export async function unregisterAllCommandsIfNecessary(guild)
{
    var commands = await guild.commands.fetch(); 
    await Promise.all(commands.map( async (commandData) => 
    { 
        if (unregisterAllOnStartUp || commandsToUnregister.findIndex(e => e == commandData.name))
        {
            await guild.commands.delete(commandData);
        }
    }));
}