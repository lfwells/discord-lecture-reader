import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { getGuildProperty, GUILD_CACHE, loadGuildProperty, setGuildProperty } from "./guild/guild.js";
import { sleep } from "./core/utils.js";
import { getAttendanceData } from "./attendance/routes.js";

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

    console.log("init google sheets");
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
            valueInputOption:'USER_ENTERED', resource:resource2});

    res.render("sheets");
}

export async function update_sheet_contents(req,res,next)
{
    //stream the content thru
    //should have used a websocket or something but meh
    //just call res.write after this, and it will stream to browser
    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff'});

    var spreadsheetId = res.locals.googleSheetID;

    /*
    for (let index = 0; index < 10; index++) {
        res.write(""+index);
        await sleep(1000);
    }*/

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
    await getAttendanceData(req,res);

    var sheetData = [];
    var row = [];

    var students = res.locals.classList;
    var studentCount = students.length;
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

    students.forEach(function(student)
    { 
        res.write("\tStudent "+student.discordName+"\n");
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