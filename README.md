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
`node discord.js server_name channel name`

e.g.

`node discord.js "KIT305-607 2021" lecture-chat`

`node discord.js "KIT109 2020" lecture-chat`

Then use the channel-name.txt file in OBS.
For the poll, use poll.txt file in OBS.

To remove the poll from the screen, just type `/clearpoll` into the channel

## TODO
Output file as parameter
Graphics / browser source for OBS
For fun: "latest vote: XX for YY"