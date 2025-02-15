import * as config from './config.js';
import { send } from "./client.js";
import { getGuildProperty } from '../guild/guild.js';


//hopefully this will work, for error tracking each guilde
var GUILD_CONTEXT_FOR_ERROR_LOG;
export function setGuildContextForRoute(req)
{
    GUILD_CONTEXT_FOR_ERROR_LOG = req.guild;
}
export function setGuildContextForInteraction(interaction)
{
    GUILD_CONTEXT_FOR_ERROR_LOG = interaction.guild;
}

export function initErrorHandler(client) {

    process.on('uncaughtException', async function(err) {
        try 
        {
            //console.error('!!! Caught exception: ', err);
            var str = JSON.stringify(err, Object.getOwnPropertyNames(err)).substr(0,1700);
            if (str.toLocaleLowerCase().indexOf("quota") > 0)
                return; 
                
            str = str.replaceAll("\\n", "\n");

            if (str.indexOf("WebSocket was closed") > 0) return;

            console.log(`CHANNELS FETCH ${config.ERROR_LOG_CHANNEL_ID} errors`);
            var errorChannel = await client.channels.fetch(config.ERROR_LOG_CHANNEL_ID);
            if(errorChannel)
            {
                await send(errorChannel, "<@"+config.LINDSAY_ID+"> Exception on server "+(await getGuildNameFromError(err))+"```"+str+"```", true);
            }
        } catch (e) { console.error(e)}
        process.nextTick(function() { process.exit(1) })
    });
    process.on('unhandledRejection', async function(err) {
        
        try {
        //console.error('!!! Unhandled rejection: ',err); 
        var str = JSON.stringify(err, Object.getOwnPropertyNames(err)).substr(0,1700);
        if (str.toLocaleLowerCase().indexOf("quota") > 0)
            return; 
    
        str = str.replaceAll("\\n", "\n");

            console.log(`CHANNELS FETCH ${config.ERROR_LOG_CHANNEL_ID} errors`);
            var errorChannel = await client.channels.fetch(config.ERROR_LOG_CHANNEL_ID);
            if(errorChannel)
            {
                await send(errorChannel, "<@"+config.LINDSAY_ID+"> Rejection on server "+(await getGuildNameFromError(err))+"```"+str+"```", true);//TODO: indicate server that caused the problem
            }
        } catch (e) { console.error('!!! Unhandled rejection: ',err); console.error(e)}
    
    });
}

async function getGuildNameFromError(error)
{
    if (GUILD_CONTEXT_FOR_ERROR_LOG)
    {
        return GUILD_CONTEXT_FOR_ERROR_LOG.name;
    }
    try
    {
        var path = error.path;
        if (path)
        {
            if (path.indexOf("/guilds/") > 0)
            {
                path = path.replace("/guilds/", "");
                path = path.substr(0, path.indexOf("/"));
                return await getGuildProperty("name", path, null, false);
            }
        }
    }
    catch (e) {}
    return null;
}