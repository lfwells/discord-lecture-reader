import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const ENABLE_ANALYTICS = true;
const ANALYTICS_INTERVAL = 10000; // 10 seconds
const ANALYTICS_TEXT_EXCERPT_LENGTH = 16; //characters to capture from text elements for analytics
const ANALYTICS_URL = "https://playur.io/parky_mooc/index.php";




const ANIMATION_CONTAINER_FADE_IN = 100;
const ANIMATION_CONTAINER_FADE_OUT = 2000;
const ANIMATION_CONTAINER_EASE_IN = 200;
const ANIMATION_CONTAINER_EASE_OUT = 200;
const ANIMATION_SHOW_FEEDBACK_DURATION = 3000;

//init
let container;
let progressContainer;
let avatarContainer;
let avatar;
let avatarImage;
let avatarSpeechBubble;
let avatarSpeechBubbleText;
let avatarSFX;
//let progressData = [];
let progressData = [[0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0]]; // TODO: this is for testing only

async function init()
{
    window.console.log("init");
    progressContainer = $("#progress");
    //progressContainer.find(".row").hide();
    
    //create another div for our rendering
    //container = $("<div id='gamification' class='row'></div>");
    //$(progressContainer).prepend(container);

    //create a div for the avatar which is fixed overlaid on the bottom right of the page
    avatarContainer = $("<div id='avatarContainer' class='row' style='position: relative; bottom: 0; right: 0;'></div>");
    //$("body").append(avatarContainer);
    $("#bottom_nav").append(avatarContainer);

	avatar = $("<div id='avatar' class='row'></div>").css({
		position: 'absolute',
		width: '692px',
		height: '344px',
		bottom: 0,
		right: 0,
		transform: 'translateY(100%)'
	});

	avatarSpeechBubble = $("<img>", {
		id:"avatarSpeechBubble", 
		src:"https://utasbot.dev/static/speech-bubble.png",
		width:"512px",
		height:"356px"}
	);
	
    avatarImage = $("<img>", {
		id:"avatarImage", 
		src:"https://utasbot.dev/static/avatar-woman.png",
		width:"150px",
		height:"200px"}
	);	
	
	avatarSpeechBubbleText = $("<div>", {
		id:"avatarSpeechBubbleText", 
		style: "width: 450px; height: 100px; position: absolute; top: 10%; left: 5%; transform: translate(0%, 0%); color: black; font-size: 24px; font-weight: 600;"}
	);
	//avatarSpeechBubbleText.text("TEST TEST TEST");

	avatarSFX = $("<audio>", {
		id:"avatarSFX", 
		src:"https://utasbot.dev/static/progress.mp3"}
	);
	
	$(avatar).append(avatarSpeechBubble);
	$(avatar).append(avatarImage);
	$(avatar).append(avatarSpeechBubbleText);	
	$(avatar).append(avatarSFX);		

	$(avatarContainer).append(avatar);

    await listenToUpdates();
    let data = await parseData(progressContainer);
    await onRender(container, data);	
}
init();

//ian begin here:






let firstRun = true;
let lastRun = Date.now();

function commonRender(container, data) {
	if ((!firstRun) && (Date.now() - lastRun) < 1000) {
		//console.log("EARLY EXIT");
		return;
	}
	lastRun = Date.now();
	firstRun = false;
	
	let newProgressData = [];
	for (let i = 0; i < data.chapters.length; i++) {
		let chapter = data.chapters[i];
		console.log("what ", i, chapter);
		newProgressData.push(chapter.progress);
	}
	console.log(newProgressData);
	
	let progressMade = false;
	let progressText = ""; //"Just a sensible line of text for testing purposes";
	
	for (let i = 0; i < progressData.length; i++) {
		//if (true) { //TODO newProgressData[i][0] > progressData[i][0]) {
		if (newProgressData[i][0] > progressData[i][0] && data.chapters[i].isCurrent) {
			console.log("Progress made on chapter", i + 1, "from", progressData[i][0], "to", newProgressData[i][0]);
			progressMade = true;
			
			let sectionName = data.chapters[i].name;

			/*let sectionName = "Module " + (i);
			if (i == 0) {
				sectionName = "Introduction";
			} else if (i == 6) {
				sectionName = "Completion";
			} else if (i == 7) {
				sectionName = "Graduation";
			}*/
			
			progressText = "Well done! You have completed another step of " + sectionName;
			if (newProgressData[i][0] == newProgressData[i][1]) {
				//console.log("Completed chapter", i);
				progressText = "Congratulations! You've completed " + sectionName;
			}
		}
	}

	//progressData = newProgressData;

    onRenderAvatar(avatarContainer, data, progressMade, progressText);
}

