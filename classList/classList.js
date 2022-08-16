import { getGuildProperty, getGuildPropertyConverted, GUILD_CACHE } from "../guild/guild.js";
import * as config from "../core/config.js";
import { renderFile } from "ejs";
import { getStats } from "../analytics/analytics.js";
import { getClient } from "../core/client.js";
import { hasRoleID, isAdmin } from "../roles/roles.js";
import { asyncFilter } from "../core/utils.js";

import fs from "fs";
import getStream from "get-stream";
import { parse } from "csv-parse";

export function loadClassList(req,res,next)
{
    return _loadClassList(req,res,next, false);//includeRemoved = false;
}
export function loadClassListWithRemoved(req,res,next)
{
    return _loadClassList(req,res,next, true);//includeRemoved = true;
}
export async function _loadClassList(req,res,next, includeRemoved)  
{
    //TODO: await ready?

    var members = await req.guild.members.cache;//fetch();
    var classList = members.map(m => (
    { 
        member: m,
        discordID: m.id, 
        discordName: m.displayName,
        username: 
            m.displayName.startsWith("Lindsay Wells") ? "lfwells" : 
            m.displayName.startsWith("Ian Lewis") ? "ij_lewis" :
            (m.displayName.match(/\(([^)]+)\)/) ?? []).length > 0 ? m.displayName.match(/\(([^)]+)\)/)[1] : ""
    }));
    
    //add in those with temporary roles, or those who were removed, by checking all posts
    //this takes time due to no cache (currently), so use wisely
    if (includeRemoved)
    {
        var stats = await getStats(req.guild);
        var a = new Set(classList.map(s => s.discordID));
        var b = new Set(Object.keys(stats.membersByID));
        var diff = Array.from(new Set([...b].filter(x=> !a.has(x))));
        await Promise.all(diff.map( async (s) => 
        { 
            var user = await getClient().users.fetch(s);
            classList.push({
                member:user,
                discordID: s,
                discordName: user.username
            });
        }));
    }

    //filter out admin
    classList = classList.filter(m => m.discordID != config.SIMPLE_POLL_BOT_ID /*&& m.discordID != config.IAN_ID && m.discordID != config.ROBO_LINDSAY_ID*/);

    //just some specific ian crap here lol, remove lindsay 
    if (req.guild.id != config.KIT109_S2_2021_SERVER && req.guild.id != config.TEST_SERVER_ID)
    {
        classList = classList.filter(m => m.discordID != config.LINDSAY_ID);
    }
    if (req.query && req.query.filterByRole)
    {
        if (req.query.filterByRole.startsWith(config.SELECT_FIELD_NONE))
        {
            delete req.query.filterByRole;
        }
        else
        {
            classList = classList.filter(m => m.member.roles != null && m.member.roles.cache.has(req.query.filterByRole)); 
            delete req.query.current;
            delete req.query.includeAdmin;
        }
    }

    if (req.query && req.query.includeAdmin == undefined)
    {
        console.log(req.query.includeAdmin);

        classList = await asyncFilter(classList, async (m) => !(await isAdmin(m.member)) );
    }
    else if (req.query)
    {
        delete req.query.current;
    }

    if (req.query && req.query.current && req.query.current == "on")
    {
        delete req.query.includeAdmin;
        delete req.query.filterByRole;

        var studentRoleID = await getGuildProperty("studentRoleID", req.guild, undefined, true);
        if (studentRoleID)
            classList = await asyncFilter(classList, async (m) => await hasRoleID(m.member, studentRoleID) );
            //classList = classList.filter(m => m.member.roles != null && m.member.roles.cache.has(studentRoleID)); 
        //else
            //classList = [];
    }

    req.classList = classList.sort((a,b) => a.discordName.localeCompare(b.discordName));
    res.locals.classList = req.classList;
    next(); 

}


//non express version
export async function getClassList(guild, includeRemoved)
{
    var req = { guild:guild };
    var res = { locals: { } };
    var next = ()=> {};
    await loadClassList(req, res, next, includeRemoved);

    return res.locals.classList;
}

