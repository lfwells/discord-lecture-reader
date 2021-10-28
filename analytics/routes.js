import moment from "moment";
import { getAttendanceData } from "../attendance/routes.js";
import { postWasForSession } from "../attendance/sessions.js";
import { getFilterPredicate } from "../core/classList.js";
import { KIT109_S2_2021_SERVER, KIT207_S2_2021_SERVER, KIT308_S2_2021_SERVER } from "../core/config.js";
import { getStats, getStatsWeek, predicateExcludeAdmin, loadHistoricalData, getPostsData, loadTimeSeries, loadPostsPerDay, loadPostsPerHour, loadPostsPerSession, loadAttendanceSession } from "./analytics.js";
import fakeData from "./fakeData.js";


export async function getStatsData(req,res,next)
{
    res.locals.statsData = await getStats(req.guild, await getFilterPredicate(req));
    next();
}
export async function getStatsDataWeek(req,res,next)
{
    res.locals.statsData = await getStatsWeek(req.guild, await getFilterPredicate(req));
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
    //if (req.guild.id != KIT109_S2_2021_SERVER || req.query.current || req.query.includeAdmin || req.query.filterByRole)
    {
        rawStatsData = await getPostsData(req.guild, await getFilterPredicate(req));
    }
    console.log("operating on", rawStatsData.length, "posts");

    var postsOverTime = await loadTimeSeries(rawStatsData);
    var postsOverTimeWeekly = await loadTimeSeries(rawStatsData, true);//weekly
    var postsPerDay = await loadPostsPerDay(rawStatsData);
    var postsPerHour = await loadPostsPerHour(rawStatsData);
    var postsPerSession = await loadPostsPerSession(rawStatsData, req.guild);
    var postsPerSessionPlusOutOfSession = await loadPostsPerSession(rawStatsData, req.guild, true);

    await getAttendanceData(req,res);
    var attendancePerSession = await loadAttendanceSession(req.attendanceData, req.guild, false, await getFilterPredicate(req));
    var attendancePerSessionPlusOutOfSession = await loadAttendanceSession(req.attendanceData, req.guild, true, await getFilterPredicate(req));

    //in 2021 sem 2 we lost the week 8 and 9 tutes and lecture, fake the data...
    //technically should do this for attendancePerSessionPlusOutOfSession but meh
    if (req.guild.id == KIT109_S2_2021_SERVER)
    {
        attendancePerSession.forEach((s, i) => {
            if (
                (s.name == "Tutorial" && s.week == 8) || 
                (s.name == "Tutorial" && s.week == 9) || 
                (s.name == "Practical" && s.week == 9) || 
                (s.name == "Lecture" && s.week == 9) )
            {
                //get unique author count of posts that were posted during this session
                attendancePerSession[i].value = new Set(rawStatsData.filter(p => postWasForSession(p, s)).map(p => p.author)).size;
            }
            
        });
    }
    else if (req.guild.id == KIT207_S2_2021_SERVER)
    {
        attendancePerSession.forEach((s, i) => {
            if (
                (s.name == "Practical" && s.week == 9) || 
                (s.name == "Lecture" && s.week == 9) )
            {
                //get unique author count of posts that were posted during this session
                attendancePerSession[i].value = new Set(rawStatsData.filter(p => postWasForSession(p, s)).map(p => p.author)).size;
            }
            
        });
    }
    else if (req.guild.id == KIT308_S2_2021_SERVER)
    {
        attendancePerSession.forEach((s, i) => {
            if (
                (s.name == "Workshop" && s.week == 8) || 
                (s.name == "Tutorial" && s.week == 9) || 
                (s.name == "Workshop" && s.week == 9) || 
                (s.name == "Lecture" && s.week == 9) )
            {
                //get unique author count of posts that were posted during this session
                attendancePerSession[i].value = new Set(rawStatsData.filter(p => postWasForSession(p, s)).map(p => p.author)).size;
            }
            
        });
    }

    await res.render("timeGraph", {
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