async function onRender(container, data)
{
	//console.log("ON RENDER");
	commonRender(container, data);

    //$(container).html("ian stuff here"+JSON.stringify(data));
	for (var element of Object.values(data.chapters)) {
		//group.addClass("p").text("" + JSON.stringify($(this).attr("isActive")));
		//console.log("boop: " + element.isActive);
	}
}

async function onReRender(container, data)
{
	//console.log("ON RE-RENDER");
	commonRender(container, data);
		
    //$(container).html("ian stuff here (Rerendered)"+JSON.stringify(data));
}

let animationFinished = true;

async function onRenderAvatar(avatarContainer, data, progressMade, progressText)
{
    //$(avatarContainer).css("background-color", "white");//so you can see it
    //$(avatarContainer).html("ian avatar stuff here");


	if (progressMade) {
		console.log("AVATAR SAYS:", progressText);
		if (avatarSpeechBubbleText) {
			avatarSpeechBubbleText.text(progressText);
		}
		
		if (animationFinished) {	
			animationFinished = false;
			
			$(avatarContainer).show();
			$(avatarContainer).fadeIn(ANIMATION_CONTAINER_FADE_IN).delay(ANIMATION_SHOW_FEEDBACK_DURATION).fadeOut(ANIMATION_CONTAINER_FADE_OUT);
			
			/*$(avatar).animate({
				transform: 'translateY(-100%)'
			}, {
				duration: 500,
				easing: 'easeOutSine' 
			});*/
			
			/*setTimeout(() => {
				avatar.css('transform', 'translateY(0)'); // Slide into view
			}, 2000); // Delay before animation starts
			*/
			
			animateY(avatar, 0, ANIMATION_CONTAINER_EASE_IN, 100, 0);
			//TODO animateY(avatar, ANIMATION_CONTAINER_FADE_IN + ANIMATION_SHOW_FEEDBACK_DURATION, ANIMATION_CONTAINER_EASE_OUT, 0, 100);

			//animateScaleLooped(avatarImage, 500, 3000, 0.95, 1.05, 1, 1);

			let sfx = document.getElementById('avatarSFX');
			sfx.play();
			
			setTimeout(() => {
				animationFinished = true;
			}, ANIMATION_CONTAINER_FADE_IN + ANIMATION_SHOW_FEEDBACK_DURATION + ANIMATION_CONTAINER_FADE_OUT);
		}
	} else {
		console.log("HIDING AVATAR");
		$(avatarContainer).hide();
	}
}


function animateY(ele, delayDuration, duration, startY, endY) {
	let startTime;
    function animationStep(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min(1, (timestamp - startTime) / duration);

        // Easing (Optional - include jQuery UI for more easing options)
        //const easedProgress = progress; // Linear easing (no jQuery UI)
        const easedProgress = jQuery.easing.easeOutQuad(progress); 

        const currentY = startY + (endY - startY) * easedProgress;
        ele.css('transform', `translateY(${currentY}%)`);

        if (progress < 1) {
            requestAnimationFrame(animationStep);
        }
    }

	setTimeout(() => {
		requestAnimationFrame(animationStep); // Start the animation
	}, delayDuration);
}


