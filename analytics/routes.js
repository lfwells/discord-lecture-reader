import { getAttendanceData } from "../attendance/routes.js";
import { getUserFilterPredicate, getPostsFilterPredicate } from "../classList/classList.js";
import { beginStreamingRes, streamHeader, endStreamedPage } from "../core/server.js";
import { asyncForEach } from "../core/utils.js";
import { getStats, getStatsWeek, predicateExcludeAdmin, loadHistoricalData, getPostsData, loadTimeSeries, loadPostsPerDay, loadPostsPerHour, loadPostsPerSession, loadAttendanceSession } from "./analytics.js";
import { loadPresenceData } from "./presence.js";


export async function getStatsData(req,res,next)
{
    res.locals.statsData = await getStats(req.guild, await getUserFilterPredicate(req, res), await getPostsFilterPredicate(req, res));
    next();
}
export async function getStatsDataWeek(req,res,next)
{
    res.locals.statsData = await getStatsWeek(req.guild, await getUserFilterPredicate(req, res), await getPostsFilterPredicate(req, res));
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

    var rawStatsData = async function() { 
        console.log("loading posts for time graph...");
        var posts = await getPostsData(req.guild, await getUserFilterPredicate(req, res), await getPostsFilterPredicate(req, res));
        console.log("operating on", posts.length, "posts");
        return posts;
    };
    
    var attendanceData = async function() {
        return await getAttendanceData(req,res);
    };

    var graphSelections = {
        "Posts Over Time": async function () {
            return await loadTimeSeries(await rawStatsData());
        },
        "Posts Over Time (Weekly)": async function() {
            return await loadTimeSeries(await rawStatsData(), true);
        },
        "Posts Per Day": async function() {
            return await loadPostsPerDay(await rawStatsData());
        },
        "Posts Per Hour": async function() {
            return await loadPostsPerHour(await rawStatsData());
        },
        "Posts Per Session": async function (){
            return await loadPostsPerSession(await rawStatsData(), req.guild);
        },
        "Posts Per In/Out Session": async function() {
            return await loadPostsPerSession(await rawStatsData(), req.guild, true);
        },

        "Attendance Per Session": async function()
        {
            return await loadAttendanceSession(await attendanceData(), req.guild, false, await getUserFilterPredicate(req, res));
        },
        "Attendance In/Out Session": async function() {
            return await loadAttendanceSession(await attendanceData(), req.guild, true, await getUserFilterPredicate(req, res));
        },
        "Online Presence Per Day": async function() {
            return (await loadPresenceData(req.guild)).map(function  (e) { return { date: e.timestamp, value: e.count }; });
        }
    };
    console.log("time graph page", req.body); 
    if (Object.keys(req.body).length == 0)
        return await res.render("timeGraphSelection", { graphSelections });

    function graphSelected(graph) {
        return req.body[graph] != undefined;
    }

    var anyGraphSelected = Object.keys(graphSelections).some(graphSelected);
    if (anyGraphSelected )
    {
        await streamHeader(res, "Graphs");
        
        var graphs = [];
        //await asyncForEach(Object.keys(graphSelections), async function (graph) {
        for (var graph in graphSelections)
        {
            if (graphSelected(graph))
            {
                res.write(`<p>Doing graph ${graph}...</p>`)
                graphs.push({
                    title:graph,
                    data:await graphSelections[graph]()
                });
                
                res.write(`<p>Done graph ${graph}.</p>`)
            }
        }//);

        await endStreamedPage(res, "timeGraph", {
            //postData:rawStatsData,
            graphs,
            graphSelections
        });
    }
    else
    {
        await res.render("timeGraph", {
            //postData:rawStatsData,
            graphs,
            graphSelections
        });
    }
}

