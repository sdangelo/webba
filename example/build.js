#!/usr/bin/env node

var Webba = require("../webba.js");
Webba.init(__dirname);

Webba.Crea.createPhonyTask("default", ["pages", "extra"]);

Webba.Crea.run(process.argv[2] ? process.argv[2] : "default");