function animateScaleLooped(ele, delayDuration, duration, minX, maxX, minY, maxY) {
	let startTime;
    function animationScaleStep(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.sin((timestamp - startTime) / duration * 2 * Math.PI) % 1.0;

        // Easing (Optional - include jQuery UI for more easing options)
        //const easedProgress = progress; // Linear easing (no jQuery UI)
        const easedProgressX = jQuery.easing.easeInOutSine(progress); 
        const currentX = minX + (maxX - minX) * easedProgressX;

        const easedProgressY = jQuery.easing.easeInOutSine(progress + 0.5); 
        const currentY = minY + (maxY - minY) * easedProgressY;
		const offsetY = 1 - currentY;
        ele.css('transform', `scaleX(${currentX}) scaleY(${currentY}) translateY(${offsetY}%)`);

        if (progress < 100000000) {
            requestAnimationFrame(animationScaleStep);
        }
    }

	setTimeout(() => {
		requestAnimationFrame(animationScaleStep); // Start the animation
	}, delayDuration);
}






let events = [];
function init_recording()
{
    console.log("init_recording");
	// Function to record key presses
	document.addEventListener('keydown', (event) => {
        //make sure the event event doesnt happen on password fields
        if ($(event.target).attr("type") == "password") return;

        events.push({
            type: 'keypress',
            timestamp: Date.now(),
            key: event.key,
            code: event.code,
        });
	});

	// Function to record mouse movements
	document.addEventListener('mousemove', (event) => 
    {
        events.push({
            type: 'mousemove',
            timestamp: Date.now(),
            screen_x: event.clientX,
            screen_y: event.clientY,
            page_x: event.pageX,
            page_y: event.pageY,
        });
	});

	// Function to record mouse clicks
	document.addEventListener('click', (event) => 
    {
        let e = {
            type: 'click',
            timestamp: Date.now(),
            screen_x: event.clientX,
            screen_y: event.clientY,
            page_x: event.pageX,
            page_y: event.pageY,
            button: event.button,
        };
        record_event_target_text(event.target, e);
	    events.push(e);
	});

	document.addEventListener('mousedown', (event) => 
    {
        let e = {
            type: 'mousedown',
            timestamp: Date.now(),
            screen_x: event.clientX,
            screen_y: event.clientY,
            page_x: event.pageX,
            page_y: event.pageY,
            button: event.button,
        };
        record_event_target_text(event.target, e);
        events.push(e);
	});

	document.addEventListener('mouseup', (event) => {
        let e = {
            type: 'mouseup',
            timestamp: Date.now(),
            screen_x: event.clientX,
            screen_y: event.clientY,
            page_x: event.pageX,
            page_y: event.pageY,
            button: event.button,
        };
        record_event_target_text(event.target, e);
	    events.push(e);
	});

    //listen to a change in the url bar
    let oldLocation = location.href;
    setInterval(function() {
        if(location.href != oldLocation) {
            // do your action
            events.push({
                type: 'urlchange',
                timestamp: Date.now(),
                oldLocation: oldLocation,
                newLocation: location.href
            });
            oldLocation = location.href
        }
    }, 100);
}

function record_event_target_text(sourceElement, eventObj) 
{
    // get the first 8 chars of the element clicked if it has text()
    // get the first 8 chars of the closest parent with an (id) element if it has text()

    if ($(sourceElement).text().length > 0) {
        eventObj.element = $(sourceElement).text().substring(0, ANALYTICS_TEXT_EXCERPT_LENGTH);
    }
    //search for nearest element with ID
    let parent = $(sourceElement).closest("[id]");
    if (parent.length > 0) {
        eventObj.parentElement = parent.text().substring(0, ANALYTICS_TEXT_EXCERPT_LENGTH);
        eventObj.parentElementID = parent.attr("id");
    }

    //debug out for now
    if (eventObj.element || eventObj.parentElement) {
        console.log("Element:", eventObj.element, "Parent:", eventObj.parentElement, "ParentID:", eventObj.parentElementID);
    }
}

