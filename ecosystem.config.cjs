module.exports = {
  apps : [{
        "name": "Discord",
        "script": "discord.js",
        "watch": true,
        "ignore_watch" : ["node_modules", "sessions", "www", "views", "json", "logs"],
        "watch_options": {
            "followSymlinks": false,
            "usePolling": true
        },
        error_file: "./logs/error.log",
        log_date_format: "YYYY-MM-DD HH:mm:ss Z",
        out_file: "./logs/output.log",
    }]
}