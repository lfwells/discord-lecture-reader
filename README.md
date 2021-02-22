# A really basic channel reader for Discord
This app is just to write the contents of a given channel to file, for use in OBS

It could be so much more ;)

## Installation
Requires node.js

Dependencies

`npm install discord.js`

Add bot to your server with invite link
[https://discord.com/api/oauth2/authorize?client_id=811958340967071745&permissions=8&redirect_uri=https%3A%2F%2Fplayur.io&scope=bot]

## Usage
`node discord.js server_name channel_name`

e.g.

`node discord.js "KIT305-607 2021" lecture-chat`

`node discord.js "KIT109 2020" lecture-chat`

### Reading a channel (NB: Discord has an official better one)
Use the `<channel_name>.txt` file in OBS.

### Reading a poll 
Use the poll.txt file in OBS.

To remove the poll from the screen, just type `/clearpoll` into the channel.

### Triggering a pre-defined poll via URL
Navigate to:

`http://localhost:1090/?<poll info here>`

e.g.

`http://localhost:1090/?/poll%20%22Test%20Scheduled%20Polls%20are%20great?%22%20%22yes%22%20%22no%22%20%22maybe%22`

(if making this link in powerpoint etc, you don't need to write `%20` or `%25` yourself, these are just spaces and double-quotes that will get automatically changed)

Use simple-poll format for polls. See [https://top.gg/bot/simplepoll].

You can clear the poll on this page by clicking the button or navigating to `http://localhost:1090/?/clearpoll`.

## TODO
Graphics / browser source for OBS, or just ignore formatting
For fun: "latest vote: XX for YY" (actually is hard)

but im thinking about a longer term solution where we effectively have a "dashboard" that can do heaps of stuff, like:
- a list of polls you can just click on to post
- a button for enabling/disabling breakout rooms
- a button for clearing a channel, or posting an announcement or all sorts of cool shit

