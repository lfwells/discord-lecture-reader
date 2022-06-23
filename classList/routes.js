//import { populateStatsFor } from "./classList.js";
import { getStats } from "../analytics/analytics.js";

export async function displayClassList(req,res,next) 
{
    await populateStatsFor(req.classList, req.guild);
    res.render("classList", {
        classList: req.classList
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
        console.log(student.stats);
    }
}

import fetch, { Headers } from 'node-fetch';
export async function myloTest(req,res,next)
{
    const token = await fetch('https://mylo.utas.edu.au/d2l/lp/auth/oauth2/token', {
        method: 'post',
        body: 'scope=*:*:*',
        credentials: 'include',
        headers: new Headers({
          'Content-Type': 'application/x-www-form-urlencoded',
          //'X-Csrf-Token': window.localStorage['XSRF.Token'],
        }),
      });
      res.json({token});
}