export async function filterButtons(req,res,next)
{
    var studentRole = await getGuildPropertyConverted("studentRoleID", req.guild);
    res.locals.classListFilterCurrentStudentCheckbox = function()
    {
        if (studentRole)
        {
            return '<label><input type="checkbox" name="current" class="autosubmit" '+(res.locals.query.current ? "checked" : "" )+'/> Filter By <b>@'+studentRole.name+'</b> Only</label>'
        }
    };

    var adminRole = await getGuildPropertyConverted("adminRoleID", req.guild);
    res.locals.classListFilterAdminCheckbox = function()
    {
        if (adminRole) 
        {
            return '<label><input type="checkbox" name="includeAdmin" class="autosubmit" '+(res.locals.query.includeAdmin ? "checked" : "" )+'/> Include <b>@'+adminRole.name+'</b>?</label>'
        }
        return "";
    };

    //TODO: multi select?
    var roleList = await renderFile("views/subViews/roleSelect.html", {
        name: "filterByRole",
        id: "filterByRole",
        guild: req.guild,
        className: "autosubmit",
        value: res.locals.query.filterByRole,
        selectDefaultText: "- Select -"
    });
    res.locals.classListFilterByRoleList = function()
    {
        return "Filter By Role: "+roleList;
    }

    //TODO: multi select?
    var userList = await renderFile("views/subViews/userSelect.html", {
        name: "filterByUser",
        id: "filterByUser",
        guild: req.guild,
        className: "autosubmit",
        value: res.locals.query.filterByUser,
        selectDefaultText: "- Select -"
    });
    res.locals.classListFilterByUserList = function()
    {
        return "Filter By User: "+userList;
    }

    var offTopicCategory = await getGuildPropertyConverted("offTopicCategoryID", req.guild, null);
    
    res.locals.classListFilterByOffTopicCheckbox = function()
    {
        if (offTopicCategory)
        {
            return '<label><input type="checkbox" name="includeOffTopic" class="autosubmit" '+((res.locals.query.includeOffTopic) ? "checked" : "" )+'/> Include <b>'+offTopicCategory.name+'</b> Posts?</label>';
        }
        return "";
    };

    
    //TODO: multi select?
    var channelList = await renderFile("views/subViews/channelSelect.html", {
        name: "filterByChannel",
        id: "filterByChannel",
        guild: req.guild,
        className: "autosubmit",
        value: res.locals.query.filterByChannel,
        selectDefaultText: "- Select -"
    });
    res.locals.classListFilterByChannelList = function()
    {
        return "Filter By Channel: "+channelList;
    }
    
    

    res.locals.classlistFilters = function(includePostFilters)
    {
        var all = '<form method="get"><div class="filter">';
        //all += "<span>"+res.locals.classListFilterCurrentStudentCheckbox()+"</span>";
        all += "<span>"+res.locals.classListFilterAdminCheckbox()+"</span>";
        all += "<span>"+res.locals.classListFilterByRoleList()+"</span>";
        all += "<span>"+res.locals.classListFilterByUserList()+"</span>"; 
        if (includePostFilters)
        {
            all += "<span>"+res.locals.classListFilterByChannelList()+"</span>"; 
            all += "<span>"+res.locals.classListFilterByOffTopicCheckbox()+"</span>"; 
        }
        all += "</div></form>";

        return all;
    }

    next();
}

export async function getUserFilterPredicate(req)
{
    var studentRoleID = await getGuildProperty("studentRoleID", req.guild);
    var adminRoleID = await getGuildProperty("adminRoleID", req.guild);
    return async function (user)
    {
        return await filterUserPredicate(user, req, studentRoleID, adminRoleID);
    };
}

export async function getPostsFilterPredicate(req)
{
    var offTopicCategory = await getGuildPropertyConverted("offTopicCategoryID", req.guild);
    return async function (post)
    {
        return await filterPostPredicate(post, req, offTopicCategory);
    };
}

async function filterUserPredicate(user, req, studentRoleID, adminRoleID)
{
    var member = await req.guild.members.cache.get(user.author);
    if (member == undefined) return false;

    if (req.query.current && req.query.current == "on")
    {
        if (member.roles == undefined || member.roles.cache.has(studentRoleID) == false) return false;
    }
    
    if (req.query.includeAdmin == undefined)
    {
        if (member.roles == undefined || member.roles.cache.has(adminRoleID) == true) return false;
    }

    if (req.query.filterByRole && req.query.filterByRole != "")
    {
        if (member.roles == undefined || member.roles.cache.has(req.query.filterByRole) == false) return false;
    }

    if (req.query.filterByUser && req.query.filterByUser != "")
    {
        if (member.roles == undefined || member.id == (req.query.filterByUser) == false) return false;
    }

    return true;
}

async function filterPostPredicate(post, req, offTopicCategory)
{
    if (req.query.includeOffTopic == undefined && offTopicCategory)
    {
        if (offTopicCategory.children.some(c => c.id == post.channel)) return false;
    }

    
    if (req.query.filterByChannel && req.query.filterByChannel != "")
    {
        if (post.channel != req.query.filterByChannel) return false;
    }


    return true;
}

export async function parseCSV(req, fileUpload)
{
    var unenaged = [];
    var content = await readCSVData(fileUpload.tempFilePath);

    //first line is headers
    var headers = content.shift();
    console.log(headers);
    content = content.map(function (row) {
        var obj = {};
        for (var i = 0; i < headers.length; i++)
        {
            obj[headers[i]] = row[i];
        }
        obj["Username"] = obj["Username"].substring(0, obj["Username"].indexOf("@"));
        return obj;
    });

    content.forEach(myLOStudent => {
        var foundOnDiscord = false;
        req.classList.forEach(discordStudent => {
            var username = discordStudent.username;
            if (username && username.toLowerCase() == myLOStudent["Username"].toLowerCase())
            {
                foundOnDiscord = true;
                discordStudent.myLOStudent = myLOStudent;
            }
        });
        if (foundOnDiscord == false)
            unenaged.push(myLOStudent);
    });

    return unenaged;
}
async function readCSVData (filePath) {
    const parseStream = parse({delimiter: ','});
    const data = await getStream.array(fs.createReadStream(filePath).pipe(parseStream));
    return data;
}