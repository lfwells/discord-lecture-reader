//NB all 2021 Sem 2 data before 8:37 on Monday 19 July 2021 was recorded with UTC 0 on the server
import { filter, paginate } from "../core/pagination.js"; 
import { getSessions, deleteAllScheduledEvents, didAttendSession, postWasForSession, scheduleAllSessions, getNextSession } from "./sessions.js";
import { invlerp } from "../core/utils.js";
import moment from "moment";
import { getPostsData } from "../analytics/analytics.js";
import { KIT109_S2_2021_SERVER, KIT207_S2_2021_SERVER, KIT308_S2_2021_SERVER } from "../core/config.js";
import { beginStreamingRes } from "../core/server.js";
import { getGuildDocument, getGuildProperty, setGuildProperty } from "../guild/guild.js";
import studentIDMap from "./studentIDMap.js";

export var ATTENDANCE_CACHE = {}; //because querying the db for all attendances on demand is bad (cannot cache on node js firebase it seems)s

//TODO: move this to sessions.js (and create that lol)
export async function sessionPage(req, res) 
{




/*TODO 
- delete generated events using "reason" field (if we can)
- import using ical or somethign
- bugfix and test the old analytics pages
*/

    var sessions = await getGuildProperty("sessionsJSON", req.guild, {});
    console.log(sessions);

    res.render("sessions", {
        sessions: sessions,
        channels: req.channels,
        textChannels: req.textChannels
    });
}
export async function sessionPagePost(req,res,next)
{
    beginStreamingRes(res);

    await setGuildProperty(req.guild, "sessionsJSON", req.body);
    await scheduleAllSessions(res, req.guild, req.body);

    res.write("\nDone!");
    res.end();

}
export async function deleteAllEvents(req,res,next)
{
    beginStreamingRes(res)
    await deleteAllScheduledEvents(res, req.guild);
    
    res.write("\nDone!");
    res.end();
}

export async function displayAttendanceOld(req, res, next) 
{
    res.render("attendanceOld", {
        data:req.data
    });
    next()
}
    

//display attendance
export async function getAttendanceDataOld(req,res,next)
{
    var data = await req.guildDocument.collection("attendance").orderBy("joined", "desc").get();
    req.data = [];
    data.forEach(doc =>
    {
        var d = doc.data();
        d.id = doc.id;
        d.timestamp = d.joined;
        d.joined = new Date(d.joined).toUTCString();
        d.left = d.left ? new Date(d.left).toUTCString() : "";
        req.data.push(d);
    });
    next();
}

//marking, mashing that in here
export async function recordProgress(req, res, next) 
{
    var d = new Date();
    req.query.timestamp = d.getTime();

    await req.guildDocument.collection("progress").add(req.query);
    res.json({"success": true});
    next()
}

export async function displayProgressOld(req, res, next) 
{
    var data = req.data;
    data = data.filter(r => r.username && r.username != "lfwells");
    data = await filter(req, data); //this one mutates the arr, because we want the page count to reflect filter
    res.render("progressOld", await paginate(req, data)); //TODO use middleware properly here instead zz
    next()
}

export async function getProgressDataOld(req,res,next)
{
    var data = await req.guildDocument.collection("progress").orderBy("timestamp", "desc").get();
    req.data = [];
    data.forEach(doc =>
    {
        var d = doc.data();
        d.id = doc.id;
        d.timestamp = new Date(d.timestamp).toUTCString();
        req.data.push(d);
    });
    next();
}


export async function recordSectionProgress(req, res, next) 
{
    console.log("recordSectionProgress", req.query);
    if (req.query.studentID)
    {
        //console.log("stud id", req.query.studentID);
        var d = new Date();
        req.query.timestamp = d.getTime();

        await req.guildDocument.collection("section_progress").add(req.query);
        res.json({"success": true});
        console.log({success:true});
        next()
        return;
    }
    //console.log((req.query));
    res.statusCode = 403;
    res.json({"success": false});
}
   
export async function getSectionProgress(req,res,next)
{
    if (req.query.post) //ugly workaround for unity C# web requests
    {
        return recordSectionProgress(req,res,next);
    }
    if (req.query.studentID)
    {
        //console.log("stud id", req.query.studentID);
        var data = await req.guildDocument.collection("section_progress").where("studentID", "==", req.query.studentID).get();
        
        req.data = [];
        data.forEach(doc =>
        {
            var d = doc.data().tutorial;
            if (req.data.indexOf(d) == -1)
                req.data.push(d);
        });

        res.json(req.data);
        return;
    }
    //console.log((req.query));
    res.statusCode = 403;
    res.json({"success": false});
}

