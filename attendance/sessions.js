import * as config from "../core/config.js";
import moment from "moment";
import { sleep } from "../core/utils.js";
import { send } from "../core/client.js";

var earlyTime = 15;//minutes
var remindBefore = 15;//minutes //todo: override per-session?

var SESSIONS = new Map();

export async function init_sessions(guild)
{

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