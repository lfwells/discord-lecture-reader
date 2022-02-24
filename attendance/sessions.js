import * as config from "../core/config.js";
import moment from "moment";
import { pluralize, sleep } from "../core/utils.js";
import { send } from "../core/client.js";
import { guildsCollection, momentToTimestamp } from "../core/database.js";
import admin from "firebase-admin"; 

var earlyTime = 15;//minutes
var remindBefore = 15;//minutes //todo: override per-session?

export const SESSIONS = new Map();
const discordEvents = new Map();

export const SEMESTERS = {  //breaks are inclusive (so first day of break, and the last day of break -- NOT the first day back after break)
    //sem1_2021:{ start: moment() },
    //sem2_2021:{ start: moment() },
    sem1_2022:{ start: moment("2022-02-21"), breakStart: moment("2022-04-14"), breakEnd: moment("2022-04-20") },
    sem2_2022:{ start: moment("2022-07-11"), breakStart: moment("2022-08-29"), breakEnd: moment("2022-09-04") },
    //asp1_2022:{ start: moment().set({ 'year': 2022, 'month': 2, 'day': 21 }), breakStart: moment().set({ 'year': 2022, 'month': 4, 'day': 14 }), breakEnd: moment().set({ 'year': 2022, 'month': 4, 'day': 20 }) },
    //asp2_2022:{ start: moment().set({ 'year': 2022, 'month': 2, 'day': 21 }), breakStart: moment().set({ 'year': 2022, 'month': 4, 'day': 14 }), breakEnd: moment().set({ 'year': 2022, 'month': 4, 'day': 20 }) },
}
export async function deleteAllScheduledEvents(res, guild)
{
    var allEvents = await guild.scheduledEvents.fetch();
    res.write(`Deleting ${pluralize(allEvents.size, "Event")}...\n`);
    await Promise.all(allEvents.map( async (v) => 
    { 
        //res.write(`Deleting event ${v.name}...\n`);
        await guild.scheduledEvents.delete(v);
        res.write(`Deleted event ${v.name}.\n`);
    })
    );;
}
export async function init_sessions(guild)
{
    //for testing
    //await deleteAllScheduledEvents(guild);

    var collection = sessionsCollection(guild);
    var querySnapshot = await collection.get(); 
    var data = [];
    querySnapshot.forEach(doc =>
    {
        var session = doc.data();
        session.id = doc.id;
        data.push(session); 
        
    });
    SESSIONS[guild.id] = data;

    discordEvents[guild.id] = await guild.scheduledEvents.fetch();

    await scheduleNextSessionPost(guild);
}

