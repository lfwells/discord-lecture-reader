import moment from "moment";
import { getGuildDocument } from "../guild/guild.js";
import * as Config from "../core/config.js";
import { getClient } from "../core/client.js";
import { didAttendSession, getSessions } from "../attendance/sessions.js";

export async function getStatsWeek(guild, predicate)
{
    return getStats(guild, d => d.timestamp.isSame(new Date(), 'week') && (predicate == null || predicate(d)));
}
export async function getPostsData(guild, predicate)
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
    return rawStatsData;
}
export async function getStats(guild, predicate)
{
    var rawStatsData = await getPostsData(guild, predicate);

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

export async function loadHistoricalData(res, guild)
{
    var data = [];

    await Promise.all(
        guild.channels.cache.map(async (c) =>  {
            data.push(...(await lots_of_messages_getter(res, c)));
        })
    );
    return data;
}
export async function loadAllMessagesForChannel(channel)
{
    return await lots_of_messages_getter(null, channel);
}

//https://stackoverflow.com/questions/55153125/fetch-more-than-100-messages
async function lots_of_messages_getter(res, channel, limit) {
    const sum_messages = [];
    let last_id;

    while (true) {
        const options = { limit: 100 };
        if (last_id) {
            options.before = last_id;
        }

        if (channel.messages && channel.messages.fetch)
        {
            const messages = await channel.messages.fetch(options);
            if (messages && messages.size > 0)
            {
                sum_messages.push(...messages);
                console.log(channel.name, "sum_messages", sum_messages.length);
                if (res) res.write([channel.name, "sum_messages", sum_messages.length].join(", "));
                last_id = messages.last().id; 

                if (limit && sum_messages.length >= limit) { 
                    break;
                }
            }
            else
            {
                break;
            }
        }
        else
        {
            break;    
        }
    }

    return sum_messages.map(m => m[1]); //not sure 100% why we need to do this but whatevs
}

export async function loadTimeSeries(rawStatsData)
{
    var days = [];
    for (var r in rawStatsData)
    {
        var row = rawStatsData[r];
        var timestamp = moment(row.timestamp).startOf('day'); 
        var idx = days.findIndex(d => timestamp.isSame(d.date));
        if (idx == -1)
        {
            idx = days.push({ date: timestamp, value: 0 }) - 1;
        }
        days[idx].value++;
    }
    days = days.sort((a,b) => a.date - b.date);

    return days;
}
export async function loadPostsPerDay(rawStatsData)
{
    var days = [];
    for (var r in rawStatsData)
    {
        var row = rawStatsData[r];
        var dayOfWeek = moment(row.timestamp).day();
        var idx = days.findIndex(d => dayOfWeek == d.x);
        if (idx == -1)
        {
            idx = days.push({ x: dayOfWeek, value: 0 }) - 1;
        }
        days[idx].value++;

        days = days.sort((a,b) => a.x - b.x);
    }
    var daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thurdsay", "Friday", "Saturday"];
    var daysNamed = [];
    for (var d = 0; d < daysOfWeek.length; d++)
    {
        var n = { "x": daysOfWeek[d], value: days[d].value };
        daysNamed[d] = n;
    }

    return daysNamed;
}
export async function loadPostsPerHour(rawStatsData)
{
    var hours = [];
    for (var r in rawStatsData)
    {
        var row = rawStatsData[r];
        var hour = moment(row.timestamp).hour();
        var idx = hours.findIndex(d => hour == d.x);
        if (idx == -1)
        {
            idx = hours.push({ x: hour, value: 0 }) - 1;
        }
        hours[idx].value++;

        hours = hours.sort((a,b) => a.x - b.x);
    }

    return hours;
}

async function getSessionsFlatArray(guild)
{
    var sessions = (await getSessions(guild)).flatMap(s => {
        s.sessions.forEach(s2 => {
            s2.x = s.name+" "+s2.name
            s2.messages = [];
            s2.attendance = [];
            s2.value = 0;
            if (typeof(s2.channelID) !== "object")
            {
                s2.channelID = [s2.channelID]; //convert to array here, to allow multi-channel detection for stats
            }
            if (typeof(s2.voiceChannelID) !== "object")
            {
                s2.voiceChannelID = [s2.voiceChannelID]; //convert to array here, to allow multi-channel detection for stats
            }
        });
        return s.sessions;
    });
    return sessions;
}
export async function loadPostsPerSession(rawStatsData, guild, includeNoSession)
{
    var sessions = await getSessionsFlatArray(guild);
    var outOfSessionPosts = [];

    for (var r in rawStatsData)
    {
        var row = rawStatsData[r];
        var channelID = row.channel;
        if (channelID)
        {
            try
            {
                var channel = await guild.channels.fetch(channelID);
                if (channel.isThread())
                {
                    //console.log("post was thread "+channel.name, "a child of", channel.parent.name);
                    channelID = channel.parent.id;
                }
                var timestamp = moment(row.timestamp);
                
                var postWasForSession = false;
                for (var session of sessions)
                {
                    if (session.channelID.indexOf(channelID) >= 0 && timestamp.isBetween(session.startTimestamp, session.endTimestamp))
                    {
                        session.messages.push(row);
                        postWasForSession = true;  
                    }
                }
                if (postWasForSession == false)
                {
                    outOfSessionPosts.push(row);
                }
            }
            catch (DiscordAPIError) {}
        }
    }

    if (includeNoSession)
    {
        sessions.push({
            name: "No Session",
            x: "No Session",
            messages: outOfSessionPosts
        });
    }
    sessions.forEach(
        s => { 
            s.value = s.messages.length;
        }
    );

    return sessions;
}

export async function loadAttendanceSession(attendanceData, guild, includeNoSession)
{
    var sessions = await getSessionsFlatArray(guild);
    var outOfSessionAttendance = [];
    for (var r in attendanceData)
    {
        var row = attendanceData[r];
        var channelID = row.channelID;
        //filter by only current students role
        
        var attendanceWasForSession = false;
        for (var session of sessions)
        {
            if (session.voiceChannelID.indexOf(channelID) >= 0 && didAttendSession(row, session))
            {
                    
                //unique attendance only! ignore duplicate joins from same member id
                if (session.attendance.findIndex(a => a.memberID == row.memberID) == -1)
                {
                    session.attendance.push(row);
                    attendanceWasForSession = true;
                }
            }
        }
        if (attendanceWasForSession == false)
        {
            outOfSessionAttendance.push(row);
        }
    
    }
    
    sessions.forEach(
        s => { 
            s.value = s.attendance.length;
        }
    );

    if (includeNoSession)
    {
        sessions.push({
            name: "No Session",
            x: "No Session",
            attendance: outOfSessionAttendance,
            value: outOfSessionAttendance.length
        });
    }

    return sessions;
}

//TODO: consultation attendance counts?