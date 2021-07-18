import * as config from './config.js';
import { send } from "./client.js";

export function initErrorHandler(client) {

    process.on('uncaughtException', async function(err) {
        console.error('!!! Caught exception: ', err);
        var str = JSON.stringify(err, Object.getOwnPropertyNames(err)).substr(0,1700);
        if (str.toLocaleLowerCase().indexOf("quota") > 0)
            return; 

        try 
        {
            var errorChannel = await client.channels.fetch(config.ERROR_LOG_CHANNEL_ID);
            if(errorChannel)
            {
                await send(errorChannel, "<@"+config.LINDSAY_ID+">```"+str+"```");
            }
        } catch (e) { console.error(e)}
        process.nextTick(function() { process.exit(1) })
    });
    process.on('unhandledRejection', async function(err) {
        console.error('!!! Unhandled rejection: ',err); 
        var str = JSON.stringify(err, Object.getOwnPropertyNames(err)).substr(0,1700);
        if (str.toLocaleLowerCase().indexOf("quota") > 0)
            return; 
    
        try 
        {
            var errorChannel = await client.channels.fetch(config.ERROR_LOG_CHANNEL_ID);
            if(errorChannel)
            {
                await send(errorChannel, "<@"+config.LINDSAY_ID+">```"+str+"```");
            }
        } catch (e) { console.error(e)}
    
    });
}