export async function scheduleAllSessions(res, guild, config)
{
    var expectedCount = 0;
    for (var i = 0; i < config.types.length; i++)
    {
        expectedCount += config.types[i].weeks.length * config.types[i].sessionsPerWeek.length;
    }
    res.write(`Scheduling ${pluralize(expectedCount, "Event")}. This may take some time (Discord takes a break every 5 events)...\n`);

    if (expectedCount > 100)
    {
        res.write("\nNOTICE: You have scheduled a large number of events.\n");
        res.write("        The maximum number events you can schedule on Discord is 100.\n");
        res.write("        You will need to return to this tool again after some events\n");
        res.write("        have passed to schedule future events.\n\n");
    }

    var createdSessions = []; //use this array to work out what rows were created (/updated), and delete the rest
    for (var i = 0; i < config.types.length; i++)
    {
        var sessionsForThisType = await scheduleAllSessionsOfType(res, guild, config.types[i], SEMESTERS[config.semester]);
        createdSessions.push(...sessionsForThisType);
    }

    //now delete any previously scheduled sessions now in this list
    var createdIDs = createdSessions.map(e => e.id);
    console.log("Created Sessions", createdIDs);
    var allIDs = SESSIONS[guild.id].map(e => e.id);
    console.log("All Sessions", allIDs.length);

    var sessionIDsToDelete = allIDs.filter(v => createdIDs.indexOf(v) == -1);
    console.log("Sessions to Delete", sessionIDsToDelete.length);


    res.write(`\nDeleting ${pluralize(sessionIDsToDelete.length, "No Longer Used Event")}... \n`);

    for (var i = 0; i < sessionIDsToDelete.length; i++)
    {
        var session = SESSIONS[guild.id].find(e => e.id == sessionIDsToDelete[i]);
        console.log(session);
        if (session) await deleteScheduledSession(guild, session);

        res.write(`${i+1}...`);
    }

    res.write("\nCleaning Up...\n");
    await init_sessions(guild);
    
}
async function scheduleAllSessionsOfType(res, guild, config, semester)
{
    console.log("scheduleAllSessionsOfType", config.type);
    var createdSessions = [];
    for (var i = 0; i < config.weeks.length; i++)
    {
        var week = config.weeks[i];
        for (var j = 0; j < config.sessionsPerWeek.length; j++)
        {
            var scheduleInfo = config.sessionsPerWeek[j];
            var createdSession = await scheduleAllSessionsOfTypeWeeklyItem(
                res, guild, config, semester, week, scheduleInfo, i
            );
            if (createdSession != null)
                createdSessions.push(createdSession);
        }
    }
    return createdSessions;
}
async function scheduleAllSessionsOfTypeWeeklyItem(res, guild, config, semester, week, scheduleInfo, i)
{
    var weekStart = getSemesterWeekStart(res, semester, week, scheduleInfo.day);
    var startTime = moment(weekStart).add(scheduleInfo.hour, "hour").add(scheduleInfo.minute, "minute");
    var endTime = moment(startTime).add(config.duration == null || config.duration == 0 ? 60 : config.duration, "minute");

    var descriptionItems = [];
    if (config.description)
    {
        descriptionItems.push(config.description);
    }
    if (config.descriptions && i < config.descriptions.length)
    {
        descriptionItems.push(config.descriptions[i]);
    }
    /*if (scheduleInfo.location)
    {
        descriptionItems.push(scheduleInfo.location);
    }*/
    var description = descriptionItems.length > 0 ? descriptionItems.join("\n") :  undefined;

    var createdSession = await scheduleSession(
        guild, config.type, startTime, endTime, scheduleInfo.channelID, scheduleInfo.textChannelID, week, scheduleInfo.day, scheduleInfo.hour, scheduleInfo.minute, config.duration, description, scheduleInfo.location
    );

    res.write(`Scheduled ${config.type} (Week ${week}) -- ${startTime.utcOffset(11).format("dddd, MMMM Do YYYY, h:mm:ss a")}\n`);
    return createdSession;
}
function getSemesterWeekStart(res, semester, week, day)
{
    var start = moment(semester.start);
    start = start.add(day-1, 'day');
    for (var i = 0; i < week-1; i++)
    {
        start = start.add(1, "week");
        
        if (dayIsDuringSemesterBreak(res, semester, start))
            start = start.add(1, "week");
    }
    return start;
}
function dayIsDuringSemesterBreak(res, semester, dayMoment)
{   
    //var log = `----\nChecking\n\t${dayMoment.format("dddd, MMMM Do YYYY, h:mm:ss a")}\n\t${semester.breakStart.format("dddd, MMMM Do YYYY, h:mm:ss a")}\n\t${semester.breakEnd.format("dddd, MMMM Do YYYY, h:mm:ss a")}\n${dayMoment.isBetween(semester.breakStart, semester.breakEnd, 'day', '[]')}\n\n`;
    //console.log(log);
    //res.write(log);
    return dayMoment.isBetween(semester.breakStart, semester.breakEnd, 'day', '[]');
}

