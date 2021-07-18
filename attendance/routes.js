//NB all 2021 Sem 2 data before 8:37 on Monday 19 July 2021 was recorded with UTC 0 on the server



import { guildsCollection } from "../core/database.js";
import { filter, paginate } from "../core/pagination.js"; 
import * as config from "../core/config.js";
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
        console.log("stud id", req.query.studentID);
        var d = new Date();
        req.query.timestamp = d.getTime();

        await req.guildDocument.collection("section_progress").add(req.query);
        res.json({"success": true});
        next()
        return;
    }
    console.log((req.query));
    res.statusCode = 403;
    res.json({"success": false});
}
   
export async function getSectionProgress(req,res,next)
{
    if (req.query.studentID)
    {
        console.log("stud id", req.query.studentID);
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
    console.log((req.query));
    res.statusCode = 403;
    res.json({"success": false});
}

//new fancy version
export async function getProgressData(req,res,next)
{
    var data = await req.guildDocument.collection("progress").get();
    req.data = [];
    res.locals.tutorials = [];

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
var earlyTime = 5;//minutes
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

    res.locals.weeks = [];

    //TODO: an interface for defining sessions and names? for now just auto-gen
    var semesterStart = moment("2021-07-11"); //start of the week of SUNDAY 11 July 2021
    var weekStart = semesterStart;
    if (req.guild.id == config.KIT109_S2_2021_SERVER)
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
                    time:sessionTime,
                    duration:2,
                    room:"Tutorial Main Room" //should be discord channel id etc whatvs next semester
                });
            }

            var sessionTime = moment(weekStart);
            sessionTime.day(3); //Wednesday
            sessionTime.hour(12);
            week.sessions.push({
                name:"Lecture",
                time:sessionTime,
                duration:2,
                room:"Lecture Room"
            });

            var sessionTime = moment(weekStart);
            sessionTime.day(4); //Thursday
            sessionTime.hour(9);
            week.sessions.push({
                name:"Tutorial",
                time:sessionTime,
                duration:4,
                room:"Tutorial Main Room"
            });

            week.colspan = week.sessions.length;
            res.locals.weeks.push(week);

            //add on one week
            weekStart = moment(weekStart);
            weekStart.add(7, 'days');
            //semester break, add on another
            if (w == 7)
                weekStart.add(7, 'days');
        }
    }
    else if (req.guild.id == config.KIT207_S2_2021_SERVER)
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
                    time:sessionTime,
                    duration:2,
                    room:"Tutorial Main Room" //should be discord channel id etc whatvs next semester
                });
            }

            var sessionTime = moment(weekStart);
            sessionTime.day(2); //Tuesday
            sessionTime.hour(13);
            week.sessions.push({
                name:"Lecture",
                time:sessionTime,
                duration:2,
                room:"Lecture Room"
            });


            week.colspan = week.sessions.length;
            res.locals.weeks.push(week);

            //add on one week
            weekStart = moment(weekStart);
            weekStart.add(7, 'days');
            //semester break, add on another
            if (w == 7)
                weekStart.add(7, 'days');
        }
    }
    else if (req.guild.id == config.KIT308_S2_2021_SERVER)
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
                    time:sessionTime,
                    duration:2,
                    room:"Tutorial Main Room" //should be discord channel id etc whatvs next semester
                });

                var sessionTime = moment(weekStart);
                sessionTime.day(4); //Thursday
                sessionTime.hour(14);
                week.sessions.push({
                    name:"Workshop",
                    time:sessionTime,
                    duration:2,
                    room:"Tutorial Main Room" //should be discord channel id etc whatvs next semester
                });
            }

            var sessionTime = moment(weekStart);
            sessionTime.day(1); //Monday
            sessionTime.hour(13);
            week.sessions.push({
                name:"Lecture",
                time:sessionTime,
                duration:2,
                room:"Lecture Room"
            });
             
            var sessionTime = moment(weekStart);
            sessionTime.day(3); //Wednesday
            sessionTime.hour(15);
            week.sessions.push({
                name:"Lecture",
                time:sessionTime,
                duration:2,
                room:"Lecture Room"
            });


            week.colspan = week.sessions.length;
            res.locals.weeks.push(week);

            //add on one week
            weekStart = moment(weekStart);
            weekStart.add(7, 'days');
            //semester break, add on another
            if (w == 7)
                weekStart.add(7, 'days');
        }
    }

    //cache some maths (TODO: Sort too?)
    res.locals.weeks.forEach(week => {
        week.sessions.forEach(session => {
            var time = moment(session.time);
            var start = moment(time);
            var end = moment(time);
            session.startTimestamp = start.subtract(earlyTime, "minutes");
            session.endTimestamp = end.add(session.duration, "hours");
        });
    });

    res.locals.checkAttendance = function(student, session)
    {
        var complete = false;
        var data = null;
        for (var i in req.attendanceData)
        {
            var row = req.attendanceData[i];
            if (row.memberID == student.discordID) //AND check room? shouldn't matter
            {
                var time = moment(row.timestamp);
                var leftTime = moment(row.leftTimestamp);
                /*if (student.username == "lfwells" && session == res.locals.weeks[0].sessions[0])
                {
                    console.log(row.timestamp, time, session.startTimestamp, session.endTimestamp, time.isBetween(session.startTimestamp, session.endTimestamp));
                }*/
                if (time.isBetween(session.startTimestamp, session.endTimestamp) || leftTime.isBetween(session.startTimestamp, session.endTimestamp)) 
                {
                    complete = true;
                    data = row;
                    break;
                }
            }
        }
        //TODO: any info about the row?, maybe in title
        return '<td title="'+session.name+'" class="pageResult '+(complete ? "complete" : "not_complete")+'">&nbsp;</td>';
    };
    next();
}

export async function displayAttendance(req, res, next) 
{
    res.render("attendance");
    next()
}