export async function getSectionProgressAll(req, res, next)
{
    var data = await req.guildDocument.collection("section_progress").get();
    
    //do a days cache
    res.locals.sectionProgress = [];
    res.locals.sectionProgressDayCache = {};
    data.forEach(doc =>
    {
        var d = doc.data();
        if (res.locals.sectionProgress.indexOf(d) == -1)
            res.locals.sectionProgress.push(d);

        var timestamp = moment(d.timestamp);
        d.timestamp = moment(timestamp);
        var day = timestamp.startOf('day');
        if (res.locals.sectionProgressDayCache[day] == undefined)
        {
            res.locals.sectionProgressDayCache[day] = [];
        }
        res.locals.sectionProgressDayCache[day].push(d);
    });
    //var a = true;
    for (var x of Object.keys(res.locals.sectionProgressDayCache))
    {
        res.locals.sectionProgressDayCache[x].sort((a,b) => b.timestamp - a.timestamp); //descending order for the cache to work nicely
        /*if (a)
        {
            console.log(res.locals.sectionProgressDayCache[x]);
            a =false;
        }*/
    }
    next();
}

//new fancy version
export async function getProgressData(req,res,next)
{

    var data = await req.guildDocument.collection("progress").get();

    //HACK Part 2 Electric Boogalo: map usernames to student IDs to fix missing data
    
    //var data = await req.guildDocument.collection("progress").get();
    req.data = [];
    res.locals.tutorials = [];

    var dayCache = {};

    function addTutorial(name) //TODO: logic in here may be a bit too KIT109 specifc, rely on tutorial naming scheme
    {
        //extract tute number:
        name = name.substring(0, name.indexOf("-"))
        name = name.trim();
        var tutorial = name.substring(0, name.length - 1);
        
        if (tutorial == "") return;

        for (var i in res.locals.tutorials)
        {
            if (res.locals.tutorials[i].name == tutorial) return i;
        }
        //else
        res.locals.tutorials.push({
            name:tutorial,
            sections:[]
        });

        return res.locals.tutorials.length - 1;
    }
    function addSection(tuteIndex, name) //TODO: logic in here may be a bit too KIT109 specifc, rely on tutorial naming scheme
    {
        //extract section number (letter)
        var letter = name.substring("TutorialXX".length, "TutorialXX".length+1);
        
        //extract section name:
        name = name.replace("--", "-");
        name = name.substring(name.indexOf("-")+1);
        name = name.trim();
        var section = name;
        if (section == "") return;
        
        var tutorial = res.locals.tutorials[tuteIndex];
        //console.log(tuteIndex, tutorial);
        for (var i in tutorial.sections)
        {
            if (tutorial.sections[i].name == section) return i;
        }
        //else
        tutorial.sections.push({
            shortName:letter,
            name:section,
            pages:[],
            cache:[]
        });

        return tutorial.sections.length - 1;
    }
    function addPage(tuteIndex, sectionIndex, page) //TODO: logic in here may be a bit too KIT109 specifc, rely on tutorial naming scheme
    {
        var tutorial = res.locals.tutorials[tuteIndex];
        var section = tutorial.sections[sectionIndex];
        for (var i in section.pages)
        {
            if (section.pages[i].name == page) return i;
        }
        //else
        section.pages.push({
            name: page,
            cache:[]
        });

        return section.pages.length - 1;
    }

    var names = new Set();
    data.forEach(doc =>
    {
        var d = doc.data();

        //skip some
        if (d.page == null) return;
        if (d.page == "BASE_PACKAGE") return;//TODO: others?
        if (d.page.indexOf("&page=") != -1) return;

        d.id = doc.id;
        d.timestamp = new Date(d.timestamp).toUTCString();
        req.data.push(d);
        //console.log(d);
        names.add(d.username);

        //tutorial
        var tuteIndex = addTutorial(d.tutorial);
        if (!tuteIndex && tuteIndex != 0)
        {
            console.log("bugger", tuteIndex, d);
        }

        //section
        var sectionIndex = addSection(tuteIndex, d.tutorial);
        //cache the page-data at section level
        res.locals.tutorials[tuteIndex].sections[sectionIndex].cache.push(d);
        
        //page
        var pageIndex = addPage(tuteIndex, sectionIndex, d.page);
        //cache the page-data at page level too
        res.locals.tutorials[tuteIndex].sections[sectionIndex].pages[pageIndex].cache.push(d);
    });
    //convert names set to array
    //names = names.values.toArray().sort();
    res.locals.names = names;
    console.log({names})

    //sort the tutorials (annoyingly cant sort by section? wait can)
    res.locals.tutorials = res.locals.tutorials.sort((a,b) => a.name.localeCompare(b.name));
    res.locals.tutorials.forEach(t => 
    {
        t.colspan = 0;
        t.sections = t.sections.sort((a,b) => a.shortName.localeCompare(b.shortName)); 
        t.sections.forEach(s => 
        {
            s.colspan = s.pages.length;
            t.colspan += s.colspan;
            s.pages.sort((a,b) => a.name.localeCompare(b.name));
        });
    });
    //console.log(res.locals.tutorials[0].sections[0].pages);
    
    res.locals.checkAttendance = function(student, section)
    {
        var lookupById = studentIDMap[student.username] != undefined;
        var studentID = studentIDMap[student.username];
        var text = "";
        for (var p in section.pages)
        {
            var page = section.pages[p];
            //text += '<td class="complete">'+page.cache.length+'</td>';
            //continue;
            var found = false;
            for (var i in page.cache)
            {
                var match = page.cache[i].username == student.username;
                if (match == false)
                {
                    if (lookupById)
                    {
                        match = page.cache[i].studentID == studentID;
                    }
                }
                
                if (match)
                {
                    text += '<td title="'+page.name+'" class="pageResult complete" sortValue="1">&nbsp;</td>';
                    found = true; 
                    break;
                }
            }
            if (found == false)
                text += '<td title="'+page.name+'" class="pageResult not_complete" sortValue"0">&nbsp;</td>';
        }
        return text;
    };

    next();
}
export async function displayProgress(req, res, next) 
{
    res.render("progress"); //TODO use middleware properly here instead zz
    next()
}


