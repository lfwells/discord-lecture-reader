import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { getGuildProperty, GUILD_CACHE, loadGuildProperty, setGuildProperty } from "./guild/guild.js";
import { getAttendanceData } from "./attendance/routes.js";
import { getStats } from "./analytics/analytics.js";
import { getAwardListFullData } from "./awards/awards.js";
import moment from "moment";
import { beginStreamingRes } from "./core/server.js";

var sheets;
var drive;
export async function init_google()
{
    // If modifying these scopes, delete token.json.
    const SCOPES = [
        'https://spreadsheets.google.com/feeds',
        'https://www.googleapis.com/auth/drive'
    ];
    const auth = new GoogleAuth({
        keyFile: 'carers-care-service-account.json',
        scopes: SCOPES
    });

    // set auth as a global default
    google.options({
        auth: auth
    });
    sheets = google.sheets({version: 'v4', auth});
    drive = google.drive('v3');

    //console.log("init google sheets");
}

export async function init_sheet_for_guild(guild)
{
    var currentSpreadsheetId = await getGuildProperty("googleSheetID", guild, null);
    if (currentSpreadsheetId == null)
    {
        const resource = {
            properties: {
                title:guild.name,
            },
        };
        var spreadsheet = await sheets.spreadsheets.create({
            resource,
            fields: 'spreadsheetId',
        });

        var spreadsheetId = spreadsheet.data.spreadsheetId;
        await setGuildProperty(guild, "googleSheetID", spreadsheetId);
        GUILD_CACHE[guild.id].googleSheet = spreadsheet;

        var permission = 
        {
            'type': 'user',
            'role': 'writer',
            'emailAddress': 'mickayrex@gmail.com'
        };

        await drive.permissions.create({
            resource: permission,
            fileId: spreadsheetId,
            fields: 'id',
        });

        permission = 
        {
            'type': 'user',
            'role': 'writer',
            'emailAddress': 'Ian.J.Lewis@gmail.com'
        };

        await drive.permissions.create({
            resource: permission,
            fileId: spreadsheetId,
            fields: 'id',
        });
    }
}


export async function sheets_test(req,res,next)
{
    /*
    var spreadsheetId = res.locals.googleSheetID;
          //test out some writing
          let values = [
            [
              "a", "b","c"
            ],
            // Additional rows ...
          ];
          const resource2 = {
            values,
          };
          var range = "A1";
          var writeResult = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption:'USER_ENTERED', resource:resource2});*/

    res.render("sheets");
}

