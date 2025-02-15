import { downloadResource, removeQuestionMark } from "./utils.js";

import * as guild from "../guild/guild.js";
import { filterButtons, loadClassList, loadClassListWithRemoved } from "../classList/classList.js";
import * as commands from "../guild/commands.js";

import * as login_routes from '../core/login.js';
import * as mylo_routes from '../mylo/routes.js';
import * as guild_routes from '../guild/routes.js';
import * as award_routes from '../awards/routes.js';
import * as analytics_routes from '../analytics/routes.js';
import * as analytics_functions from '../analytics/analytics.js';
import * as attendance_routes from '../attendance/routes.js';
import * as lecture_text_routes from '../lecture_text/routes.js';
import * as poll_routes from '../polls/routes.js';
import * as scheduled_poll_routes from '../scheduled_polls/routes.js';
import * as invite_routes from "../invite/routes.js";
import * as guide_routes from "../guide/routes.js";
import * as cloner_routes from "../cloner/routes.js";
import * as classList_routes from "../classList/routes.js";
import { Router } from "express";
import * as sheet_routes from "../analytics/sheets.js";
import { schedule_test } from "../attendance/scheduled_events.js";
import { renderEJS, restart } from "./server.js";
import * as pptx_routes from "../pptx_parse/pptx.js";
import { profileRouter } from "../profile/router.js";

//TODO: decided i hate this appraoch, we need an init_routes for each section instead
export default function(app)
{
    app.use(function(req, res, next){
        res.path = req.path;
        res.locals.path = req.path;
        next();
    });
    
    app.use(commands.loadCommands);

    app.use(defaultRouter());
    app.use("/guild/:guildID", guildRouter());
    app.use("/profile/:discordID", profileRouter());
}

function defaultRouter() 
{
    var router = Router({ mergeParams: true });

    //home page (select guild)
    router.get("/", guild_routes.loadGuildList, guild_routes.guildList);
    router.get("/createFromTemplate", renderEJS("createFromTemplate"));
    router.get("/serverAdded", guild_routes.serverAddedRedirect);
    router.get("/serverAddedInGuide", guild_routes.serverAddedInGuideRedirect);

    router.get("/toggleFavouriteGuild", guild_routes.toggleFavouriteGuildRoute);

    router.get("/guide", guild_routes.loadGuildList, guide_routes.guide); 
    router.get("/guide/:page", guild_routes.loadGuildList, guide_routes.guidePage); 
    router.get("/guide/downloadMyLOGuide", guide_routes.downloadMyLOGuideFile);

    //login
    router.get("/login", login_routes.loginPage);
    router.get("/loginComplete", login_routes.loginComplete)

    router.get("/logout", login_routes.logout);

    //restart
    router.get("/restart", basic_render("restart"));
    router.post("/restart", restart);

    //mylo
    router.get("/myloConnectCompleteDiscord", mylo_routes.discordConnectComplete); 
    router.get("/myloConnectComplete", mylo_routes.myLOConnectComplete);  
    router.get("/myloDisconnect/:interactionID/:guildID", mylo_routes.myLODisconnect); 

    return router;
}