//TODO: the below will break if you specify same types
//this will return the database ID of the generated session row (for the purposes of deleting all the other ones upon a sync)
async function scheduleSession(guild, type, startTime, endTime, channelID, textChannelID, week, day, hour, minute, durationMins, description, location)
{
    var collection = sessionsCollection(guild);

    //check existing session, edit that instead (including reschedule)
    var existingSession = SESSIONS[guild.id].find(e => e.type == type && e.week == week);
    if (existingSession) console.log("found existing session", existingSession.id);

    //check if event is in the past
    if (startTime.isBefore(moment()))
    {
        if (existingSession)
        {
            console.log("session in the past, deleting");
            await deleteScheduledSession(guild, existingSession);
        }
        else
        {
            console.log("session in the past, skipping");
        }
        return null;
    }

    var name = `${type} (Week ${week})`

    var discordEvent;
    var discordEventArgs = {
        name:name,
        scheduledStartTime:startTime.utcOffset(0).toISOString(),
        scheduledEndTime:endTime != null ? endTime.utcOffset(0).toISOString() : null,
        description: description,
        reason: "GENERATED",
        privacyLevel: "GUILD_ONLY"
    }
    if (channelID)
    {
        discordEventArgs.entityType = "VOICE";
        discordEventArgs.channel = channelID;
    }
    else
    {
        discordEventArgs.entityMetadata = { location: location && location != "" ? location : "TBA" };
        discordEventArgs.entityType = "EXTERNAL";
    }

    try
    {
        if (existingSession && existingSession.discordEventID && existingSession.discordEventID.length > 5) //need to update the existing discord event, so we don't lose "interested" people
        {
            try
            {
                discordEvent = await guild.scheduledEvents.edit(existingSession.discordEventID, discordEventArgs);
            } catch {
                discordEvent = await guild.scheduledEvents.create(discordEventArgs);    
            }
        }
        else //new, make it
        {
            discordEvent = await guild.scheduledEvents.create(discordEventArgs);
        }
    } catch (e) { console.log(e); }
    
    var discordEventID = discordEvent ? discordEvent.id : null;

    var session = {
        type, week, day, hour, minute, durationMins, 
        startTime: momentToTimestamp(startTime),
        endTime: endTime ? momentToTimestamp(endTime) : null
    };
    if (discordEventID) session.discordEventID = discordEventID;
    if (channelID) session.channelID = channelID;
    if (textChannelID) session.textChannelID = textChannelID;
    if (description) session.description = description;

    var result;
    if (existingSession) //update details of existing one
    {
        result = await collection.doc(existingSession.id).update(session);
        result.id = existingSession.id;
    }
    else //its new, make it
    {
        result = await collection.add(session); 
    }
    return result;
}
async function deleteScheduledSession(guild, session)
{
    var collection = sessionsCollection(guild);
    await collection.doc(session.id).delete();

    //var event = guild.scheduledEvents.
    var event = session.discordEventID;
    if (event && discordEventExists(guild, event))
    {
        try
        {
            await guild.scheduledEvents.delete(event);
        } catch (e) {}
    }
}
function discordEventExists(guild, discordEventID)
{
    return discordEvents[guild.id].has(discordEventID);
}
export function sessionsCollection(guild)
{
    return guildsCollection.doc(guild.id).collection("sessions");
}

