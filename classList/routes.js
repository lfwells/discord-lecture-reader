//import { populateStatsFor } from "./classList.js";
import e from "express";
import { getStats } from "../analytics/analytics.js";
import { parseCSV } from "./classList.js";

export async function displayClassList(req,res,next) 
{
    await populateStatsFor(req.classList, req.guild);
    res.render("classList", {
        classList: req.classList,
        unengagedClassList: req.unengagedClassList ?? null //list of people on mylo but not on discord. TODO: list of UNLINKED discord accs
    });
}

export async function displayStudent(req,res,next) 
{
  res.json({ discordID: req.params.discordID });
}


export async function populateStatsFor(classList, guild, stats)
{
    if (stats == null) stats = await getStats(guild);

    for (var student of classList)
    {
        student.stats = stats.membersByID[student.discordID];
        //console.log(student.stats);
    }
}

export async function uploadMyLOCSV(req,res,next)
{
  if (!req.files)
  {
    res.send("No file uploaded");
  }
  else
  {
    req.unengagedClassList = await parseCSV(req, req.files.csv);
    console.log(req.unengagedClassList);;
    next();
  }
}