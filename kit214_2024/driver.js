
//-------------drivers----------------
export default function() 
{
    var router = Router({ mergeParams: true });

    //guild home page (dashboard)
    router.get("/", getDrivers);
    router.get("/:id", getDriver);

    return router;
}
function getDrivers(req,res,next)
{
    resultObject(res, 200, drivers);
}
function getDriver(req,res,next)
{
    var driver = drivers.find(d => d.number == req.params.id);
    if (driver == null) return resultObject(res, 404, "Driver not found");
    resultObject(res, 200, driver);
}