//fancy session-based view
export async function getAttendanceData(req,res,next)
{
    if (ATTENDANCE_CACHE[req.guild.id])
    {
        req.attendanceData = ATTENDANCE_CACHE[req.guild.id];
    }
    else
    {

        var data = await req.guildDocument.collection("attendance").get();
        req.attendanceData = [];
        data.forEach(doc =>
        {
            var d = doc.data();
            d.id = doc.id;
            d.timestamp = d.joined;
            d.leftTimestamp = d.left;
            d.joined = new Date(d.joined).toUTCString();
            d.left = d.left ? new Date(d.left).toUTCString() : "";
            req.attendanceData.push(d);
        });
    
        ATTENDANCE_CACHE[req.guild.id] = req.attendanceData;
    }

    //TODO: return of this function is not compatible with these now
    res.locals.weeks = await getSessions(req.guild);

    var rawStatsData = await getPostsData(req.guild);

    res.locals.checkAttendance = function(student, s, plainText)
    {
        var complete = false;
        var data = null;
        for (var i in req.attendanceData)
        {
            var row = req.attendanceData[i];
            if (row.memberID == student.discordID) //AND check room? shouldn't matter
            {
                if (didAttendSession(row, s))
                {
                    complete = true;
                    data = row;
                    break;
                }
            }
        }

        if (!complete)
        {
            //in 2021 sem 2 we lost the week 8 and 9 tutes and lecture, fake the data...
            //technically should do this for attendancePerSessionPlusOutOfSession but meh
            if (req.guild.id == KIT109_S2_2021_SERVER)
            {
                if (
                    (s.name == "Tutorial" && s.week == 8) || 
                    (s.name == "Tutorial" && s.week == 9) || 
                    (s.name == "Practical" && s.week == 9) || 
                    (s.name == "Lecture" && s.week == 9) )
                {
                    //console.log("doing a check for week 8/9", rawStatsData.filter(p => p.author == student.discordID).length);
                    complete = rawStatsData.findIndex(p => p.author == student.discordID && postWasForSession(p, s)) >= 0;
                }
                    
            }
            else if (req.guild.id == KIT207_S2_2021_SERVER)
            {
                if (
                    (s.name == "Practical" && s.week == 9) || 
                    (s.name == "Lecture" && s.week == 9) )
                {
                    complete = rawStatsData.findIndex(p => p.author == student.discordID && postWasForSession(p, s)) >= 0;
                }
            }
            else if (req.guild.id == KIT308_S2_2021_SERVER)
            {
                if (
                    (s.name == "Workshop" && s.week == 8) || 
                    (s.name == "Tutorial" && s.week == 9) || 
                    (s.name == "Workshop" && s.week == 9) || 
                    (s.name == "Lecture" && s.week == 9) )
                {
                    complete = rawStatsData.findIndex(p => p.author == student.discordID && postWasForSession(p, s)) >= 0;
                }
            }
        }

        //TODO: any info about the row?, maybe in title
        if (plainText)
        {
            return (complete ? "x" : "");
        }
        else
        {
            return '<td title="'+s.name+'" class="pageResult '+(complete ? "complete" : "not_complete")+'" sortValue="'+(complete?"1":"0")+'">&nbsp;</td>';
        }
    };
    if (next) next();
}

