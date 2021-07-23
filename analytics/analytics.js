import moment from "moment";
import { getGuildDocument } from "../guild/guild.js";

export async function getStats(guild)
{
    var guildDocument = getGuildDocument(guild.id);
    var data = await guildDocument.collection("analytics").get();
    var rawStatsData = [];
    data.forEach(doc =>
    {
        var d = doc.data();
        d.id = doc.id;
        d.timestamp = moment(d.timestamp);
        d.postData = JSON.parse(d.dump);
        rawStatsData.push(d);
    });

    var stats = {
        channels: [],
        members: []
    };

    for (var r in rawStatsData)
    {
        var row = rawStatsData[r];
        if (row.channel == undefined || row.author == undefined) continue;

        var channelID = row.channel;
        if (Object.keys(stats.channels).includes(channelID) == false)
        {
            var channelObj = await guild.channels.cache.get(channelID);
            if (channelObj == undefined) continue;

            stats.channels[channelID] = { 
                name: channelObj.name,
                posts:[]
            };
        }
        stats.channels[channelID].posts.push(row);

        var memberID = row.author;/*
        if (row.member == undefined)
        {
            row.member = await guild.member.get(row.author);
        }
        else
        {
            memberID = row.member.id;
        } 
        console.log((memberID));*/
        if (Object.keys(stats.members).includes(memberID) == false)
        {
            var memberObj = await guild.members.cache.get(memberID);
            if (memberObj == undefined) continue;

            stats.members[memberID] = { 
                name: memberObj.nickname ?? memberObj.user.username,
                posts:[]
            };
        }
        stats.members[memberID].posts.push(row);
    }
    //convert to array for sorting and just general betterness
    var statsData = {
        channels:[],
        members:[]
    };
    for (var channelID in stats.channels)
    {
        var rowData = stats.channels[channelID];
        statsData.channels.push({...{channelID:channelID}, ...rowData});
    }
    for (var memberID in stats.members)
    {
        var rowData = stats.members[memberID];
        statsData.members.push({...{memberID:memberID}, ...rowData});
    }

    //sort!
    statsData.channels = statsData.channels.sort((a,b) => b.posts.length - a.posts.length);
    statsData.members = statsData.members.sort((a,b) => b.posts.length - a.posts.length);

    statsData.rawStatsData = rawStatsData;

    return statsData;
}