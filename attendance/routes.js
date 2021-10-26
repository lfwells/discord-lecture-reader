//NB all 2021 Sem 2 data before 8:37 on Monday 19 July 2021 was recorded with UTC 0 on the server
import { filter, paginate } from "../core/pagination.js"; 
import { didAttendSession, getSessions } from "./sessions.js";
import { invlerp } from "../core/utils.js";
import moment from "moment";

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
    if (req.query.studentID)
    {
        //console.log("stud id", req.query.studentID);
        var d = new Date();
        req.query.timestamp = d.getTime();

        await req.guildDocument.collection("section_progress").add(req.query);
        res.json({"success": true});
        next()
        return;
    }
    //console.log((req.query));
    res.statusCode = 403;
    res.json({"success": false});
}
   
export async function getSectionProgress(req,res,next)
{
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
        var text = "";
        for (var p in section.pages)
        {
            var page = section.pages[p];
            //text += '<td class="complete">'+page.cache.length+'</td>';
            //continue;
            var found = false;
            for (var i in page.cache)
            {
                if (page.cache[i].username == student.username)
                {
                    text += '<td title="'+page.name+'" class="pageResult complete">&nbsp;</td>';
                    found = true; 
                    break;
                }
            }
            if (found == false)
                text += '<td title="'+page.name+'" class="pageResult not_complete">&nbsp;</td>';
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
    //console.log(req.attendanceData);

    res.locals.weeks = await getSessions(req.guild);

    res.locals.checkAttendance = function(student, session, plainText)
    {
        var complete = false;
        var data = null;
        for (var i in req.attendanceData)
        {
            var row = req.attendanceData[i];
            if (row.memberID == student.discordID) //AND check room? shouldn't matter
            {
                //var time = moment(row.timestamp);
                //var leftTime = moment(row.leftTimestamp);
                /*if (student.username == "lfwells" && session == res.locals.weeks[0].sessions[0])
                {
                    console.log(row.timestamp, time, session.earlyStartTimestamp, session.endTimestamp, time.isBetween(session.earlyStartTimestamp, session.endTimestamp));
                }*/
                //if (time.isBetween(session.earlyStartTimestamp, session.endTimestamp) || leftTime.isBetween(session.earlyStartTimestamp, session.endTimestamp)) 
                if (didAttendSession(row, session))
                {
                    complete = true;
                    data = row;
                    break;
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
            return '<td title="'+session.name+'" class="pageResult '+(complete ? "complete" : "not_complete")+'">&nbsp;</td>';
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
            return '<td title="Tutorial '+tutorial+'-'+section+'" style="background-color:'+color+a+';">&nbsp;</td>';
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