export async function displayAttendance(req, res, next) 
{
    res.render("attendance");
    next()
}


export async function getProgressTimelineData(req, res, next)
{
    var days = [];
    var semesterStart = moment("2021-07-11"); //start of the week of SUNDAY 11 July 2021
    var semesterEnd = moment("2021-10-17"); //end of the week of SUNDAY 17 October 2021
    var day = moment(semesterStart);
    while (day.isSameOrBefore(semesterEnd))
    {
        var dayInfo = { 
            day: day,
            name: day.format("dddd MMMM Do"),
            splits: [],
        };
        var split = moment(day);
        var endOfDay = moment(day);
        endOfDay.add(1, 'day');

        while (split.isSameOrBefore(endOfDay))
        {
            dayInfo.splits.push({
                split:moment(split),
                name: split.format("h:mm"),
            });
            split.add(1, 'hour');
        }
        dayInfo.colspan = dayInfo.splits.length;

        days.push(dayInfo);
        day.add(1, 'day');
    }
    res.locals.days = days;

    //var colors = ["#048318", "#01ff29", "#03f7d0", "#0b1d2f", "#04959f", "#000da7", "#0f02d8", "#099f8c", "#00566b", "#0c1c83", "#0d19cf", "#076c68", "#0d91e3", "#0e83fd", "#03efed"];
    var colors = [
        "#AA0000",
        "#FF0000",
        "#00AA00",
        "#00FF00",
        "#0000AA",
        "#0000FF",
        "#AAAA00",
        "#FFFF00",
        "#00AAAA",
        "#00FFFF",
        "#AF0000",
        "#00AF00",
        "#0000AF",
        "#000000",
        "#FFFFFF",
    ]
    res.locals.checkProgress = function(student, split)
    {
        var complete = false;
        var color = "#000000";
        var a = 0;
        var tutorial = "";
        var session = "";

        var day = moment(split);
        var nextSplit = moment(split);
        nextSplit.add(1, "hour");
        day = day.startOf('day');
        var cache = res.locals.sectionProgressDayCache[day];
        if (cache)
        {
            /*
            if  (day.isSame(moment().subtract(3, 'day').startOf('day'))) //test
                {
                    console.log(split, nextSplit);
                    //console.log(row.timestamp, split, nextSplit, row.timestamp.isBetween(nextSplit, split));
                }
                */
            for (var row of cache)
            {
                if (row.username == student.username)
                {
                    /*if  (day.isSame(moment().subtract(3, 'day').startOf('day'))) //test
                    {
                        //console.log(split, nextSplit);
                        console.log(row.timestamp.format("HH:mm"), split.format("HH:mm"), nextSplit.format("HH:mm"), row.timestamp.isBetween(split, nextSplit));
                    }*/
                    if (row.timestamp.isBetween(split, nextSplit))
                    {
                        var tutorial =  parseInt(row.tutorial / 100);
                        var section = row.tutorial % 100;
                        complete = true;

                        color = colors[(tutorial-1) % colors.length];
                        a = parseInt((invlerp(0, 10, section-1) * 255)).toString(16); //TODO: know section length of each
                        break;
                    }
                }
            }
        }
        if (tutorial)
            return '<td title="Tutorial '+tutorial+'-'+section+'" style="background-color:'+color+a+';">X</td>';
        else
            return '<td></td>';
    };

    
    //only show last student, for testing
    //res.locals.classList = res.locals.classList.slice(-1); 

    next();
}
export async function displayProgressTimeline(req, res, next) 
{
    res.render("progress_timeline"); //TODO use middleware properly here instead zz
    next()
}


export async function nextSessionOBS(req,res,next)
{
    var ofType = req.query.ofType ?? "Lecture";
    var session = await getNextSession(req.guild, ofType);
    res.render("next_session_obs", { session });
}