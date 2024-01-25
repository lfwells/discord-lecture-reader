//Init
console.log("Modifying MyLO Homepage", window.parent.$);
$ = window.parent.$;

//this approach to getting the announcement didn't work, due to shadow-roots...
//var overrideFrame = $(".mylo_homepage_override_frame");
//var announcementsPanel = overrideFrame.parent(".d2l-widget");

//find the unit information panel (first row in the main column)
var unitInformationPanel = $(".homepage-col-8 > div:nth-child(1)");
unitInformationPanel.hide();

//find the announcements panel (second row in the main column)
var announcementsPanel = $(".homepage-col-8 > div:nth-child(2)");

var mylo_homepage_override_announcement = $(".d2l-datalist-item d2l-html-block")
    .get()
    .map(block => [
        $(block.shadowRoot).find("iframe").get(),
        block
    ])
    .filter(found => found[0].length == 1)[0];
    
mylo_homepage_override_announcement = mylo_homepage_override_announcement[1];//.parent(".d2l-widget-content-padding");
console.log({mylo_homepage_override_announcement}); 
//mylo_homepage_override_announcement.html("yo"); 

mylo_homepage_override_announcement = $(mylo_homepage_override_announcement).parent().parent().parent().parent();
console.log({mylo_homepage_override_announcement}); 

mylo_homepage_override_announcement.html('<iframe width="100%" height="450" src="https://utasbot.dev/chat/1199781171408670751?previous_messages=10&mylo=true" />');

//announcementsPanel.html("yo");

//This selector can hide the entire top-navigation bar
//$("d2l-navigation").html("yo");