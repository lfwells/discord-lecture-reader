import * as award_routes from '../awards/routes.js';
import * as attendance_routes from '../attendance/routes.js';
export default function(app)
{
    //awards
    app.get("/namesTest/", award_routes.namesTest); 
    app.get("/namesBackup/", award_routes.namesBackup); 

    //attendance
    app.get("/guild/:guildID/attendance/", loadGuild(), attendance_routes.getAttendanceData, attendance_routes.displayAttendance); 
}
