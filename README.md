# A really basic channel reader for Discord
This app is just to write the contents of a given channel to file, for use in OBS

It could be so much more ;)

## Installation
Requires node.js

Dependencies

`npm install discord.js`

## Usage
`node discord.js server_name channel name`

e.g.

`node discord.js "KIT305-607 2021" lecture-chat`

`node discord.js "KIT109 2020" lecture-chat`

Then use the channel-name.txt file in OBS.
For the poll, use poll.txt file in OBS.

## TODO
Channel id and simplebot id as params not ignored
Output file as parameter
Graphics / browser source for OBS
bot command to clear poll from screen /clearpoll