import { guildsCollection } from "../core/database.js";

export async function displayAttendance(req, res, next) 
{
    res.render("attendance", {
        data:req.data
    });
    next()
}
    

//display attendance
export async function getAttendanceData(req,res,next)
{
    var data = await req.guildDocument.collection("attendance").orderBy("joined", "desc").get();
    req.data = [];
    data.forEach(doc =>
    {
        var d = doc.data();
        d.id = doc.id;
        d.joined = new Date(d.joined).toUTCString();
        d.left = d.left ? new Date(d.left).toUTCString() : "";
        req.data.push(d);
    });
    next();
}

//marking, mashing that in here
export async function recordProgress(req, res, next) 
{
    var d = new Date();
    req.query.timestamp = d.getTime();

    console.log(req.query);

    await req.guildDocument.collection("progress").add(req.query);
    res.json({"success": true});
    next()
}

export async function displayProgress(req, res, next) 
{
    res.render("progress", {
        data:req.data
    });
    next()
}

export async function getProgressData(req,res,next)
{
    var data = await req.guildDocument.collection("progress").orderBy("timestamp", "desc").get();
    req.data = [];
    data.forEach(doc =>
    {
        var d = doc.data();
        d.id = doc.id;
        d.timestamp = new Date(d.timestamp).toUTCString();
        req.data.push(d);
    });
    next();
}

   