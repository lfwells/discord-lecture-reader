import * as config from './config.js';
import client from './client.js';
import { send } from "./client.js";

process.on('uncaughtException', async function(err) {
    console.log('Caught exception: ', err); 
    try 
    {
        var errorChannel = await client.channels.fetch(config.ERROR_LOG_CHANNEL_ID);
        if(errorChannel)
        {
            await send(errorChannel, "<@"+config.LINDSAY_ID+">```"+JSON.stringify(err, Object.getOwnPropertyNames(err)).substr(0,1700)+"```");
        }
    } catch {}
    process.nextTick(function() { process.exit(1) })
  });
  process.on('unhandledRejection', async function(err) {
    console.log('Unhandled rejection: ',err);
  
    try 
    {
        var errorChannel = await client.channels.fetch(config.ERROR_LOG_CHANNEL_ID);
        if(errorChannel)
        {
            await send(errorChannel, "<@"+config.LINDSAY_ID+">```"+JSON.stringify(err, Object.getOwnPropertyNames(err)).substr(0,1700)+"```");
        }
    } catch {}
  
  });
  export default [];