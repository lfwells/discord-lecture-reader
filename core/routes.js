import { downloadResource } from "./utils.js";

import * as award_routes from '../awards/routes.js';
import * as attendance_routes from '../attendance/routes.js';
import * as lecture_text_routes from '../lecture_text/routes.js';
import * as poll_routes from '../polls/routes.js';
import * as scheduled_poll_routes from '../scheduled_polls/routes.js';

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

    //polls    
    app.get("/guild/:guildID/poll/", loadGuild(), loadLectureChannel(true), poll_routes.load, poll_routes.obs); //obs page
    app.get("/guild/:guildID/poll/data/", loadGuild(), loadLectureChannel(true), poll_routes.load, poll_routes.pollData); //json data for obs page
    app.get("/guild/:guildID/poll/:pollText/", removeQuestionMark, loadGuild(), loadLectureChannel(true), poll_routes.postPoll);  //send poll (uses get, so that we can do the cool powerpoint links)
    app.get("/guild/:guildID/clearpoll/", loadGuild(), loadLectureChannel(false), poll_routes.clearPoll);

    //scheduled polls
    app.get("/guild/:guildID/pollSchedule", loadGuild(), scheduled_poll_routes.load, scheduled_poll_routes.getPollSchedule);
    app.post("/guild/:guildID/pollSchedule", loadGuild(), scheduled_poll_routes.load, scheduled_poll_routes.postPollSchedule);
        
}