function guildRouter() 
{
    var router = Router({ mergeParams: true });

    router.use(guild.load());

    //middleware check that this is one of "our" servers 
    router.use(guild.checkGuildAdmin);

    router.use(guild.loadGuildProperty("totalPosts"));

    router.use(guild.loadGuildProperty("botName"));
    router.use(guild.loadGuildProperty("adminRoleID"));
    router.use(guild.loadGuildProperty("studentRoleID"));
    router.use(guild.loadGuildProperty("ruleChannelID"));
    router.use(guild.loadGuildProperty("lectureChannelID"));
    router.use(guild.loadGuildProperty("awardChannelID"));
    router.use(guild.loadGuildProperty("awardPopChannelID"));
    router.use(guild.loadGuildProperty("offTopicChannelID"));
    router.use(guild.loadGuildProperty("todoChannelID"));
    router.use(guild.loadGuildProperty("todoEmoji"));
    router.use(guild.loadGuildProperty("offTopicCategoryID"));
    router.use(guild.loadGuildProperty("myLOOrgID"));
    router.use(guild.loadGuildProperty("googleSheetID"));
    
    router.use(guild.loadGuildProperty("feature_achievements"));
    router.use(guild.loadGuildProperty("feature_attendance"));
    router.use(guild.loadGuildProperty("feature_analytics"));
    router.use(guild.loadGuildProperty("feature_invites"));
    router.use(guild.loadGuildProperty("feature_obs"));
    router.use(guild.loadGuildProperty("feature_todos"));
    router.use(guild.loadGuildProperty("feature_dm_intro"));
    router.use(guild.loadGuildProperty("feature_sessions"));
    router.use(guild.loadGuildProperty("feature_experimental"));
    router.use(guild.loadGuildProperty("feature_showOnlineMemberCount"));
    router.use(guild.loadGuildProperty("feature_showMemberCount"));
    router.use(guild.loadGuildProperty("feature_showPostCount"));
    router.use(guild.loadGuildProperty("feature_showNextSession"));
    router.use(guild.loadGuildProperty("feature_showCurrentWeek"));
    router.use(guild.loadGuildProperty("feature_mylo"));

    router.use(guild.loadGuildProperty("awardsDefaultRequiredNominations"));
    router.use(guild.loadGuildProperty("awardsDefaultAutoPop"));
    router.use(guild.loadGuildProperty("awardsDefaultCanNominate"));

    router.use(guild.loadGuildProperty("adminRoleID")), 

    router.use(guild.loadAllGuildProperties);

    //TODO: this filterButtons could be expensive, I didn't realise!
    router.use(filterButtons);

    router.get("/serverAdded", guild_routes.serverAdded);
    router.get("/guide", guide_routes.guide); 
    router.get("/guide/:page", guide_routes.guidePage); 
    router.get("/guide/downloadMyLOGuide", guide_routes.downloadMyLOGuideFile);
    router.post("/guide/postRules", guide_routes.postRules); 
    router.post("/guide/configureWelcomeScreen", guide_routes.configureWelcomeScreen);
    router.post("/guide/postAwards", guide_routes.postAwards); 


    //guild home page (dashboard)
    router.get("/", guild_routes.guildHome);
    router.post("/", guild_routes.guildHomePost, guild_routes.guildHome);
                    
    router.get("/deleteCategory/:categoryID", guild_routes.deleteCategory);

    router.get("/clone", guild_routes.loadGuildList, cloner_routes.clone_select);
    router.post("/clone", cloner_routes.clone);

    router.get("/obs/", basic_render("obs")); 

    router.get("/features/", guild_routes.guildFeatures); 
    router.post("/setFeature/", guild_routes.setFeature); 
    router.post("/setGuildProperty/", guild_routes.setGuildProperty); 

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
    router.get("/awards/editor", loadChannels, award_routes.editor); 
    router.post("/awards/editor", loadChannels, award_routes.editor_post); 
    router.post("/awards/editor/import", award_routes.importAchievments, award_routes.editor); 
    router.get("/awards/noms", loadClassList, loadChannels, award_routes.noms); 
                    
    router.get("/leaderboard/", loadClassList, award_routes.leaderboard); 
    router.get("/leaderboard/obs", loadClassList, award_routes.leaderboardOBS); 

    //attendance
    router.get("/attendance/", loadClassList, attendance_routes.getAttendanceData, attendance_routes.displayAttendance); 
    router.get("/attendanceOld/", attendance_routes.getAttendanceDataOld, attendance_routes.displayAttendanceOld); 
    router.get("/attendanceOld/csv",  attendance_routes.getAttendanceDataOld, downloadResource("attendance.csv")); 

    //analytics
    router.get("/analytics/", analytics_functions.getStatsCounts(), analytics_routes.displayStats); 
    router.get("/analytics/week", analytics_routes.getStatsDataWeek, analytics_routes.displayStats); 
    
    router.get("/analytics/obs", analytics_routes.obs); 
    router.get("/analytics/obs/allTime", analytics_routes.getStatsDataOBS, analytics_routes.obsAllTime); 
    router.get("/analytics/obs/week", analytics_routes.getStatsDataWeekOBS, analytics_routes.obsStatsWeek); 

    router.get("/analytics/history", analytics_routes.getHistoricalData); 
    router.get("/analytics/timeGraph", analytics_routes.timeGraph); 
    router.post("/analytics/timeGraph", analytics_routes.timeGraph); 

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
    router.get("/pollRoboLindsWebInterface/:pollText/", removeQuestionMark, guild.loadGuildProperty("lectureChannelID", true), poll_routes.postPollRoboLindsWebInterface);  //send poll (uses get, so that we can do the cool powerpoint links)
    router.get("/clearpoll/", guild.loadGuildProperty("lectureChannelID", false), poll_routes.clearPoll);

    //scheduled polls
    router.get("/pollSchedule", scheduled_poll_routes.load, scheduled_poll_routes.getPollSchedule);
    router.post("/pollSchedule",  scheduled_poll_routes.load, scheduled_poll_routes.postPollSchedule);

    //invites
    router.get("/invites", invite_routes.inviteList);
    router.post("/invites", invite_routes.assignRole, invite_routes.inviteList);
    router.get("/invites/generate", invite_routes.generateInvite, invite_routes.inviteList);

    //sheets
    router.get("/sheets", sheet_routes.sheetsIndex); 
    router.get("/sheets/update", loadClassListWithRemoved, sheet_routes.update_sheet_contents); 
    //router.get("/sheets/addSheetAccess", sheet_routes.addSheetAccess); 
      
       
    //scheduled_events
    router.get("/schedule_test", schedule_test);
    router.get("/sessions", loadChannels, attendance_routes.sessionPage);
    router.post("/sessions", loadChannels, attendance_routes.sessionPagePost);
    router.get("/sessions/deleteAll", loadChannels, attendance_routes.deleteAllEvents);
    router.get("/sessions/obs", loadChannels, attendance_routes.nextSessionOBS);

    //pptx
    router.get("/pptx", pptx_routes.parse_pptx_page); 
    router.post("/pptx", pptx_routes.parse_pptx_page); 

    //clone channel    
    router.get("/clone_channel", guild_routes.loadGuildList, cloner_routes.clone_channel_select);
    router.post("/clone_channel", cloner_routes.clone_channel);
    router.post("/clone_channel_confirm", cloner_routes.clone_channel);

    //classlist
    router.get("/classList", loadClassList, classList_routes.displayClassList);
    router.post("/classList", loadClassList, classList_routes.uploadMyLOCSV, classList_routes.displayClassList); 
    router.get("/classList/student/:discordID", loadClassList, classList_routes.displayStudent);

    //groups
    router.get("/classList/groups", loadClassList, classList_routes.displayGroups);
    router.post("/classList/groups", loadClassList, classList_routes.uploadMyLOGroupsCSV, classList_routes.displayGroups); 
    router.post("/classList/groups/create", loadClassList, classList_routes.createGroup); 

    //mylo
    router.post("/mylo/data", mylo_routes.recieveMyLOData);
    router.get("/mylo/content", mylo_routes.displayMyLOContent);
    router.get("/mylo/content/links", mylo_routes.createMyLOLinks);
    router.post("/mylo/content/links", mylo_routes.createMyLOLinksPost);

    return router;
}

