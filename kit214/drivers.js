import { drivers, saveDrivers, all_teams_apis } from "./data.js";
import { requireXApiKey, resultObject } from "./utils.js";
import { Router } from "express";
import { BASE_URI } from "./utils.js";

//-------------drivers----------------
export default function() 
{
    var router = Router({ mergeParams: true });

    //guild home page (dashboard)
    router.get("/", getDrivers);
    router.get("/:id", getDriver);

    router.post("/", requireXApiKey, handleDriverInput, createDriver);
    router.put("/:id", requireXApiKey, handleDriverInput, updateDriver);

    router.delete("/:id", requireXApiKey, deleteDriver);

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


function createDriver(req,res,next)
{
    //check to see if there is already a driver with that number
    var driver = drivers.find(d => d.number == req.driver.number);
    if (driver != null) return resultObject(res, 400, "Driver number already exists");

    drivers.push(req.driver);
    saveDrivers();

    resultObject(res, 200, "Driver created");
}
function updateDriver(req,res,next)
{
    var driverIndex = drivers.findIndex(d => d.number == req.params.id);
    if (driverIndex == -1) return resultObject(res, 404, "Driver not found");

    //if we are updating the driver number
    if (req.driver.number != req.params.id)
    {
        //check to see if there is already a driver with that number
        var driver = drivers.find(d => d.number == req.driver.number);
        if (driver != null) return resultObject(res, 400, "Driver number already exists");
    }

    drivers[driverIndex] = req.driver;
    saveDrivers();

    resultObject(res, 200, "Driver updated");
}
function deleteDriver(req,res,next)
{
    var driverIndex = drivers.findIndex(d => d.number == req.params.id);
    if (driverIndex == -1) return resultObject(res, 404, "Driver not found");

    drivers.splice(driverIndex, 1);
    saveDrivers();

    resultObject(res, 200, "Driver deleted");
}

function handleDriverInput(req,res,next)
{
    var body = req.body;
    if (body == null) return resultObject(res, 400, "Missing body");
    if (body.number == null || body.number == "") return resultObject(res, 400, "Missing number");
    body.number = parseInt(body.number);
    if (isNaN(body.number)) return resultObject(res, 400, "Invalid number");
    if (body.name == null || body.name == "") return resultObject(res, 400, "Missing name");
    if (body.skill == null) return resultObject(res, 400, "Missing skill");
    if (body.skill.street == null || body.skill.street == "") return resultObject(res, 400, "Missing skill.street");
    if (body.skill.race == null || body.skill.race == "") return resultObject(res, 400, "Missing skill.race");
    body.skill.street = parseInt(body.skill.street);
    if (isNaN(body.skill.street)) return resultObject(res, 400, "Invalid skill.street");
    body.skill.race = parseInt(body.skill.race);
    if (isNaN(body.skill.race)) return resultObject(res, 400, "Invalid skill.race");
    if (body.skill.street < 0 || body.skill.street > 100) return resultObject(res, 400, "Invalid skill.street");
    if (body.skill.race < 0 || body.skill.race > 100) return resultObject(res, 400, "Invalid skill.race");
    if (body.skill.race + body.skill.street > 100) return resultObject(res, 400, "Invalid skill total");

    req.driver = body;
    next();
}
