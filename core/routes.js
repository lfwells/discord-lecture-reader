import { downloadResource, removeQuestionMark } from "./utils.js";

import * as guild from "../guild/guild.js";
import { loadClassList } from "../core/classList.js";

import * as guild_routes from '../guild/routes.js';
import * as award_routes from '../awards/routes.js';
import * as attendance_routes from '../attendance/routes.js';
import * as lecture_text_routes from '../lecture_text/routes.js';
import * as poll_routes from '../polls/routes.js';
import * as scheduled_poll_routes from '../scheduled_polls/routes.js';

//TODO: decided i hate this appraoch, we need an init_routes for each section instead
export default function(app)
{
    //home page (select guild)
    app.get("/", guild_routes.guildList);

    //guild home page (dashboard)
    app.get("/guild/:guildID/", guild.load(), guild.loadLectureChannel(false), guild.loadAwardChannel(false), guild_routes.guildHome);

    //awards
    app.get("/guild/:guildID/namesTest/", guild.load(), guild.loadAwardChannel(true), award_routes.namesTest); 
    app.get("/guild/:guildID/namesBackup/", guild.load(), guild.loadAwardChannel(true),award_routes.namesBackup); 
    app.get("/guild/:guildID/awardsList/", guild.load(), guild.loadAwardChannel(true),award_routes.getAwardsList); 

    //attendance
    app.get("/guild/:guildID/attendance/", guild.load(), attendance_routes.getAttendanceData, attendance_routes.displayAttendance); 
    app.get("/guild/:guildID/attendance/csv", guild.load(), attendance_routes.getAttendanceData, downloadResource("attendance.csv")); 

    app.get("/guild/:guildID/progress/", guild.load(), loadClassList, attendance_routes.getProgressData, attendance_routes.displayProgress); 
    app.get("/guild/:guildID/progress/csv", guild.load(), loadClassList, attendance_routes.getProgressData, downloadResource("progress.csv"));
    app.get("/guild/:guildID/progressOld/", guild.load(), attendance_routes.getProgressDataOld, attendance_routes.displayProgressOld); 
    app.get("/guild/:guildID/progressOld/csv", guild.load(), attendance_routes.getProgressDataOld, downloadResource("progress.csv"));
    app.get("/guild/:guildID/recordProgress/", guild.load(), attendance_routes.recordProgress); 
    app.post("/guild/:guildID/recordSectionProgress/", guild.load(), attendance_routes.recordSectionProgress); 
    app.get("/guild/:guildID/recordSectionProgress/", guild.load(), attendance_routes.getSectionProgress); 

    //lecture text
    app.get("/guild/:guildID/text/", guild.load(), lecture_text_routes.obs); //this is the obs page
    app.get("/guild/:guildID/text/input", guild.load(), guild.loadLectureChannel(false), lecture_text_routes.load, lecture_text_routes.inputGet); //this is the page for triggering text 
    app.post("/guild/:guildID/text/input", guild.load(), guild.loadLectureChannel(false), lecture_text_routes.load, lecture_text_routes.inputPost);
    app.get("/guild/:guildID/text/latest", guild.load(), lecture_text_routes.getLatest); //the query to see the latest
    app.get("/guild/:guildID/text/:style/", guild.load(), lecture_text_routes.render); //grabbed with ajax on demand

    //polls    
    app.get("/guild/:guildID/poll/", guild.load(), guild.loadLectureChannel(true), poll_routes.load, poll_routes.obs); //obs page
    app.get("/guild/:guildID/poll/data/", guild.load(), guild.loadLectureChannel(true), poll_routes.load, poll_routes.pollData); //json data for obs page
    app.get("/guild/:guildID/poll/:pollText/", removeQuestionMark, guild.load(), guild.loadLectureChannel(true), poll_routes.postPoll);  //send poll (uses get, so that we can do the cool powerpoint links)
    app.get("/guild/:guildID/clearpoll/", guild.load(), guild.loadLectureChannel(false), poll_routes.clearPoll);

    //scheduled polls
    app.get("/guild/:guildID/pollSchedule", guild.load(), scheduled_poll_routes.load, scheduled_poll_routes.getPollSchedule);
    app.post("/guild/:guildID/pollSchedule", guild.load(), scheduled_poll_routes.load, scheduled_poll_routes.postPollSchedule);
        
}
