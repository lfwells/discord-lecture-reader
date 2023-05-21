import moment from "moment";
import { getGuildDocument, getGuildProperty, getGuildPropertyConverted, GUILD_CACHE } from "../guild/guild.js";
import * as Config from "../core/config.js";
import { didAttendSession, postWasForSession } from "../attendance/sessions.js";
import { getSessionsOld } from "../attendance/old_sessions.js";
import { db, guildsCollection } from "../core/database.js";
import fakeData from "./fakeData.js";
import { asyncFilter, asyncForEach } from "../core/utils.js";
import { getClassList } from "../classList/classList.js";

export var ANALYTICS_CACHE = {}; //because querying the db for all messages on demand is bad (cannot cache on node js firebase it seems)s

export async function createFirebaseRecordFrom(msg)
{
    var record = {};
    record.dump = JSON.stringify(msg);
    record.author = msg.author.id;
    if (msg.member)
    {
        record.member = msg.member.id;
    }
    record.channel = msg.channel.id;
    record.content = msg.content;
    //console.log(record);

    //caching these here, rather than in each analyticsParseMessage()
    GUILD_CACHE[msg.guild.id]["offTopicCategory"] = await getGuildPropertyConverted("offTopicCategoryID", msg.guild);
    await getGuildProperty("offTopicChannelID", msg.guild);
    
    await analyticsParseMessage(record, msg.guild);

    if (ANALYTICS_CACHE[msg.guild.id])
    {
        ANALYTICS_CACHE[msg.guild.id].push(record);
    }

    return record;
}

export async function getStatsWeek(guild, userPredicate, postPredicate)
{
    return getStats(guild, 
        d => d.timestamp.isSame(new Date(), 'week') && (userPredicate == null || userPredicate(d)), 
        d => d.timestamp.isSame(new Date(), 'week') && (postPredicate == null || postPredicate(d)));
}
function postsCollection(guild)
{
    var collection = "analytics";
    if (
        guild.id == "801006169496748063" || //kit305 2021
        guild.id == "801757073083203634" //kit109 2021 sem 1
    )
    {
        collection = "analytics_history";
    }
    return collection;
}


