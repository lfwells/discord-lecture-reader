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
    sem1_2022:{ start: moment("2021-02-21"), breakStart: moment("2022-04-14"), breakEnd: moment("2022-04-20") },
    sem2_2022:{ start: moment("2022-07-11"), breakStart: moment("2022-08-29"), breakEnd: moment("2022-09-04") },
    //asp1_2022:{ start: moment().set({ 'year': 2022, 'month': 2, 'day': 21 }), breakStart: moment().set({ 'year': 2022, 'month': 4, 'day': 14 }), breakEnd: moment().set({ 'year': 2022, 'month': 4, 'day': 20 }) },
    //asp2_2022:{ start: moment().set({ 'year': 2022, 'month': 2, 'day': 21 }), breakStart: moment().set({ 'year': 2022, 'month': 4, 'day': 14 }), breakEnd: moment().set({ 'year': 2022, 'month': 4, 'day': 20 }) },
}
async function deleteAllScheduledEvents(guild)
{
    var allEvents = await guild.scheduledEvents.fetch();
    allEvents.each(async (v,k) => await guild.scheduledEvents.delete(v));
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
}

export async function scheduleAllSessions(res, guild, config)
{
    var expectedCount = 0;
    for (var i = 0; i < config.types.length; i++)
    {
        expectedCount += config.types[i].weeks.length;
    }
    res.write(`Scheduling ${pluralize(expectedCount, "Event")}. This may take some time (Discord takes a break every 5 events)...\n`);

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
    
}
async function scheduleAllSessionsOfType(res, guild, config, semester)
{
    console.log("scheduleAllSessionsOfType", config.type);
    var createdSessions = [];
    for (var i = 0; i < config.weeks.length; i++)
    {
        var week = config.weeks[i];
        var weekStart = getSemesterWeekStart(semester, week, config.day);
        var startTime = weekStart.add(config.hour, "hour").add(config.minute, "minute");
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
        if (config.location)
        {
            descriptionItems.push(config.location);
        }
        var description = descriptionItems.length > 0 ? descriptionItems.join("\n") :  undefined;

        var createdSession = await scheduleSession(
            guild, config.type, startTime, endTime, config.channelID, week, config.day, config.hour, config.minute, config.duration, description
        );
        if (createdSession != null)
            createdSessions.push(createdSession);

        res.write(`Scheduled ${config.type} (Week ${week}) -- ${startTime.toISOString()}\n`);
    }
    return createdSessions;
}
function getSemesterWeekStart(semester, week, day)
{
    var start = moment(semester.start);
    start = start.add(day-1, 'day');
    for (var i = 0; i < week-1; i++)
    {
        start = start.add(1, "week");
        
        if (dayIsDuringSemesterBreak(semester, start))
            start = start.add(1, "week");
    }
    return start;
}
function dayIsDuringSemesterBreak(semester, dayMoment)
{
    return dayMoment.isBetween(semester.breakStart, semester.breakEnd, 'day', '()');
}

//TODO: the below will break if you specify same types
//this will return the database ID of the generated session row (for the purposes of deleting all the other ones upon a sync)
async function scheduleSession(guild, type, startTime, endTime, channelID, week, day, hour, minute, durationMins, description)
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
        scheduledStartTime:startTime.toISOString(),
        scheduledEndTime:endTime != null ? endTime.toISOString() : null,
        description: description,
        reason: "reason",
        privacyLevel: "GUILD_ONLY"
    }
    if (channelID)
    {
        discordEventArgs.entityType = "VOICE";
        discordEventArgs.channel = channelID;
    }
    else
    {
        discordEventArgs.entityMetadata = { location: description ?? "TBA" };
        discordEventArgs.entityType = "EXTERNAL";
    }

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
    
    var discordEventID = discordEvent.id;

    var session = {
        type, week, day, hour, minute, discordEventID, durationMins, 
        startTime: momentToTimestamp(startTime),
        endTime: endTime ? momentToTimestamp(endTime) : null
    };
    if (channelID) session.channelID = channelID;
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

