//import { populateStatsFor } from "./classList.js";
import e from "express";
import { getStats } from "../analytics/analytics.js";
import { beginStreamingRes } from "../core/server.js";
import { asyncForEach, asyncForEachInSequence, pluralize } from "../core/utils.js";
import { assignRole, getRoleByNameOrCreate } from "../roles/roles.js";
import { parseCSV } from "./classList.js";
import { parseMyLOGroupsCSV } from "./groups.js";

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

export async function displayGroups(req,res,next) 
{
    //await populateStatsFor(req.classList, req.guild);
    res.render("groups", {
      groupCategories: req.groupCategories,
    });
}
export async function createGroup(req,res,next)
{
  beginStreamingRes(res);
  var groupInfo = JSON.parse(req.body.groupInfo);

  var groupNames = Object.keys(groupInfo);
  groupNames.sort(function(a, b) {
      return a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: 'base'
      });
  });

  await asyncForEachInSequence(groupNames, async function(groupName) {
    res.write(`Creating Role for Group ${groupName}...\n`);
    var role = await getRoleByNameOrCreate(req.guild, groupName);

    var notFoundMembers = 0;
    var foundMembers = 0;
    await asyncForEachInSequence(groupInfo[groupName], async function(myLOStudent)
    {
      var foundOnDiscord = false;
      await asyncForEachInSequence(req.classList, async function(discordStudent) {
          var username = discordStudent.username;
          if (username && username.toLowerCase() == myLOStudent.toLowerCase())
          {
              foundOnDiscord = true;
              foundMembers++;

              await assignRole(req.guild, discordStudent.member, role);
              //res.write(`\tfound member ${discordStudent.username} ${discordStudent.id}\n`);
          }
      });
      if (foundOnDiscord == false)
        notFoundMembers++;
    });

    if (notFoundMembers > 0)    
      res.write(`\tAdded ${pluralize(foundMembers, "Member")} (${pluralize(notFoundMembers, "Member")} not found)\n`);
    else
      res.write(`\tAdded ${pluralize(foundMembers, "Member")}\n`);
    
    res.write(`\n`);
  });

  res.write(`Done!\n`);
  
  res.end();

  next();
}

export async function uploadMyLOGroupsCSV(req,res,next)
{
  if (!req.files)
  {
    res.send("No file uploaded");
  }
  else
  {
    req.groupCategories = await parseMyLOGroupsCSV(req, req.files.csv);
    
    next();
  }
}