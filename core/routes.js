import { downloadResource, removeQuestionMark } from "./utils.js";

import * as guild from "../guild/guild.js";
import { loadClassList } from "../core/classList.js";

import * as guild_routes from '../guild/routes.js';
import * as award_routes from '../awards/routes.js';
import * as analytics_routes from '../analytics/routes.js';
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
    app.get("/guild/:guildID/", 
                    guild.load(), 
                    guild.loadLectureChannel(false), 
                    guild.loadAwardChannel(false), 
                    guild.loadOffTopicChannel(false), 
                    guild_routes.guildHome);

    //awards
    app.get("/guild/:guildID/namesTest/", guild.load(), guild.loadAwardChannel(true), award_routes.namesTest); 
    app.get("/guild/:guildID/namesBackup/", guild.load(), guild.loadAwardChannel(true),award_routes.namesBackup); 
    app.get("/guild/:guildID/awardsList/", guild.load(), guild.loadAwardChannel(true),award_routes.getAwardsList); 
    app.get("/guild/:guildID/awards/", 
                    guild.load(), 
                    loadClassList, 
                    guild.loadLectureChannel(true), 
                    guild.loadAwardChannel(true), 
                    guild.loadOffTopicChannel(true), 
                    award_routes.getAwardsData, 
                    award_routes.displayAwards); 
    app.get("/guild/:guildID/awards/giveAward", 
                    guild.load(), 
                    guild.loadLectureChannel(true), 
                    guild.loadAwardChannel(true), 
                    guild.loadOffTopicChannel(true), 
                    award_routes.getGiveAward); 
    app.get("/guild/:guildID/leaderboard/", guild.load(), loadClassList, guild.loadAwardChannel(true),award_routes.leaderboard); 
    app.get("/guild/:guildID/leaderboard/obs", guild.load(), loadClassList, guild.loadAwardChannel(true),award_routes.leaderboardOBS); 

    //attendance
    app.get("/guild/:guildID/attendance/", guild.load(), loadClassList, attendance_routes.getAttendanceData, attendance_routes.displayAttendance); 
    app.get("/guild/:guildID/attendanceOld/", guild.load(), attendance_routes.getAttendanceDataOld, attendance_routes.displayAttendanceOld); 
    app.get("/guild/:guildID/attendanceOld/csv", guild.load(), attendance_routes.getAttendanceDataOld, downloadResource("attendance.csv")); 

    //analytics
    app.get("/guild/:guildID/analytics/", guild.load(), analytics_routes.getStatsData, analytics_routes.displayStats); 
    app.get("/guild/:guildID/analytics/week", guild.load(), analytics_routes.getStatsDataWeek, analytics_routes.displayStats); 
    
    app.get("/guild/:guildID/analytics/obs", guild.load(), analytics_routes.obs); 
    app.get("/guild/:guildID/analytics/obs/allTime", guild.load(), analytics_routes.getStatsDataOBS, analytics_routes.obsAllTime); 
    app.get("/guild/:guildID/analytics/obs/week", guild.load(), analytics_routes.getStatsDataWeekOBS, analytics_routes.obsStatsWeek); 

    //progress
    app.get("/guild/:guildID/progress/", guild.load(), loadClassList, attendance_routes.getProgressData, attendance_routes.displayProgress);
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
