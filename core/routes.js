import { downloadResource } from "./utils.js";

import * as award_routes from '../awards/routes.js';
import * as attendance_routes from '../attendance/routes.js';
import * as lecture_text_routes from '../lecture_text/routes.js';

export default function(app)
{
    //awards
    app.get("/namesTest/", award_routes.namesTest); 
    app.get("/namesBackup/", award_routes.namesBackup); 

    //attendance
    app.get("/guild/:guildID/attendance/", loadGuild(), attendance_routes.getAttendanceData, attendance_routes.displayAttendance); 
    app.get("/guild/:guildID/attendance/csv", loadGuild(), attendance_routes.getAttendanceData, downloadResource("attendance.csv")); 

    //lecture text
    app.get("/guild/:guildID/text/", loadGuild(), obs); //this is the obs page
    app.get("/guild/:guildID/text/input", loadGuild(), loadLectureChannel(false), lecture_text_routes.load, lecture_text_routes.inputGet); //this is the page for triggering text 
    app.post("/guild/:guildID/text/input", loadGuild(), loadLectureChannel(false), lecture_text_routes.load, lecture_text_routes.inputPost);
    app.get("/guild/:guildID/text/latest", loadGuild(), lecture_text_routes.getLatest); //the query to see the latest
    app.get("/guild/:guildID/text/:style/", loadGuild(), lecture_text_routes.render); //grabbed with ajax on demand
}
