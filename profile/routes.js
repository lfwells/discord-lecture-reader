export async function load(req, res, next)
{
    next();
}
export async function profile_home(req,res,next)
{
    var discordID = req.params.discordID;
    res.render("profile/index");
}