export async function getPostsCount(guild, forUserID, forChannelID)
{
    let guildDocument = await getGuildDocument(guild.id);
    let collection = guildDocument.collection(postsCollection(guild));
    if (forUserID)
    {
        collection = collection.where("author", "==", forUserID);
    }
    if (forChannelID)
    {
        collection = collection.where("channel", "==", forChannelID);
    }
    let count = await collection.count().get();
    return count.data().count;
}
export async function getPostsData(guild, userPredicate, postPredicate)
{

    if (Config.USE_CACHED_FAKE_KIT109_DATA && guild.id == Config.KIT109_S2_2021_SERVER)
    {
        ANALYTICS_CACHE[guild.id] = fakeData();
    }


    if (ANALYTICS_CACHE[guild.id])
    {
        var filtered = ANALYTICS_CACHE[guild.id];
        console.log(filtered.length);
        if (userPredicate)
        {
            filtered = await asyncFilter(filtered, userPredicate);
            console.log("userPredicate", filtered.length);
        }
        if (postPredicate)
        {
            filtered = await asyncFilter(filtered, postPredicate);
            console.log("postPredicate", filtered.length);
        }
        return filtered;
    }

    console.trace(`getPostsData called with no cache for ${guild.id}, this little manauevr will cost us 10 years`);
    var collection = postsCollection(guild);


    var guildDocument = await getGuildDocument(guild.id);

    //caching these here, rather than in each analyticsParseMessage()
    GUILD_CACHE[guild.id]["offTopicCategory"] = await getGuildPropertyConverted("offTopicCategoryID", guild);
    await getGuildProperty("offTopicChannelID", guild);

    var data = await guildDocument.collection(collection).get();
    var tempCollection = [];
    data.forEach(collection => {
        tempCollection.push(collection);
    });


    var rawStatsData = [];
    //data.forEach(doc =>
    var i = 0;
    for (let doc of tempCollection)
    {
        var d = doc.data();
        d.id = doc.id;
        await analyticsParseMessage(d, guild);

        rawStatsData.push(d);
    }
    //}));
    ANALYTICS_CACHE[guild.id] = rawStatsData;

    return await getPostsData(guild, userPredicate, postPredicate); //this looks like infinite recursion, but isn't, this call will use the cache, and apply predicate
    //return rawStatsData;
}
async function analyticsParseMessage(d, guild)
{
    var offTopicCategory = GUILD_CACHE[guild.id]["offTopicCategory"];
    var offTopicChannelID = GUILD_CACHE[guild.id]["offTopicChannelID"];

    d.postData = JSON.parse(d.dump);
    d.timestamp = moment(d.postData.createdTimestamp);

    //pull out some meta
    d.isReply = d.postData.type == "REPLY";
    d.isCommand = false;//HARD, this doesnt' work coz robo lindz does the post: //d.postData.type == "APPLICATION_COMMAND" || d.postData.type == "CONTEXT_MENU_COMMAND";
    d.isThreadStart = d.postData.type == "THREAD_STARTER_MESSAGE";
    
    d.isLink = d.postData.attachments.some(e => e.url != null) || (d.postData.cleanContent && d.postData.cleanContent.indexOf("http") >= 0);
    d.isImage = d.postData.attachments != null && d.postData.attachments.length > 0;

    d.isOffTopic = false;
    if (offTopicCategory) 
    {
        d.isOffTopic = offTopicCategory.children.some(c => c.channelId == d.postData.channelId);
    }
    if (offTopicChannelID) 
    {
        d.isOffTopic |= offTopicChannelID == d.postData.channelId;
    }
}
export function getStatsCounts(userPredicate, postPredicate)
{
    return async function (req,res,next)
    {
        var guild = req.guild;

        var stats = {
            channels: [],
            members: []
        };

        stats.total = await getPostsCount(guild, null, null);

        var classList = await getClassList(guild);
        await Promise.all(classList.map(async function(student) 
        {
            var data = {
                memberID:student.discordID,
                name: student.discordName,
                posts: await getPostsCount(guild, student.discordID)
            };
            stats.members.push(data);
            //console.log({data});
        }));

        var channels = guild.channels.cache;
        await Promise.all(channels.map(async function(channel)
        {
            //TODO: get this right
            //if (channel.type != "text") return;
            var data = {
                channelID:channel.id,
                channel,
                name: channel.name,
                posts: await getPostsCount(guild, null, channel.id)
            };
            stats.channels.push(data);
            //console.log({data});
        }));

        //go through all channels, and merge them with their parent
        stats.channels.forEach(channel =>
        {   

            //TODO GEORGE THIS DIDNT WORK



            if (channel.channel.parent && (channel.channel.parent.type == "GUILD_FORUM" || channel.channel.parent.type == "GUILD_TEXT"))
            {
                var parent = stats.channels.find(c => c.channelID == channel.channel.parent.id);
                if (parent)
                {
                    parent.posts += channel.posts;
                }
                //mark the channel for deletion
                channel.delete = true;
            }
            else if (channel.channel.parent && channel.channel.parent.type != "GUILD_CATEGORY")
            {
                console.log(channel.channel.name);
            }
        });

        //delete all channcels marked for deletion
        stats.channels = stats.channels.filter(c => c.delete == undefined);

        //sort by post count
        stats.members.sort((a,b) => b.posts - a.posts);
        stats.channels.sort((a,b) => b.posts - a.posts);

        //console.log({stats});
        res.locals.statsData = stats;
        next();
    };
}
export async function getStats(guild, userPredicate, postPredicate)
{
    var rawStatsData = await getPostsData(guild, userPredicate, postPredicate);

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

            //determine if the channel is a thread, and if so record the count towards the parent
            var isThread = false;
            if (channelObj.parent)
            {
                isThread = channelObj.parent.type == "GUILD_TEXT";
            }
            if (isThead)
            {
                channel = channelObj.parent;
                channelID = channel.id;
            }

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

            if (memberObj)
            {
                stats.members[memberID] = { 
                    name: memberObj.displayName,
                    posts:[]
                };
            }
        }
        if (stats.members[memberID])
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

    statsData.membersByID = stats.members;

    statsData.total = rawStatsData.length;

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


