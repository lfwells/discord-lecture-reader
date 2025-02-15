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
    sem1_2022:{ start: moment("2022-02-21"), breakStart: moment("2022-04-14"), breakEnd: moment("2022-04-20") },
    sem2_2022:{ start: moment("2022-07-11"), breakStart: moment("2022-08-29"), breakEnd: moment("2022-09-04") },
    sem1_2023:{ start: moment("2023-02-20"), breakStart: moment("2023-04-06"), breakEnd: moment("2023-04-12") },
    sem2_2023:{ start: moment("2023-07-10"), breakStart: moment("2023-08-28"), breakEnd: moment("2023-09-03") },
    sem1_2024:{ start: moment("2024-02-26"), breakStart: moment("2024-03-28"), breakEnd: moment("2024-04-03") },
    sem2_2024:{ start: moment("2024-07-22"), breakStart: moment("2024-09-02"), breakEnd: moment("2024-09-08") },
    sem1_2025:{ start: moment("2025-02-24"), breakStart: moment("2025-03-17"), breakEnd: moment("2025-03-23") },
    sem2_2025:{ start: moment("2025-07-21"), breakStart: moment("2025-09-01"), breakEnd: moment("2025-09-07") },
}

export async function getSessions(guild)
{
    return getAllSessionsInOrder(guild);
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
        //session.weekStart = getSemesterWeekStart(null, session.semester ?? "sem1_2022", session.week, session.day);
        //session.startTime = moment(session.weekStart).add(session.hour, "hour").add(session.minute, "minute");
        session.startTime = moment(session.startTime._seconds*1000);
        session.startTimestamp = session.startTime;
        var d = session.durationMins == null || session.durationMins == 0 ? 60 : session.durationMins;
        session.endTime = moment(session.startTime).add(d, "minute");
        session.earlyStartTimestamp = moment(session.startTime).subtract(earlyTime, "minutes");
        session.weekStart = moment(session.startTime).startOf("isoWeek")
        //console.log(session);
        data.push(session); 
        
    });

    data.sort((a,b) => a.week - b.week);
    SESSIONS[guild.id] = data;

    discordEvents[guild.id] = await guild.scheduledEvents.fetch();

    scheduleNextSessionPost(guild);
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

    SESSIONS[guild.id] = createdSessions;

    cancelNextSessionCountdownFunction(guild);
    
}
async function scheduleAllSessionsOfType(res, guild, config, semester)
{
    console.log("scheduleAllSessionsOfType", config.type);
    config.semester = semester;
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

    res.write(`Scheduled ${config.type} (Week ${week}) -- ${startTime.format("dddd, MMMM Do YYYY, h:mm:ss a")} (${createdSession.id})\n`);
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
    /*if (startTime.isBefore(moment()))
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
    }*/

    var name = `${type} (Week ${week})`

    var discordEvent;
    var discordEventArgs = {
        name:name,
        scheduledStartTime:moment(startTime).utcOffset(0).toISOString(),
        scheduledEndTime:endTime != null ? moment(endTime).utcOffset(0).toISOString() : null,
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

    if (!startTime.isBefore(moment()))
    {
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
    }
    
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
            var start = session.startTime;
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
    
    var desc = "That's "+nextSession.startTimestamp.format("dddd, MMMM Do YYYY, h:mm a");
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

var cancelNextSessionCountdown = {};
export function cancelNextSessionCountdownFunction(guild) { cancelNextSessionCountdown[guild.id] = true; }
export async function scheduleNextSessionPost(guild)
{
    var nextSession = await getNextSession(guild); //offset = remindBefore
    if (nextSession != null)
    {
        var reminderTime = moment(nextSession.startTimestamp);
        reminderTime.subtract(remindBefore, "minutes");

        var diffInMilliseconds = reminderTime.diff(moment());

        if (diffInMilliseconds <= 0){
            //console.log("next session message was about to be scheduled /in the past/... not sure why heres deets:", diffInMilliseconds,  await getNextSessionCountdown(guild, false));
            
            await sleep(5000);

            await scheduleNextSessionPost(guild);//rinse and repeat!

            return;
        }
        else
        {
            do
            {
                var now = moment();
                diffInMilliseconds = reminderTime.diff(now);
                //console.log("b"+diffInMilliseconds, cancelNextSessionCountdown[guild.id], cancelNextSessionCountdown[guild.id] === true);
                if (cancelNextSessionCountdown[guild.id] === true) 
                {
                    //console.log("detected a cancel call?");
                    cancelNextSessionCountdown[guild.id] = false;
                    await sleep(1000);

                    await scheduleNextSessionPost(guild);//rinse and repeat!

                    return;
                }

                await sleep(1000 * 10);
            }
            while(diffInMilliseconds > 0);
        }
        
        var countdown = await getNextSessionCountdown(guild, false);
        var channel = await guild.client.channels.cache.get(channelIDArrayHandler(nextSession.textChannelID));
        //console.log("SEND the scheduled thing zz");
        await send(channel, {embeds: [ countdown ]});

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
    
    //debug out th values in the if statment
    /*
    if (session.week == 2)
        console.log({
            memberID: instance.memberID,
            time:time.format("dddd, MMMM Do YYYY, h:mm:ss a"), 
            leftTime:leftTime.format("dddd, MMMM Do YYYY, h:mm:ss a"), 
            SearlyStart:session.earlyStartTimestamp.format("dddd, MMMM Do YYYY, h:mm:ss a"), 
            SendTime:session.endTime.format("dddd, MMMM Do YYYY, h:mm:ss a"), 
            between:time.isBetween(session.earlyStartTimestamp, session.endTime),
            betweenLeft:leftTime.isBetween(session.earlyStartTimestamp, session.endTime)
        });*/
    return time.isBetween(session.earlyStartTimestamp, session.endTime) || leftTime.isBetween(session.earlyStartTimestamp, session.endTime);
}
export function postWasForSession(instance, session)
{
    var time = moment(instance.timestamp);
    return time.isBetween(session.earlyStartTimestamp, session.endTime);
}


export async function getCurrentWeek(guild)
{
    var now = moment();
    //get sorted list of semesters
    var sortedSemesters = Object.values(SEMESTERS);
    sortedSemesters = sortedSemesters.sort((a,b) => b.start - a.start);
    for (var semester of sortedSemesters) {
        if (now.isBetween(semester.breakStart, semester.breakEnd, undefined, "[]"))
        {
            return "Semester Break";
        }
        else 
        {
            var daysAfter = now.diff(semester.start, 'day');
            if (daysAfter >= 0)
            {
                var daysAfterBreak = Math.max(0, Math.min(7, now.diff(semester.breakStart, 'day')));
                
                var weeksAfter = Math.floor((daysAfter - daysAfterBreak) / 7) + 1;
                //console.log({ daysAfter, daysAfterBreak, calc:(daysAfter - daysAfterBreak), weeksAfter});

                if (weeksAfter >= 0 && weeksAfter <= 15)
                {
                    return `Week ${weeksAfter}`;
                }
            }
        }
    }
    return "Outside Semester";
}