//TODO: an interface for defining sessions and names? for now just auto-gen
export async function getSessions(guild)
{
    var weeks = [];

    if (!guild)
    {
        console.log("getSessions() got no guild?");
        return weeks;
    }

    var semesterStart = moment("2021-07-11"); //start of the week of SUNDAY 11 July 2021 //TODO: configured
    var weekStart = semesterStart;
    if (guild.id == config.KIT109_S2_2021_SERVER)
    {
        for (var w = 1; w <= 13; w++)
        {
            var week = {
                name: "Week "+w,
                weekStart: weekStart,
                sessions: [] 
            };

            if (w > 1) //no pracs in week 1
            {
                var sessionTime = moment(weekStart);
                sessionTime.day(2); //Tuesday
                sessionTime.hour(15);
                week.sessions.push({
                    name:"Practical",
                    week: w,
                    time:sessionTime,
                    duration:2,
                    channelID:["851553123746578481",  //tutorial-chat (as first in array, notifications will be here)
                        "866939311597027358", "851553123340255253", //queue and game-feedback
                        "851553124073209876", "851553124073209877", "851553124073209878", "879599703656890408", "879599731108610108", "879599755783729193"],  //breakouts
                    voiceChannelID:[
                        "851553124073209879",
                        "851553124073209880",
                        "851553124073209881",
                        "851553124073209882",
                        "879599578184290324",
                        "879599619959578635",
                        "879599657611837490"
                    ]
                });
            }

            var sessionTime = moment(weekStart);
            sessionTime.day(3); //Wednesday
            sessionTime.hour(12);
            week.sessions.push({
                name:"Lecture",
                week: w,
                time:sessionTime,
                duration:2,
                channelID: "851553123746578474",
                voiceChannelID: "851553123746578475"
            });

            var sessionTime = moment(weekStart);
            sessionTime.day(w == 12 ? 5 : 4); //Thursday (Friday in week 12)
            sessionTime.hour(9);
            week.sessions.push({
                name:"Tutorial",
                week: w,
                time:sessionTime,
                duration:4,
                channelID:["851553123746578481",  //tutorial-chat (as first in array, notifications will be here)
                        "866939311597027358", "851553123340255253", //queue and game-feedback
                        "851553124073209876", "851553124073209877", "851553124073209878", "879599703656890408", "879599731108610108", "879599755783729193"],  //breakouts
                voiceChannelID:[
                    "851553124073209879",
                    "851553124073209880",
                    "851553124073209881",
                    "851553124073209882",
                    "879599578184290324",
                    "879599619959578635",
                    "879599657611837490"
                ]
            });
        

            week.colspan = week.sessions.length;
            weeks.push(week);

            //add on one week
            weekStart = moment(weekStart);
            weekStart.add(7, 'days');
            //semester break, add on another
            if (w == 7)
                weekStart.add(7, 'days');
        }

        //week 14 garb
        var week = {
            name: "SWOTVAC",
            weekStart: weekStart,
            sessions: [] 
        };
        var sessionTime = moment(weekStart);
        sessionTime.day(3); //Wednesday
        sessionTime.hour(12);
        week.sessions.push({
            name:"Exam Game Demo",
            week: w,
            time:sessionTime,
            duration:2,
            channelID: "851553123746578474",
            voiceChannelID: "851553123746578475"
        });

        week.colspan = week.sessions.length;
        weeks.push(week);
    
    }
    else if (guild.id == config.KIT207_S2_2021_SERVER)
    {
        for (var w = 1; w <= 13; w++)
        {
            var week = {
                name: "Week "+w,
                weekStart: weekStart,
                sessions: [] 
            };

            var sessionTime = moment(weekStart);
            sessionTime.day(2); //Tuesday
            sessionTime.hour(13);
            week.sessions.push({
                name:"Lecture",
                week: w,
                time:sessionTime,
                duration:2,
                channelID:"861231510005743656",
                voiceChannelID: ["860360631450075139", "869445948399562792"]
            });

            if (w > 1) //no pracs in week 1
            {
                var sessionTime = moment(weekStart);
                sessionTime.day(2); //Tuesday
                sessionTime.hour(15);
                week.sessions.push({
                    name:"Practical",
                    week: w,
                    time:sessionTime,
                    duration:2,
                    channelID:"861231530751164426",
                    voiceChannelID: ["860360631450075139", "869445948399562792"]
                });
            }


            week.colspan = week.sessions.length;
            weeks.push(week);

            //add on one week
            weekStart = moment(weekStart);
            weekStart.add(7, 'days');
            //semester break, add on another
            if (w == 7)
                weekStart.add(7, 'days');
        }
    }
    else if (guild.id == config.KIT308_S2_2021_SERVER)
    {
        for (var w = 1; w <= 13; w++)
        {
            var week = {
                name: "Week "+w,
                weekStart: weekStart,
                sessions: [] 
            };

            if (w > 1) //no pracs in week 1
            {
                var sessionTime = moment(weekStart);
                sessionTime.day(3); //Wednesday
                sessionTime.hour(15);
                week.sessions.push({
                    name:"Tutorial",
                    week: w,
                    time:sessionTime,
                    duration:2,
                    channelID:"861228239229157426" ,
                    voiceChannelID: "860323794060312600"
                });

                var sessionTime = moment(weekStart);
                sessionTime.day(4); //Thursday
                sessionTime.hour(14);
                week.sessions.push({
                    name:"Workshop",
                    week: w,
                    time:sessionTime,
                    duration:2,
                    channelID:"861228239229157426" ,
                    voiceChannelID: "860323794060312600"
                });
            }

            var sessionTime = moment(weekStart);
            sessionTime.day(1); //Monday
            sessionTime.hour(13);
            week.sessions.push({
                name:"Lecture",
                week: w,
                time:sessionTime,
                duration:2,
                channelID:"861228214835347496",
                voiceChannelID: "860323794060312600"
            });
        
            if (w == 1) //only week 1... grr lol
            {
            
                var sessionTime = moment(weekStart);
                sessionTime.day(3); //Wednesday
                sessionTime.hour(15);
                week.sessions.push({
                    name:"Lecture",
                    week: w,
                    time:sessionTime,
                    duration:2,
                    channelID:"861228214835347496",
                    voiceChannelID: "860323794060312600"
                });
            }

            week.colspan = week.sessions.length;
            weeks.push(week);

            //add on one week
            weekStart = moment(weekStart);
            weekStart.add(7, 'days');
            //semester break, add on another
            if (w == 7)
                weekStart.add(7, 'days');
        }
    }
    else if (guild.id == config.TEST_SERVER_ID)
    {
        for (var w = 1; w <= 13; w++)
        {
            var week = {
                name: "Week "+w,
                weekStart: weekStart,
                sessions: [] 
            };

            var sessionTime = moment(weekStart);
            sessionTime.day(6); //Wednesday
            sessionTime.hour(8);
            sessionTime.minute(28+15);
            week.sessions.push({
                name:"Lecture",
                week: w,
                time:sessionTime,
                duration:2,
                channelID: "813152606359650322"
            });

            var sessionTime = moment(weekStart);
            sessionTime.day(4); //Thursday
            sessionTime.hour(9);
            week.sessions.push({
                name:"Tutorial",
                week: w,
                time:sessionTime,
                duration:4,
                channelID:"813152606544855088"
            });

            week.colspan = week.sessions.length;
            weeks.push(week);

            //add on one week
            weekStart = moment(weekStart);
            weekStart.add(7, 'days');
            //semester break, add on another
            if (w == 7)
                weekStart.add(7, 'days');
        }
    }

    //cache some maths (TODO: Sort too?)
    weeks.forEach(week => {
        week.sessions.forEach(session => {
            var time = moment(session.time);
            var start = moment(time);
            var end = moment(time);
            session.startTimestamp = moment(start);
            session.earlyStartTimestamp = start.subtract(earlyTime, "minutes");
            session.endTimestamp = end.add(session.duration, "hours");
        });

        week.sessions.sort((a,b) => a.time - b.time);
    });

    return weeks;
}
export async function getNextSession(guild)
{
    var weeks = await getSessions(guild);
    
    var now = moment();
    var nextSession = null;
    var found = false;
    weeks.forEach(week => {
        week.sessions.forEach(session => {
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
    });
    return nextSession;
}
export async function getNextSessionCountdown(guild, linkChannelName)
{
    var nextSession = await getNextSession(guild);
    if (nextSession == null)
    {
        return { 
            title:"There is no next session. Sad Panda :(",
            description:""
        };
    }

    //console.log(nextSession);

    var text = "The next **";
    text += nextSession.name;
    text += "** will be ";
    text += nextSession.startTimestamp.fromNow();
    //text += " (that's "+nextSession.startTimestamp.calendar()+").";
    
    var desc = "That's "+nextSession.startTimestamp.calendar();
    if (linkChannelName)
    {
        desc += " in <#"+channelIDArrayHandler(nextSession.channelID)+">.";
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
            await sleep(diffInMilliseconds); 

            var countdown = await getNextSessionCountdown(guild, false);
            var channel = await guild.client.channels.cache.get(channelIDArrayHandler(nextSession.channelID));
            await send(channel, {embeds: [ countdown ]});
            //await send(channel, await getNextSessionCountdown(guild, false));
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