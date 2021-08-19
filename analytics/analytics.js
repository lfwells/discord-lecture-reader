import moment from "moment";
import { getGuildDocument } from "../guild/guild.js";
import * as Config from "../core/config.js";

export async function getStatsWeek(guild, predicate)
{
    return getStats(guild, d => d.timestamp.isSame(new Date(), 'week') && (predicate == null || predicate(d)));
}
export async function getStats(guild, predicate)
{
    var guildDocument = getGuildDocument(guild.id);
    var data = await guildDocument.collection("analytics").get();
    var rawStatsData = [];
    data.forEach(doc =>
    {
        var d = doc.data();
        d.id = doc.id;
        d.postData = JSON.parse(d.dump);
        d.timestamp = moment(d.postData.createdTimestamp);

        if (predicate == undefined || predicate(d))
        {
            rawStatsData.push(d);
        }
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

export function predicateExcludeAdmin(user)
{
    return [
        Config.IAN_ID,
        Config.LINDSAY_ID,
        Config.SIMPLE_POLL_BOT_ID,
        Config.ROBO_LINDSAY_ID,
        //TODO: this could use roles but w/e
    ].indexOf(user.author) == -1;
}