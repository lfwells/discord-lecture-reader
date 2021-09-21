import moment from "moment";
import { getAttendanceData } from "../attendance/routes.js";
import { KIT109_S2_2021_SERVER } from "../core/config.js";
import { getStats, getStatsWeek, predicateExcludeAdmin, loadHistoricalData, getPostsData, loadTimeSeries, loadPostsPerDay, loadPostsPerHour, loadPostsPerSession, loadAttendanceSession } from "./analytics.js";
import fakeData from "./fakeData.js";


export async function getStatsData(req,res,next)
{
    res.locals.statsData = await getStats(req.guild);
    next();
}
export async function getStatsDataWeek(req,res,next)
{
    res.locals.statsData = await getStatsWeek(req.guild);
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
    
    var rawStatsData = fakeData();
    if (req.guild.id != KIT109_S2_2021_SERVER)
    {
        rawStatsData = await getPostsData(req.guild, predicateExcludeAdmin);
    }
    console.log("operating on", rawStatsData.length, "posts");

    var postsOverTime = await loadTimeSeries(rawStatsData);
    var postsPerDay = await loadPostsPerDay(rawStatsData);
    var postsPerHour = await loadPostsPerHour(rawStatsData);
    var postsPerSession = await loadPostsPerSession(rawStatsData, req.guild);
    var postsPerSessionPlusOutOfSession = await loadPostsPerSession(rawStatsData, req.guild, true);

    await getAttendanceData(req,res, next);
    var attendancePerSession = await loadAttendanceSession(req.attendanceData, req.guild);
    var attendancePerSessionPlusOutOfSession = await loadAttendanceSession(req.attendanceData, req.guild, true);

    await res.render("timeGraph", {
        graphs: {
            "Posts Over Time": postsOverTime,
            "Posts Per Day": postsPerDay,
            "Posts Per Hour": postsPerHour,
            "Posts Per Session": postsPerSession,
            "Posts Per Session (plus out of session count)": postsPerSessionPlusOutOfSession,

            "Attendance Per Session": attendancePerSession,
            "Attendance Per Session (plus out of session count)": attendancePerSessionPlusOutOfSession,
        }
    });
}