export async function getNextSession(guild, ofType)
{
    var sessions = getAllSessionsInOrder(guild, ofType);
    
    var now = moment();
    var nextSession = null;
    var found = false;
    sessions.forEach(session => {
        if (found == false) //haven't found yet (PS: this function relies on sorted sessions, which is /fine/)
        {
            var start = session.startTimestamp;
            if (start.isAfter(now))
            {
                found = true;
                nextSession = session;
            }
        }
    });
    return nextSession;
}
function getAllSessionsInOrder(guild, ofType)
{
    var sessions = SESSIONS[guild.id];
    if (sessions == null) return [];
    
    sessions.forEach(session => {
        session.startTimestamp = session.startTime ? moment(session.startTime._seconds*1000) : null;
    });
    sessions = sessions.filter(e => e.startTime != null);
    if (ofType != null)
    {
        sessions = sessions.filter(e => e.type.toLowerCase() == ofType.toLowerCase());
    }
    sessions.sort((a,b) => a.startTimestamp - b.startTimestamp);
    return sessions;
    /*
    var semester = SEMESTERS[sessions.semester];
    
    var all = [];
    sessions.forEach(config => 
    {
        if (ofType != null && config.type != ofType) return;

        console.log(config);

        var sessionTypeAll = [];
        for (var i = 0; i < config.weeks.length; i++)
        {
            var week = config.weeks[i];
            for (var j = 0; j < config.sessionsPerWeek.length; j++)
            {
                var scheduleInfo = config.sessionsPerWeek[j];
                var weekStart = getSemesterWeekStart(null, semester, week, scheduleInfo.day);
                var startTime = moment(weekStart).add(scheduleInfo.hour, "hour").add(scheduleInfo.minute, "minute");
                var session = config;
                session.startTimestamp = startTime;
                sessionTypeAll.push(session);
            }
        }
        all.push(...sessionTypeAll);
    });
    return all;
    */
}
export async function getNextSessionCountdown(guild, linkChannelName, ofType)
{
    var nextSession = await getNextSession(guild, ofType);
    if (nextSession == null)
    {
        return { 
            title:"There is no next session. Sad Panda :(",
            description:""
        };
    }

    //console.log(nextSession);

    var text = "The next **";
    text += nextSession.type;
    text += "** will be ";
    text += nextSession.startTimestamp.fromNow();
    //text += " (that's "+nextSession.startTimestamp.calendar()+").";
    
    var desc = "That's "+nextSession.startTimestamp.utcOffset(11).format("dddd, MMMM Do YYYY, h:mm a");
    if (linkChannelName)
    {
        var textChannelInfo = "";
        if (nextSession.textChannelID)
        {
            textChannelInfo = " and <#"+nextSession.textChannelID+">";
        }
        desc += " in <#"+channelIDArrayHandler(nextSession.channelID)+">"+textChannelInfo+".";
    }
    else
    {
        desc += " in @here.";
    }

    return { 
        title:text,
        description:desc
    };
}

export async function scheduleNextSessionPost(guild)
{
    var nextSession = await getNextSession(guild); //offset = remindBefore
    if (nextSession != null)
    {
        var now = moment();
        var reminderTime = moment(nextSession.startTimestamp);
        reminderTime.subtract(remindBefore, "minutes");

        var diffInMilliseconds = reminderTime.diff(now);
        if (diffInMilliseconds <= 0){
            //console.log("next session message was about to be scheduled /in the past/... not sure why heres deets:", diffInMilliseconds,  await getNextSessionCountdown(guild, false));
        }
        else
        {
            //console.log("waiting", diffInMilliseconds, "ms before next session countdown --", await getNextSessionCountdown(guild, false));
            if (diffInMilliseconds < 10000000)
            {
                await sleep(diffInMilliseconds); 

                var countdown = await getNextSessionCountdown(guild, false);
                var channel = await guild.client.channels.cache.get(channelIDArrayHandler(nextSession.textChannelID));
                await send(channel, {embeds: [ countdown ]});
                //await send(channel, await getNextSessionCountdown(guild, false));
            }
        }

        //sleep a little, just so the next session isn't the same as this one
        await sleep(5000);

        await scheduleNextSessionPost(guild);//rinse and repeat!
    }
}

function channelIDArrayHandler(channelID)
{
    if (typeof(channelID) === "object")
    {
        return channelID[0];
    }
    else
    {
        return channelID;
    }
}

export function didAttendSession(instance, session)
{
    var time = moment(instance.joined);
    var leftTime = moment(instance.left);
    return time.isBetween(session.earlyStartTimestamp, session.endTimestamp) || leftTime.isBetween(session.earlyStartTimestamp, session.endTimestamp);
}
export function postWasForSession(instance, session)
{
    var time = moment(instance.timestamp);
    return time.isBetween(session.earlyStartTimestamp, session.endTimestamp);
}