async function loadChannels(req,res,next)
{

    var channels = [];
    var textChannels = [];

    var categoryChannels = req.guild.channels.cache.filter(channel => channel.type === "GUILD_CATEGORY").sort((a,b) => a.position - b.position);
    categoryChannels.forEach(cat => {
        var sortedChannels = cat.children.sort((a,b) => a.position - b.position);
        var filteredVoiceChannels = sortedChannels.filter((v) => v.type == "GUILD_VOICE");
        var filteredTextChannels = sortedChannels.filter((v) => v.type == "GUILD_TEXT");
        
        channels.push(...filteredVoiceChannels.map((v,i) => {
            var result = v;
            result.category = cat.name;
            return result;
        }));
        textChannels.push(...filteredTextChannels.map((v,i) => {
            var result = v;
            result.category = cat.name;
            return result;
        }));
    });


    channels.unshift({
        id: "",
        name: "Select Voice Channel -",
        category: ""
    });
    textChannels.unshift({
        id: "",
        name: "Select Text Channel -",
        category: ""
    });

    req.channels = channels;
    req.textChannels = textChannels;

    next();
}

//this will just render out a page for us
function basic_render(page, data)
{
    return (req,res,next) =>
    {
        if (data == undefined) data = {}
        data.query = req.query;
        res.render(page, data);
    };
}

