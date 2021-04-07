import { isOutsideTestServer } from "../core/utils.js"

//attendance (TODO: if you start the bot after people are already in there its not smort enough to track they are there (But could do), and I realise a better data structure would be <name,room,started,left>, but I don't have a database or anything like that)
export default function (client)
{
    client.on('voiceStateUpdate', async (oldMember, newMember) => 
    {

    const newUserChannel = newMember.channelID;
    const oldUserChannel = oldMember.channelID;
    var guild;

    var d = new Date();
    
    if (newUserChannel == undefined)
    {
        var member = oldMember.guild.members.cache.get(oldMember.id);
        var channel = await client.channels.cache.get(oldUserChannel);
        guild = channel.guild;
        if(isOutsideTestServer(guild)) return;

        var attendanceCollection = guild ? guildsCollection.doc(guild.id).collection("attendance") : null;
        var attendanceQuery = await attendanceCollection
        .where("memberIDchannelID", "==", member.id+""+channel.id)
        .get();
        
        if (attendanceQuery.docs.length > 0)
        {
        var attendanceRow = attendanceQuery.docs.slice(-1)[0];//last item in array (should be latests)
        var attendanceRowReference = attendanceCollection.doc(attendanceRow.id);
        await attendanceRowReference.update("left", d.getTime());

        console.log(`${member.displayName} (${oldMember.id}) has left the channel ${channel.name}`);
        }
        else
        {
        console.error("strang state to be in, no previous row with left = false")
        }    
    }
    else //its possible they are unmuting, or sharing video
    {
        var member = newMember.guild.members.cache.get(newMember.id);
        var channel = await client.channels.cache.get(newUserChannel);
        guild = channel.guild;
        if(isOutsideTestServer(guild)) return;

        //detect channel switch
        if (oldMember.channelID && oldMember.channelID != newMember.channelID)
        {
        console.log("detect channel change!");
        var attendanceCollection = guild ? guildsCollection.doc(guild.id).collection("attendance") : null;
        var attendanceQuery = await attendanceCollection
            .where("memberIDchannelID", "==", member.id+""+oldMember.channelID)
            .get();
        
        if (attendanceQuery.docs.length > 0)
        {
            var attendanceRow = attendanceQuery.docs.slice(-1)[0];//last item in array (should be latests)
            var attendanceRowReference = attendanceCollection.doc(attendanceRow.id);
            await attendanceRowReference.update("left", d.getTime());
            
            console.log(`${member.displayName} (${oldMember.id}) has left the channel (for swap channel)`);
        }
        else
        {
            console.error("strang state to be in, no previous row with left = false")
        }  
        }


        //log new data
        var attendanceCollection = guild ? guildsCollection.doc(guild.id).collection("attendance") : null;
        var attendanceQuery = await attendanceCollection
        .where("memberIDchannelID", "==", member.id+""+channel.id)
        .get();
        
        var mostRecentRowWasPreviousSession = true;
        if (attendanceQuery.docs.length > 0)
        {
        var attendanceRow = attendanceQuery.docs.slice(-1)[0];//last item in array (should be latests)
        var attendanceRowReference = attendanceCollection.doc(attendanceRow.id);
        mostRecentRowWasPreviousSession = await attendanceRow.get("left") != false;
        }

        var noChange = 
        newMember.selfDeaf == oldMember.selfDeaf &&
        newMember.selfMute != oldMember.selfMute &&
        newMember.selfVideo != oldMember.selfVideo &&
        newMember.streaming != oldMember.streaming &&
        newMember.serverMute != oldMember.serverMute &&
        newMember.serverDeaf != oldMember.serverDeaf;

        if (noChange || mostRecentRowWasPreviousSession)
        {
        noChange = true;
        console.log(`${member.displayName} (${newMember.id}) has joined the channel ${channel.name}`)
        var toLog = {};
        toLog.joined = d.getTime();//toLocaleString(); 
        toLog.memberID = member.id;
        toLog.memberIDchannelID = member.id+""+channel.id;
        toLog.name = member.displayName;
        toLog.channel = channel.name;
        toLog.channelID = channel.id;
        toLog.left = false; 
        toLog.deafens = 0;
        toLog.unmutes = 0;
        toLog.screenShares = 0;
        toLog.videoShares = 0;

        var id = d.getTime()+"_"+member.displayName;
        var attendanceRowReference = attendanceCollection.doc(id);
        attendanceRowReference.set(toLog);
        attendanceRow = await attendanceRowReference.get();
        }

        if (newMember.selfDeaf != oldMember.selfDeaf)
        {
        console.log(`${member.displayName} (${newMember.id}) in channel ${channel.name} ${newMember.selfDeaf ? "deafened" : "undeafened"}`);
        
        if (newMember.selfDeaf)
        {
            var deafens = Number.parseInt(await attendanceRow.get("deafens") ?? 0)+1;
            console.log("deafens",deafens);
            await attendanceRowReference.update("deafens", deafens);
        }
        }
        if (newMember.selfMute != oldMember.selfMute || (noChange && newMember.selfMute == false)) //second case is when they join server unmuted 
        {
        console.log(`${member.displayName} (${newMember.id}) in channel ${channel.name} ${newMember.selfMute ? "muted" : "umuted"}`);

        if (newMember.selfMute == false)
        {
            var unmutes = Number.parseInt(await attendanceRow.get("unmutes") ?? 0)+1;
            console.log("unmutes",unmutes);
            await attendanceRowReference.update("unmutes", unmutes);
        }
        }
        if (newMember.selfVideo != oldMember.selfVideo)
        {
        console.log(`${member.displayName} (${newMember.id}) in channel ${channel.name} ${newMember.selfVideo ? "started video" : "finished video"}`);

        if (newMember.selfVideo)
        {
            var videoShares = Number.parseInt(await attendanceRow.get("videoShares") ?? 0)+1;
            console.log("videoShares",videoShares);
            await attendanceRowReference.update("videoShares", videoShares);
        }
        }
        if (newMember.streaming != oldMember.streaming)
        {
        console.log(`${member.displayName} (${newMember.id}) in channel ${channel.name} ${newMember.streaming ? "started screen share" : "finished screenshare"}`);

        if (newMember.streaming)
        {
            var screenShares = Number.parseInt(await attendanceRow.get("screenShares") ?? 0)+1;
            console.log("screenShares",screenShares);
            await attendanceRowReference.update("screenShares", screenShares);
        }
        }
        if (newMember.serverMute != oldMember.serverMute)
        {
        console.log(`${member.displayName} (${newMember.id}) in channel ${channel.name} ${newMember.serverMute ? "muted by server" : "umuted by server"}`);
        }
        if (newMember.serverDeaf != oldMember.serverDeaf)
        {
        console.log(`${member.displayName} (${newMember.id}) in channel ${channel.name} ${newMember.serverDeaf ? "deafened by server" : "undeafened by server"}`);
        }
    } 
    });
}