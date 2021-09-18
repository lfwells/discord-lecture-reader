import moment from "moment";
import { getStats, getStatsWeek, predicateExcludeAdmin, loadHistoricalData, loadTimeSeries } from "./analytics.js";


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
    var historicalData = await loadHistoricalData();
    await res.json(historicalData);
}

export async function timeGraph(req, res, next)
{
    var days = await loadTimeSeries(req.guild);
    //var days = [{"date":"2021-07-04T14:00:00.000Z","value":34},{"date":"2021-07-05T14:00:00.000Z","value":9},{"date":"2021-07-06T14:00:00.000Z","value":37},{"date":"2021-07-07T14:00:00.000Z","value":9},{"date":"2021-07-08T14:00:00.000Z","value":13},{"date":"2021-07-09T14:00:00.000Z","value":7},{"date":"2021-07-10T14:00:00.000Z","value":177},{"date":"2021-07-11T14:00:00.000Z","value":25},{"date":"2021-07-12T14:00:00.000Z","value":39},{"date":"2021-07-13T14:00:00.000Z","value":653},{"date":"2021-07-14T14:00:00.000Z","value":422},{"date":"2021-07-15T14:00:00.000Z","value":67},{"date":"2021-07-16T14:00:00.000Z","value":29},{"date":"2021-07-17T14:00:00.000Z","value":42},{"date":"2021-07-18T14:00:00.000Z","value":42},{"date":"2021-07-19T14:00:00.000Z","value":227},{"date":"2021-07-20T14:00:00.000Z","value":445},{"date":"2021-07-21T14:00:00.000Z","value":394},{"date":"2021-07-22T14:00:00.000Z","value":49},{"date":"2021-07-23T14:00:00.000Z","value":20},{"date":"2021-07-24T14:00:00.000Z","value":54},{"date":"2021-07-25T14:00:00.000Z","value":88},{"date":"2021-07-26T14:00:00.000Z","value":169},{"date":"2021-07-27T14:00:00.000Z","value":338},{"date":"2021-07-28T14:00:00.000Z","value":219},{"date":"2021-07-29T14:00:00.000Z","value":85},{"date":"2021-07-30T14:00:00.000Z","value":118},{"date":"2021-07-31T14:00:00.000Z","value":184},{"date":"2021-08-01T14:00:00.000Z","value":68},{"date":"2021-08-02T14:00:00.000Z","value":133},{"date":"2021-08-03T14:00:00.000Z","value":326},{"date":"2021-08-04T14:00:00.000Z","value":75},{"date":"2021-08-05T14:00:00.000Z","value":16},{"date":"2021-08-06T14:00:00.000Z","value":34},{"date":"2021-08-07T14:00:00.000Z","value":6},{"date":"2021-08-08T14:00:00.000Z","value":7},{"date":"2021-08-09T14:00:00.000Z","value":186},{"date":"2021-08-10T14:00:00.000Z","value":777},{"date":"2021-08-11T14:00:00.000Z","value":171},{"date":"2021-08-12T14:00:00.000Z","value":19},{"date":"2021-08-13T14:00:00.000Z","value":15},{"date":"2021-08-15T14:00:00.000Z","value":18},{"date":"2021-08-16T14:00:00.000Z","value":108},{"date":"2021-08-17T14:00:00.000Z","value":546},{"date":"2021-08-18T14:00:00.000Z","value":221},{"date":"2021-08-19T14:00:00.000Z","value":13},{"date":"2021-08-20T14:00:00.000Z","value":18},{"date":"2021-08-21T14:00:00.000Z","value":84},{"date":"2021-08-22T14:00:00.000Z","value":11},{"date":"2021-08-23T14:00:00.000Z","value":138},{"date":"2021-08-24T14:00:00.000Z","value":455},{"date":"2021-08-25T14:00:00.000Z","value":213},{"date":"2021-08-26T14:00:00.000Z","value":41},{"date":"2021-08-27T14:00:00.000Z","value":8},{"date":"2021-08-28T14:00:00.000Z","value":169},{"date":"2021-08-29T14:00:00.000Z","value":62},{"date":"2021-08-30T14:00:00.000Z","value":54},{"date":"2021-08-31T14:00:00.000Z","value":64},{"date":"2021-09-01T14:00:00.000Z","value":50},{"date":"2021-09-02T14:00:00.000Z","value":73},{"date":"2021-09-03T14:00:00.000Z","value":34},{"date":"2021-09-04T14:00:00.000Z","value":198},{"date":"2021-09-05T14:00:00.000Z","value":82},{"date":"2021-09-06T14:00:00.000Z","value":85},{"date":"2021-09-07T14:00:00.000Z","value":640},{"date":"2021-09-08T14:00:00.000Z","value":420},{"date":"2021-09-09T14:00:00.000Z","value":61},{"date":"2021-09-10T14:00:00.000Z","value":153},{"date":"2021-09-11T14:00:00.000Z","value":356},{"date":"2021-09-12T14:00:00.000Z","value":113},{"date":"2021-09-13T14:00:00.000Z","value":504},{"date":"2021-09-14T14:00:00.000Z","value":682},{"date":"2021-09-15T14:00:00.000Z","value":367},{"date":"2021-09-16T14:00:00.000Z","value":20},{"date":"2021-09-17T14:00:00.000Z","value":18}];
    await res.render("timeGraph", {days:days});
}