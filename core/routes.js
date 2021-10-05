import { downloadResource, removeQuestionMark } from "./utils.js";

import * as guild from "../guild/guild.js";
import { filterButtons, loadClassList } from "../core/classList.js";

import * as login_routes from '../core/login.js';
import * as guild_routes from '../guild/routes.js';
import * as award_routes from '../awards/routes.js';
import * as analytics_routes from '../analytics/routes.js';
import * as attendance_routes from '../attendance/routes.js';
import * as lecture_text_routes from '../lecture_text/routes.js';
import * as poll_routes from '../polls/routes.js';
import * as scheduled_poll_routes from '../scheduled_polls/routes.js';
import * as invite_routes from "../invite/routes.js";
import { Router } from "express";

//TODO: decided i hate this appraoch, we need an init_routes for each section instead
export default function(app)
{
    app.use(defaultRouter());
    app.use(function(req, res, next){
        res.path = req.path;
        res.locals.path = req.path;
        next();
    });
    app.use("/guild/:guildID", guildRouter());
}

function defaultRouter() 
{
    var router = Router({ mergeParams: true });

    //home page (select guild)
    router.get("/", guild_routes.guildList);

    //login
    router.get("/login", login_routes.loginPage);
    router.get("/loginComplete", login_routes.loginComplete); 

    router.get("/logout", login_routes.logout);

    return router;
}

function guildRouter() 
{
    var router = Router({ mergeParams: true });

    router.use(guild.load());

    //middleware check that this is one of "our" servers 
    router.use(guild.checkGuildAdmin);

    router.use(guild.loadGuildProperty("adminRoleID"));
    router.use(guild.loadGuildProperty("studentRoleID"));
    router.use(guild.loadGuildProperty("lectureChannelID"));
    router.use(guild.loadGuildProperty("awardChannelID"));
    router.use(guild.loadGuildProperty("offTopicChannelID"));

    router.use(filterButtons);

    //guild home page (dashboard)
    router.get("/", 

    guild_routes.guildHome);

                    
    router.get("/obs/", basic_render("obs")); 

    //awards
    router.get("/namesTest/", award_routes.namesTest); 
    router.get("/namesBackup/", award_routes.namesBackup); 
    router.get("/awardsList/", award_routes.getAwardsList); 
    router.get("/awards/", 
                    loadClassList, 
                    award_routes.getAwardsData, 
                    award_routes.displayAwards); 
    router.get("/awards/giveAward", 
                    award_routes.getGiveAward); 
                    
    router.get("/leaderboard/", loadClassList, award_routes.leaderboard); 
    router.get("/leaderboard/obs", loadClassList, award_routes.leaderboardOBS); 

    //attendance
    router.get("/attendance/", loadClassList, attendance_routes.getAttendanceData, attendance_routes.displayAttendance); 
    router.get("/attendanceOld/", attendance_routes.getAttendanceDataOld, attendance_routes.displayAttendanceOld); 
    router.get("/attendanceOld/csv",  attendance_routes.getAttendanceDataOld, downloadResource("attendance.csv")); 

    //analytics
    router.get("/analytics/", analytics_routes.getStatsData, analytics_routes.displayStats); 
    router.get("/analytics/week", analytics_routes.getStatsDataWeek, analytics_routes.displayStats); 
    
    router.get("/analytics/obs", analytics_routes.obs); 
    router.get("/analytics/obs/allTime", analytics_routes.getStatsDataOBS, analytics_routes.obsAllTime); 
    router.get("/analytics/obs/week", analytics_routes.getStatsDataWeekOBS, analytics_routes.obsStatsWeek); 

    router.get("/analytics/history", analytics_routes.getHistoricalData); 
    router.get("/analytics/timeGraph", 
        guild.loadGuildProperty("adminRoleID"),
        analytics_routes.timeGraph); 

    //progress
    router.get("/progress/", loadClassList, attendance_routes.getProgressData, attendance_routes.displayProgress);
    router.get("/progressOld/", attendance_routes.getProgressDataOld, attendance_routes.displayProgressOld); 
    router.get("/progressOld/csv", attendance_routes.getProgressDataOld, downloadResource("progress.csv"));
    router.get("/recordProgress/", attendance_routes.recordProgress); 
    router.post("/recordSectionProgress/", attendance_routes.recordSectionProgress); 
    router.get("/recordSectionProgress/", attendance_routes.getSectionProgress); 
    router.get("/timeline/", loadClassList, attendance_routes.getSectionProgressAll, attendance_routes.getProgressTimelineData, attendance_routes.displayProgressTimeline);

    //lecture text
    router.get("/text/", lecture_text_routes.obs); //this is the obs page
    router.get("/text/input", lecture_text_routes.load, lecture_text_routes.inputGet); //this is the page for triggering text 
    router.post("/text/input", lecture_text_routes.load, lecture_text_routes.inputPost);
    router.get("/text/latest", lecture_text_routes.getLatest); //the query to see the latest
    router.get("/text/:style/", lecture_text_routes.render); //grabbed with ajax on demand

    //polls    
    router.get("/poll/", guild.loadGuildProperty("lectureChannelID", true), poll_routes.load, poll_routes.obs); //obs page
    router.get("/poll/data/", guild.loadGuildProperty("lectureChannelID", true), poll_routes.load, poll_routes.pollData); //json data for obs page
    router.get("/poll/history/", guild.loadGuildProperty("lectureChannelID", true), poll_routes.pollHistory);
    router.get("/poll/:pollText/", removeQuestionMark, guild.loadGuildProperty("lectureChannelID", true), poll_routes.postPoll);  //send poll (uses get, so that we can do the cool powerpoint links)
    router.get("/pollRoboLinds/:pollText/", removeQuestionMark, guild.loadGuildProperty("lectureChannelID", true), poll_routes.postPollRoboLinds);  //send poll (uses get, so that we can do the cool powerpoint links)
    router.get("/clearpoll/", guild.loadGuildProperty("lectureChannelID", false), poll_routes.clearPoll);

    //scheduled polls
    router.get("/pollSchedule", scheduled_poll_routes.load, scheduled_poll_routes.getPollSchedule);
    router.post("/pollSchedule",  scheduled_poll_routes.load, scheduled_poll_routes.postPollSchedule);

    //invites
    router.get("/invites", invite_routes.inviteList);
    router.post("/invites", invite_routes.assignRole, invite_routes.inviteList);
    router.get("/invites/generate", invite_routes.generateInvite, invite_routes.inviteList);
        
    return router;
}

//this will just render out a page for us
function basic_render(page, data)
{
    return (req,res,next) =>
    {
        res.render(page, data);
    };
}