let last_length = 0;
// Function to send the recorded events to a database (implementation will vary)
function send_recordingDataToDatabase() {
	// Code to send the 'events' array to your database
	if (events.length > last_length) {
		console.log("Tracked", events.length - last_length, "user input events since last snapshot");
		console.log('Sending data to database:', events);
		
        let data = JSON.stringify(events);
        let timestamp = events[0].timestamp;
		events = [];
		last_length = 0; //events.length;

        //send through as user_id, course_user_id, timestamp, data POST fields
		fetch(ANALYTICS_URL, {
		   method: 'POST',
              headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({user_id: window.USER_ID, timestamp, data})
        });
	}
}

if (ENABLE_ANALYTICS) 
{
    // start recording of inputs
    init_recording();

    // Example of how to call the function to send data (e.g., every 30 seconds)
    setInterval(send_recordingDataToDatabase, ANALYTICS_INTERVAL);
}















//lindsay's private don't touch ;)
async function parseData(progressContainer)
{
    var data = {};
    var user_progress_container = $(progressContainer).find("#user_progress_container");
    var progress_quiz_container = $(progressContainer).find("#progress_quiz_container");

    var chapters = [];
    $(user_progress_container).find("li").each(function(e)
    {
        var name = $(this).find(".chapter-name-text").text();
        var progress = $(this).find(".page-num-text").text().split("/");
        var isActive = $(this).hasClass("active");
        var isCurrent = $(this).find(".badge-user:visible").length > 0;
        var onClick = $(this).attr("onclick");
        chapters.push({name, progress,isActive,isCurrent,onClick});

    });
    data.chapters = chapters;

    var quizzes = [];
    $(user_progress_container).find(".badge-quiz").each(function(e)
    {
        if ( $(this).data("original-title"))
        {
            var name = $(this).data("original-title").replace("Quiz: ","");
            quizzes.push({name});
        }
    });
    $(progress_quiz_container).find("tr").each(function(e)
    {
        if ($(this).find("h5").length == 0)
        {
            //console.log("skip");
            return;
        }
        var title = $(this).find("td:first h5").text();
        var score = $(this).find(".label").text();
        var retryClick = $(this).find("button").attr("onclick");
        //use the title to update the quiz with teh matching name
        var quiz = quizzes.find(q=>q.name == title);
        if (quiz)
        {
            quiz.score = score;
            quiz.retryClick = retryClick;
        }
    });
    data.quizzes = quizzes;

	let chapterProgress = $(".chapter-progress");
	//console.log(chapterProgress);
	let t = chapterProgress.text();
	//console.log(t);

	// Split the text at the colon to separate chapter name and page info
	const parts = t.split(/:(?!.*:)/);

	console.log(parts);

	if (parts.length === 2) {
		let chapterName = parts[0].trim(); // Trim whitespace
		
		const ppp = chapterName.split(':');
		if (ppp.length === 2) {
			chapterName = ppp[0];
		}
		
		const pageInfo = parts[1].trim();

		// Extract page number using a regular expression
		const pageMatch = pageInfo.match(/Page (\d+) of (\d+)/); // \d+ matches one or more digits
		if (pageMatch) {
			const pageNumber = parseInt(pageMatch[1], 10); // Convert to integer
			const pageTotal = parseInt(pageMatch[2], 10); // Convert to integer
			console.log("Chapter Name:", chapterName);
			console.log("Page Number:", pageNumber);
			console.log("Page Total:", pageTotal);

			for (let i = 0; i < data.chapters.length; i++) {
				let chapter = data.chapters[i];
				
				if (chapter.name == chapterName) {
					chapter.isCurrent = true;
					chapter.progress[0] = pageNumber;
					chapter.progress[1] = pageTotal;
				}
			}
		}
	}
	
    console.log({data});
    return data;
} 

async function listenToUpdates()
{
    var temp = View.renderCourseNav;
    View.renderCourseNav = async function(...args) 
    {
        temp(...args);
		//console.log("GETTING DATA");
        var data = await parseData(progressContainer);
        await onReRender(container, data);
    };
}