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