export async function update_sheet_contents(req,res,next)
{
    beginStreamingRes(res);

    var spreadsheetId = res.locals.googleSheetID;

    /*
    for (let index = 0; index < 10; index++) {
        res.write(""+index);
        await sleep(1000);
    }*/

    
    res.write("Loading Attendance Data...");
    await getAttendanceData(req,res);
    res.write(" DONE\n");

    res.write("Loading Post Data...");
    var statsData = await getStats(req.guild);
    res.write(" DONE\n");

    res.write("Loading Award Data...");
    await getAwardListFullData(req.guild, res.locals.classList);
    res.write(" DONE\n");

    res.write("\n");

    //class list
    res.write("Writing Class Summary Sheet...\n");
    await write_sheet(spreadsheetId, "class_summary", await write_class_summary(req, res, statsData));
    res.write("DONE Class Summary Sheet...\n\n");

    //attendance
    res.write("Writing Attendance Sheet...\n");
    await write_sheet(spreadsheetId, "attendance", await write_attendance(req, res));
    res.write("DONE Writing Attendance Sheet...\n\n");

    res.end();
}
async function write_sheet(spreadsheetId, sheet, values)
{
    try
    {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
                requestBody: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: sheet,
                            }
                        }
                    }]
                }
        });
    } catch (error) {
        //sheet already existed. oh no...
    }
    //anyway...

    var range = sheet+"!A1";
    var writeResult = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption:'USER_ENTERED', resource:{values}
    });
    return writeResult;
}
async function write_attendance(req, res)
{
    var sheetData = [];
    var row = [];

    var students = res.locals.classList;
    var sessionsCount = 0;
    /*
    res.locals.weeks.forEach(function(week)
    { 
        row.push(week.name +" - "+ week.weekStart.format("DD MMMM YYYY"));
       
    });*/
    
    row.push("Student");
    res.locals.weeks.forEach(function(week)
    { 
        
        week.sessions.forEach(function(session)
        {
            row.push(session.name +" - "+ session.time.format("ddd Do HH:mm"));
            sessionsCount++;
        });
    });
    sheetData.push(row); row = [];

    var weekSummary = [];
    res.locals.weeks.forEach(function(week, weekIndex)
    { 
        var sessionSummary = [];
        week.sessions.forEach(function(session)
        {
            sessionSummary.push(0);
        });
        weekSummary.push(sessionSummary);
    });

    var i = 0;
    res.write("\t");
    students.forEach(function(student)
    { 
        res.write((i++)+",");
        //res.write("\tStudent "+student.discordName+"\n");
        row.push(student.discordName);
        
        var studentSessionCount = 0;
        res.locals.weeks.forEach(function(week, weekIndex)
        { 
            week.sessions.forEach(function(session, sessionIndex)
            {
                var sessionData = res.locals.checkAttendance(student, session, true); //plainText = true
                if (sessionData.indexOf("x") != -1)
                {
                    weekSummary[weekIndex][sessionIndex]++;
                    studentSessionCount++; 
                }
                row.push(sessionData);
            });
        });
        row.push(Math.round(((studentSessionCount / sessionsCount)*100)*10)/10);
        row.push(studentSessionCount);

        sheetData.push(row); row = [];
    });
    res.write("\n");

    row.push("TOTAL:");
    weekSummary.forEach(function(sessionSummary)
    { 
        sessionSummary.forEach(function(sessionCount)
        {
            row.push(sessionCount);
        });
    });
    sheetData.push(row); row = [];

    return sheetData;
}
async function write_class_summary(req, res, statsData)
{
    var sheetData = [];
    var row = [];

    var students = res.locals.classList;
    
    //headers
    row.push("Student");
    row.push("Post Count");
    row.push("Replies");
    row.push("Images");
    row.push("Links");
    row.push("ThreadStarts");
    //row.push("Command Usages");
    row.push("Off Topic %");
    row.push("Achievements");
    row.push("Active Days");
    row.push("Best Active Days Streak");
    sheetData.push(row); row = [];

    var i = 0;
    res.write("\t");
    students.forEach(function(student)
    { 
        //res.write("\tStudent "+student.discordName+"\n");
        res.write((i++)+",");
        row.push(student.discordName);
        var studentData = statsData.membersByID[student.discordID];
        //console.log(studentData);

        //row.push("Post Count");
        row.push(studentData == null ? 0 : studentData.posts.length);
        
        //row.push("Replies");
        row.push(studentData == null ? 0 : studentData.posts.filter(p => p.isReply).length);

        //row.push("Images");
        row.push(studentData == null ? 0 : studentData.posts.filter(p => p.isImage).length);
        
        //row.push("Links");
        row.push(studentData == null ? 0 : studentData.posts.filter(p => p.isLink).length);

        //row.push("ThreadStarts");
        row.push(studentData == null ? 0 : studentData.posts.filter(p => p.isThreadStart).length);

        //row.push("Command Usages");
        //row.push(studentData == null ? 0 : studentData.posts.filter(p => p.isCommand).length);

        //row.push("Off Topic %");
        row.push(studentData == null ? 0 : studentData.posts.filter(p => p.isOffTopic).length / studentData.posts.length);

        //row.push("Achievements");
        row.push((student.awards == null) ? 0 : student.awards.length);
        
        //row.push("Active Days");
        var activeDays = studentData == null ? new Set() : new Set(studentData.posts.map(p => moment(p.timestamp).startOf('day').valueOf()));
        row.push(activeDays.size);
        
        //row.push("Best Active Day Streak");
        var bestStreak = 0;
        var currentStreak = 0;
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
                currentStreak = 0;
            }
            prevItem = element;
        }
        row.push(bestStreak);
        
        sheetData.push(row); row = [];
    });
    res.write("\n");

    return sheetData;
}