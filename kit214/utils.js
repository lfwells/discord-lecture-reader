
export const BASE_URI = "https://utasbot.dev/kit214";

export function ejs(page){
    return function (req,res,next)
    {
        res.locals.params = req.params;
        res.render(page);
    };
}

export function resultObject(res, code, result)
{
    res.status(code).json({code, result});
}

export function requireXApiKey(req,res,next)
{
    if (req.headers["x-api-key"] != "123") return resultObject(res, 401, "Unauthorized"); 
    next();
}
export function truncateLapTime(lapTime)
{
    return lapTime.toFixed(3);
}
export function nextId(dataArray)
{
    return Math.max(...dataArray.map(d => d.id), 0) + 1;
}