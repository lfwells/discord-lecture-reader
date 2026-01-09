import { cars, drivers, saveCars, all_teams_apis } from "./data.js";
import { nextId, resultObject, truncateLapTime } from "./utils.js";
import { Router } from "express";
import { BASE_URI, requireXApiKey } from "./utils.js";
import fetch from "node-fetch";

//-------------cars----------------
export default function() 
{
    var router = Router({ mergeParams: true });

    //guild home page (dashboard)
    router.get("/", getCars);
    router.get("/:id", getCar);
    router.get("/:id/lap", getCarLap);

    router.get("/:id/driver", getCarObject, getDriver);
    router.put("/:id/driver", getCarObject, setDriver);
    router.delete("/:id/driver", getCarObject, deleteDriver);

    router.post("/", requireXApiKey, handleCarInput, createCar);
    router.put("/:id", requireXApiKey, handleCarInput, updateCar);

    router.delete("/:id", requireXApiKey, deleteCar);

    return router;
}
function getCars(req,res,next)
{
    var c = cars.map(processCarObj);
    resultObject(res, 200, c);
}
function getCar(req,res,next)
{
    var c = processCarObj(cars.find(d => d.id == req.params.id));
    if (c == null) return resultObject(res, 404, "Car not found");
    resultObject(res, 200, c);
}



function createCar(req,res,next)
{
    req.car.id = nextId(cars);
    cars.push(req.car);
    saveCars();

    resultObject(res, 200, "Car created");
}
function updateCar(req,res,next)
{
    var carIndex = cars.findIndex(d => d.id == req.params.id);
    if (carIndex == -1) return resultObject(res, 404, "Car not found");

    req.car.id = req.params.id;
    cars[carIndex] = req.car;
    saveCars();

    resultObject(res, 200, "Car updated");
}
function deleteCar(req,res,next)
{
    var carIndex = cars.findIndex(d => d.id == req.params.id);
    if (carIndex == -1) return resultObject(res, 404, "Car not found");

    cars.splice(carIndex, 1);
    saveCars();

    resultObject(res, 200, "Car deleted");
}

function getCarObject(req,res, next)
{
    var car = cars.find(d => d.id == req.params.id);
    if (car == null) return resultObject(res, 404, "Car not found");
    req.car = car;
    next();
}
function getDriver(req,res,next)
{
    var car = req.car;
    if (car.driver == null) return resultObject(res, 404, "Driver not found");
    var driverNumber = req.body.number;
    var driver = drivers.find(d => d.number == car.driver);
    if (driver == null) return resultObject(res, 404, "Driver not found");
    resultObject(res, 200, driver);
}
function setDriver(req,res,next)
{
    var car = req.car;
    var driverNumber = req.body.number;
    var driver = drivers.find(d => d.number == driverNumber);
    if (driver == null) return resultObject(res, 404, "Driver not found");
    
    var carIndex = cars.findIndex(d => d.id == req.params.id);
    if (carIndex == -1) return resultObject(res, 404, "Car not found");

    cars[carIndex].driver = driverNumber;
    saveCars();
    resultObject(res, 200, "Driver set");
}
function deleteDriver(req,res,next)
{
    var carIndex = cars.findIndex(d => d.id == req.params.id);
    if (carIndex == -1) return resultObject(res, 404, "Car not found");

    cars[carIndex].driver = null;
    saveCars();
    resultObject(res, 200, "Driver deleted");
}

function getCarLap(req,res,next)
{
    var car = cars.find(d => d.id == req.params.id);
    if (car == null) return resultObject(res, 404, "Car not found");

    var driver = drivers.find(d => d.number == car.driver);
    if (driver == null) return resultObject(res, 404, "Driver not found");

    if (req.query.trackType == null) return resultObject(res, 400, "Missing trackType");
    if (req.query.baseLapTime == null) return resultObject(res, 400, "Missing baseLapTime");
    //should also check are numeric and track type is one of the two allowed


    var lapResult = {
        time: 0, randomness: truncateLapTime(Math.random() * 5), crashed: false
    };

    var crashChance = car.reliability;
    if (req.query.trackType == "street")
        crashChance += 10;
    else
        crashChance += 5;
    lapResult.crashed = Math.random() * crashChance > car.reliability;

    if (lapResult.crashed == false)
    {
        var sum = driver.skill[req.query.trackType] + car.suitability[req.query.trackType] + (100-car.reliability);
        var speed = sum/3;
        lapResult.time = truncateLapTime(parseFloat(req.query.baseLapTime) + 10*speed/100);
        console.log({sum, speed, type: req.query.trackType, skill: driver.skill[req.query.trackType], base:parseFloat(req.query.baseLapTime), time: lapResult.time});
    }

    resultObject(res, 200, lapResult);
}
function processCarObj(c)
{
    if (c == null) return null;
    var car = Object.assign({}, c);

    var driver = drivers.find(d => d.number == car.driver);
    if (driver != null) car.driver = {name:driver.name, uri: BASE_URI + "/teams-api/driver/" + driver.number};
    else car.driver = null;
    return car;
}


function handleCarInput(req,res,next)
{
    var body = req.body;
    if (body == null) return resultObject(res, 400, "Missing body");
    
    if (body.suitability == null) return resultObject(res, 400, "Missing suitability");
    if (body.suitability.street == null || body.suitability.street == "") return resultObject(res, 400, "Missing suitability.street");
    if (body.suitability.race == null || body.suitability.race == "") return resultObject(res, 400, "Missing suitability.race");
    body.suitability.street = parseInt(body.suitability.street);
    if (isNaN(body.suitability.street)) return resultObject(res, 400, "Invalid suitability.street");
    body.suitability.race = parseInt(body.suitability.race);
    if (isNaN(body.suitability.race)) return resultObject(res, 400, "suitability suitability.race");
    if (body.suitability.street < 0 || body.suitability.street > 100) return resultObject(res, 400, "Invalid suitability.street");
    if (body.suitability.race < 0 || body.suitability.race > 100) return resultObject(res, 400, "Invalid suitability.race");
    if (body.suitability.race + body.suitability.street > 100) return resultObject(res, 400, "Invalid suitability total");

    if (body.reliability == null) return resultObject(res, 400, "Missing reliability");
    body.reliability = parseInt(body.reliability);
    if (isNaN(body.reliability)) return resultObject(res, 400, "Invalid reliability");
    if (body.reliability < 0 || body.reliability > 100) return resultObject(res, 400, "Invalid reliability");

    req.car = body;
    next();
}


async function getAllCarsFromAllTeams(req,res,next)
{
    res.json(await getAllCarsArray());

}
export async function getAllCarsArray()
{
    var allDrivers = [];
    console.log({all_teams_apis});
    for (var i = 0; i < all_teams_apis.length; i++)
    {
        try {
            var url = all_teams_apis[i][1];
            console.log({url});
            var response = await fetch(url + "car", { signal: AbortSignal.timeout(3000) });
            var data = await response.json();
            if (data != null && data.result && data.code == 200) {
                data = data.result;
                for (var j = 0; j < data.length; j++) {
                    var driver = data[j];
                    driver.uri = url + "car/" + driver.id;
                    console.log({driver});
                    allDrivers.push(driver);
                }
            }
        } catch (error) {
            console.error(`Error fetching data from ${url}:`, error);
        }
    }
    return allDrivers;
}