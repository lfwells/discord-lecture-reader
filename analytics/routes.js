import moment from "moment";
import { getAttendanceData } from "../attendance/routes.js";
import { postWasForSession } from "../attendance/sessions.js";
import { getUserFilterPredicate, getPostsFilterPredicate } from "../core/classList.js";
import { KIT109_S2_2021_SERVER, KIT207_S2_2021_SERVER, KIT308_S2_2021_SERVER } from "../core/config.js";
import { getStats, getStatsWeek, predicateExcludeAdmin, loadHistoricalData, getPostsData, loadTimeSeries, loadPostsPerDay, loadPostsPerHour, loadPostsPerSession, loadAttendanceSession } from "./analytics.js";
import fakeData from "./fakeData.js";


export async function getStatsData(req,res,next)
{
    res.locals.statsData = await getStats(req.guild, await getUserFilterPredicate(req), await getPostsFilterPredicate(req));
    next();
}
export async function getStatsDataWeek(req,res,next)
{
    res.locals.statsData = await getStatsWeek(req.guild, await getUserFilterPredicate(req), await getPostsFilterPredicate(req));
    next();
}
export async function getStatsDataOBS(req,res,next)
{
    res.locals.statsData = await getStats(req.guild, predicateExcludeAdmin);
    next();
}
export async function getStatsDataWeekOBS(req,res,next)
{
    res.locals.statsData = await getStatsWeek(req.guild, predicateExcludeAdmin);
    next();
}

export async function displayStats(req, res, next) 
{
    await res.render("stats");
    next()
}

export async function obs(req, res, next)
{
    await res.render("stats_obs");
    next();
}
export async function obsAllTime(req, res, next)
{
    await res.render("stats_obs_allTime");   
    next();
}
export async function obsStatsWeek(req, res, next)
{
    await res.render("stats_obs_week");
    next();
}

export async function getHistoricalData(req, res, next)
{
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
    var historicalData = await loadHistoricalData(res, req.guild);
    //await res.json(historicalData.length);
    console.log("historicalData.length", historicalData.length);
    res.write("historicalData.length = "+historicalData.length);
    res.end();
}

export async function timeGraph(req, res, next)
{
    console.log("loading posts for time graph...");
 
    var  rawStatsData = await getPostsData(req.guild, await getUserFilterPredicate(req), await getPostsFilterPredicate(req));
    
    console.log("operating on", rawStatsData.length, "posts");

    var postsOverTime = await loadTimeSeries(rawStatsData);
    var postsOverTimeWeekly = await loadTimeSeries(rawStatsData, true);//weekly
    
    var postsPerDay = await loadPostsPerDay(rawStatsData);
    var postsPerHour = await loadPostsPerHour(rawStatsData);
    var postsPerSession = await loadPostsPerSession(rawStatsData, req.guild);
    var postsPerSessionPlusOutOfSession = await loadPostsPerSession(rawStatsData, req.guild, true);

    await getAttendanceData(req,res);
    var attendancePerSession = await loadAttendanceSession(req.attendanceData, req.guild, false, await getUserFilterPredicate(req));
    var attendancePerSessionPlusOutOfSession = await loadAttendanceSession(req.attendanceData, req.guild, true, await getUserFilterPredicate(req));


       
    await res.render("timeGraph", {
        postData:rawStatsData,
        graphs: {
            "Posts Over Time": postsOverTime,
            "Posts Over Time (Weekly)": postsOverTimeWeekly,
            "Posts Per Day": postsPerDay,
            "Posts Per Hour": postsPerHour,
            "Posts Per Session": postsPerSession,
            "Posts Per In/Out Session": postsPerSessionPlusOutOfSession,

            "Attendance Per Session": attendancePerSession,
            "Attendance In/Out Session": attendancePerSessionPlusOutOfSession,
        }
    });
}