//TODO: this doesn't seem to save all of them or something?
//e.g. kit109 sem 1 2021, says it read through 17828 posts, but only operated on 9953 posts -- did it have to skip some or something?
export async function loadHistoricalData(res, guild)
{
    var analyticsCollection = guildsCollection.doc(guild.id).collection("analytics_history");

    var data = [];
    await Promise.all(
        guild.channels.cache.map(async (c) =>  {
            data.push(...(await lots_of_messages_getter(res, c, analyticsCollection)));
        })
    );
    return data;
}
export async function loadAllMessagesForChannel(channel, res)
{
    return await lots_of_messages_getter(res, channel);
}

//https://stackoverflow.com/questions/55153125/fetch-more-than-100-messages
async function lots_of_messages_getter(res, channel, writeToDBCollection, limit) {
    const sum_messages = [];
    let last_id;

    var batch;
    if (writeToDBCollection)
    {
        // Get a new write batch
        batch = db.batch();
    }

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
                if (writeToDBCollection)
                {
                    for (var message of messages)
                    {
                        var msg = message[1];
                        batch.set(writeToDBCollection.doc(), await createFirebaseRecordFrom(msg));
                    }
                    await batch.commit();
                    batch = db.batch();
                }
                console.log(channel.name, "sum_messages", sum_messages.length);
                if (res) res.write(`<p>Loaded ${sum_messages.length} messages from ${channel.name}...</p>`);
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

export async function loadTimeSeries(rawStatsData, weekly)
{
    var days = [];
    var startDomain = null;
    var endDomain = null;
    for (var r in rawStatsData)
    {
        var row = rawStatsData[r];
        var timestamp = moment(row.timestamp).startOf(weekly ? 'week' : 'day'); 
        var idx = days.findIndex(d => timestamp.isSame(d.date));
        if (idx == -1)
        {
            idx = days.push({ date: timestamp, value: 0 }) - 1;
        }
        days[idx].value++;

        if (startDomain == null || timestamp.isBefore(startDomain))
        {
            startDomain = timestamp;
        }
        if (endDomain == null || timestamp.isAfter(endDomain))
        {
            endDomain = timestamp;
        }
    }

    //fill in holes in graph with zeros
    for (var m = moment(startDomain); m.isBefore(endDomain); m.add(1, 'days')) 
    {
        var m2 = moment(m);
        if (weekly)
            m2 = moment(m).startOf('week'); 
        var idx = days.findIndex(d => m2.isSame(d.date));
        if (idx == -1)
        {
            //console.log("added missing day "+m.format());
            days.push({ date: moment(m2), value: 0 }); 
        }
        idx = days.findIndex(d => m2.isSame(d.date));
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
    for (var d = 0; d < days.length; d++)
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

async function getSessionsOldFlatArray(guild)
{
    var sessions = (await getSessionsOld(guild)).flatMap(s => {
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
export async function loadPostsPerSession(rawStatsData, guild, includeNoSession, predicate)
{
    var sessions = await getSessionsOldFlatArray(guild);
    var outOfSessionPosts = [];
    var inOfSessionPosts = [];

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
                    if (session.channelID.indexOf(channelID) >= 0 && postWasForSession(row, session))//timestamp.isBetween(session.startTimestamp, session.endTimestamp))
                    {
                        session.messages.push(row);
                        postWasForSession = true;  
                    }
                }
                if (includeNoSession)
                {
                    if (postWasForSession == false)
                    {
                        outOfSessionPosts.push(row);
                    }
                    else
                    {
                        inOfSessionPosts.push(row);
                    }
                }
            }
            catch (DiscordAPIError) {}
        }
    }

    if (includeNoSession)
    {
        sessions = [];
        sessions.push({
            name: "No Session",
            x: "No Session",
            messages: outOfSessionPosts,
            value: outOfSessionPosts.length
        });
        sessions.push({
            name: "In Session",
            x: "In Session",
            messages: inOfSessionPosts,
            value: inOfSessionPosts.length
        });
    }
    else
    {
        sessions.forEach(
            s => { 
                s.value = s.messages.length;
            }
        );
    }

    return sessions;
}

export async function loadAttendanceSession(attendanceData, guild, includeNoSession, predicate)
{
    var sessions = await getSessionsOldFlatArray(guild);
    var outOfSessionAttendance = [];
    var inOfSessionAttendance = [];
    for (var r in attendanceData)
    {
        var row = attendanceData[r];
        row.author = row.memberID;
        
        if (predicate == undefined || await predicate(row))
        {
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

            if (includeNoSession)
            {
                if (attendanceWasForSession == false)
                {
                    outOfSessionAttendance.push(row);
                }
                else
                {
                    inOfSessionAttendance.push(row);
                }
            }
        }
        
    }
    

    if (includeNoSession)
    {
        sessions = [];
        sessions.push({
            name: "In Session",
            x: "In Session",
            attendance: inOfSessionAttendance,
            value: inOfSessionAttendance.length
        });
        sessions.push({
            name: "No Session",
            x: "No Session",
            attendance: outOfSessionAttendance,
            value: outOfSessionAttendance.length
        });
    }
    else
    {
        
        sessions.forEach(
            s => { 
                s.value = s.attendance.length;
            }
        );
    }

    return sessions;
}


export async function getStudentStreak(guild, memberID)
{
    var activeDays = await getStudentTotalActiveDays(guild, memberID);

    var bestStreak = 0;
    var currentStreak = 1;
    var totalActiveDays = 0;
    var prevItem = -1;
    var ordered = [...activeDays].sort();
    for (let index = 0; index < ordered.length; index++) {
        const element = ordered[index];
        if (element - prevItem == 86400000) //milliseconds in one day
        {
            currentStreak++;
            bestStreak = Math.max(bestStreak, currentStreak);
        }
        else 
        {
            currentStreak = 1;
        }
        prevItem = element;
        totalActiveDays++;
    }
    return {
        bestStreak,
        currentStreak,
        totalActiveDays,
    };
        
}
export async function getTopBestStreak(guild)
{
    var streaks = await getAllStreaks(guild);
    streaks = streaks.sort((a,b) => b.bestStreak - a.bestStreak);
    return streaks;
}
export async function getTopCurrentStreak(guild)
{
    var streaks = await getAllStreaks(guild);
    streaks = streaks.sort((a,b) => b.currentStreak - a.currentStreak);
    return streaks;
}
export async function getTopActiveDays(guild)
{
    var streaks = await getAllStreaks(guild);
    streaks = streaks.sort((a,b) => b.totalActiveDays - a.totalActiveDays);
    return streaks;
}
async function getAllStreaks(guild)
{
    var classList = await getClassList(guild, false);
    await asyncForEach(classList, async function(student) {
        student.streak = await getStudentStreak(guild, student.discordID);
        student.streak.name = student.discordName;
    });
    return classList.map(e => e.streak);
}
export async function getStudentTotalActiveDays(guild, memberID)
{
    var statsData = await getStats(guild);
    var studentData = statsData.membersByID[memberID];
    return studentData == null ? new Set() : new Set(studentData.posts.map(p => moment(p.timestamp).startOf('day').valueOf()));
}