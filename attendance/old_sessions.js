import moment from "moment";
//TODO: an interface for defining sessions and names? for now just auto-gen
export async function getSessions(guild)
{
    var weeks = [];

    if (!guild)
    {
        console.log("getSessions() got no guild?");
        return weeks;
    }

    var semesterStart = moment("2021-07-11"); //start of the week of SUNDAY 11 July 2021 //TODO: configured
    var weekStart = semesterStart;
    if (guild.id == config.KIT109_S2_2021_SERVER)
    {
        for (var w = 1; w <= 13; w++)
        {
            var week = {
                name: "Week "+w,
                weekStart: weekStart,
                sessions: [] 
            };

            if (w > 1) //no pracs in week 1
            {
                var sessionTime = moment(weekStart);
                sessionTime.day(2); //Tuesday
                sessionTime.hour(15);
                week.sessions.push({
                    name:"Practical",
                    week: w,
                    time:sessionTime,
                    duration:2,
                    channelID:["851553123746578481",  //tutorial-chat (as first in array, notifications will be here)
                        "866939311597027358", "851553123340255253", //queue and game-feedback
                        "851553124073209876", "851553124073209877", "851553124073209878", "879599703656890408", "879599731108610108", "879599755783729193"],  //breakouts
                    voiceChannelID:[
                        "851553124073209879",
                        "851553124073209880",
                        "851553124073209881",
                        "851553124073209882",
                        "879599578184290324",
                        "879599619959578635",
                        "879599657611837490"
                    ]
                });
            }

            var sessionTime = moment(weekStart);
            sessionTime.day(3); //Wednesday
            sessionTime.hour(12);
            week.sessions.push({
                name:"Lecture",
                week: w,
                time:sessionTime,
                duration:2,
                channelID: "851553123746578474",
                voiceChannelID: "851553123746578475"
            });

            var sessionTime = moment(weekStart);
            sessionTime.day(w == 12 ? 5 : 4); //Thursday (Friday in week 12)
            sessionTime.hour(9);
            week.sessions.push({
                name:"Tutorial",
                week: w,
                time:sessionTime,
                duration:4,
                channelID:["851553123746578481",  //tutorial-chat (as first in array, notifications will be here)
                        "866939311597027358", "851553123340255253", //queue and game-feedback
                        "851553124073209876", "851553124073209877", "851553124073209878", "879599703656890408", "879599731108610108", "879599755783729193"],  //breakouts
                voiceChannelID:[
                    "851553124073209879",
                    "851553124073209880",
                    "851553124073209881",
                    "851553124073209882",
                    "879599578184290324",
                    "879599619959578635",
                    "879599657611837490"
                ]
            });
        

            week.colspan = week.sessions.length;
            weeks.push(week);

            //add on one week
            weekStart = moment(weekStart);
            weekStart.add(7, 'days');
            //semester break, add on another
            if (w == 7)
                weekStart.add(7, 'days');
        }

        //week 14 garb
        var week = {
            name: "SWOTVAC",
            weekStart: weekStart,
            sessions: [] 
        };
        var sessionTime = moment(weekStart);
        sessionTime.day(3); //Wednesday
        sessionTime.hour(12);
        week.sessions.push({
            name:"Exam Game Demo",
            week: w,
            time:sessionTime,
            duration:2,
            channelID: "851553123746578474",
            voiceChannelID: "851553123746578475"
        });

        week.colspan = week.sessions.length;
        weeks.push(week);
    
    }
    else if (guild.id == config.KIT207_S2_2021_SERVER)
    {
        for (var w = 1; w <= 13; w++)
        {
            var week = {
                name: "Week "+w,
                weekStart: weekStart,
                sessions: [] 
            };

            var sessionTime = moment(weekStart);
            sessionTime.day(2); //Tuesday
            sessionTime.hour(13);
            week.sessions.push({
                name:"Lecture",
                week: w,
                time:sessionTime,
                duration:2,
                channelID:"861231510005743656",
                voiceChannelID: ["860360631450075139", "869445948399562792"]
            });

            if (w > 1) //no pracs in week 1
            {
                var sessionTime = moment(weekStart);
                sessionTime.day(2); //Tuesday
                sessionTime.hour(15);
                week.sessions.push({
                    name:"Practical",
                    week: w,
                    time:sessionTime,
                    duration:2,
                    channelID:"861231530751164426",
                    voiceChannelID: ["860360631450075139", "869445948399562792"]
                });
            }


            week.colspan = week.sessions.length;
            weeks.push(week);

            //add on one week
            weekStart = moment(weekStart);
            weekStart.add(7, 'days');
            //semester break, add on another
            if (w == 7)
                weekStart.add(7, 'days');
        }
    }
    else if (guild.id == config.KIT308_S2_2021_SERVER)
    {
        for (var w = 1; w <= 13; w++)
        {
            var week = {
                name: "Week "+w,
                weekStart: weekStart,
                sessions: [] 
            };

            if (w > 1) //no pracs in week 1
            {
                var sessionTime = moment(weekStart);
                sessionTime.day(3); //Wednesday
                sessionTime.hour(15);
                week.sessions.push({
                    name:"Tutorial",
                    week: w,
                    time:sessionTime,
                    duration:2,
                    channelID:"861228239229157426" ,
                    voiceChannelID: "860323794060312600"
                });

                var sessionTime = moment(weekStart);
                sessionTime.day(4); //Thursday
                sessionTime.hour(14);
                week.sessions.push({
                    name:"Workshop",
                    week: w,
                    time:sessionTime,
                    duration:2,
                    channelID:"861228239229157426" ,
                    voiceChannelID: "860323794060312600"
                });
            }

            var sessionTime = moment(weekStart);
            sessionTime.day(1); //Monday
            sessionTime.hour(13);
            week.sessions.push({
                name:"Lecture",
                week: w,
                time:sessionTime,
                duration:2,
                channelID:"861228214835347496",
                voiceChannelID: "860323794060312600"
            });
        
            if (w == 1) //only week 1... grr lol
            {
            
                var sessionTime = moment(weekStart);
                sessionTime.day(3); //Wednesday
                sessionTime.hour(15);
                week.sessions.push({
                    name:"Lecture",
                    week: w,
                    time:sessionTime,
                    duration:2,
                    channelID:"861228214835347496",
                    voiceChannelID: "860323794060312600"
                });
            }

            week.colspan = week.sessions.length;
            weeks.push(week);

            //add on one week
            weekStart = moment(weekStart);
            weekStart.add(7, 'days');
            //semester break, add on another
            if (w == 7)
                weekStart.add(7, 'days');
        }
    }
    else if (guild.id == config.TEST_SERVER_ID)
    {
        for (var w = 1; w <= 13; w++)
        {
            var week = {
                name: "Week "+w,
                weekStart: weekStart,
                sessions: [] 
            };

            var sessionTime = moment(weekStart);
            sessionTime.day(6); //Wednesday
            sessionTime.hour(8);
            sessionTime.minute(28+15);
            week.sessions.push({
                name:"Lecture",
                week: w,
                time:sessionTime,
                duration:2,
                channelID: "813152606359650322"
            });

            var sessionTime = moment(weekStart);
            sessionTime.day(4); //Thursday
            sessionTime.hour(9);
            week.sessions.push({
                name:"Tutorial",
                week: w,
                time:sessionTime,
                duration:4,
                channelID:"813152606544855088"
            });

            week.colspan = week.sessions.length;
            weeks.push(week);

            //add on one week
            weekStart = moment(weekStart);
            weekStart.add(7, 'days');
            //semester break, add on another
            if (w == 7)
                weekStart.add(7, 'days');
        }
    }

    //cache some maths (TODO: Sort too?)
    weeks.forEach(week => {
        week.sessions.forEach(session => {
            var time = moment(session.time);
            var start = moment(time);
            var end = moment(time);
            session.startTimestamp = moment(start);
            session.earlyStartTimestamp = start.subtract(earlyTime, "minutes");
            session.endTimestamp = end.add(session.duration, "hours");
        });

        week.sessions.sort((a,b) => a.time - b.time);
    });

    return weeks;
}