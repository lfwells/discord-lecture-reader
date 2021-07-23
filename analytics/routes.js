import { getStats } from "./analytics.js";


export async function getStatsData(req,res,next)
{
    res.locals.statsData = await getStats(req.guild);
    next();
}

export async function displayStats(req, res, next) 
{
    await res.render("stats");
    next()
}