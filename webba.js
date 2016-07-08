/*
 * Copyright (C) 2016 Stefano D'Angelo <zanga.mail@gmail.com>
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

module.exports = {
	path:		require("path"),
	Crea:		require("crea"),
	Marca:		require("marca"),
	doT:		require("dot"),

	pageTemplateFile:	null,
	pageTemplate:		null,

	init: function (topDirectory, opt) {
		this.Crea.init(topDirectory);
		require("crea-deps")(this.Crea);

		require("marca-hypertext")(this.Marca);
		require("marca-hypertext-tohtml")(this.Marca);

		var _self = this;

		this.pageTemplateFile = this.path.join("templates", "page.dot");

		var pagePostParse = opt ? opt.pagePostParse : null;
		var pageData = {};
		function parsePage (page, url, contentFile) {
			if (page in pageData)
				return;

			console.log("Parsing static page " + page);

			var root = _self.Marca.parse(
					_self.Crea.fs.readFileSync(
						_self.path.join(
							_self.Crea.topDirectory,
							contentFile), "utf8"));
			var dom = Object.create(
					_self.Marca.DOMElementHypertextRoot);
			dom.init(root, _self.Marca.HypertextElementProtos);

			pageData[page] = { url: url, dom: dom };

			if (pagePostParse)
				pagePostParse(_self, pageData[page]);
		};

		var pagesDir = this.path.join("content", "pages");
		var pageTargets = [];
		var pages = this.Crea.fs.readdirSync(this.getTopPath(pagesDir))
				.filter(function (value)
					{ return /.marca$/.test(value); });
		var pageUrlFunc = opt ? opt.pageUrl : null;
		var pageOutFileFunc = opt ? opt.pageOutFile : null;
		for (var i = 0; i < pages.length; i++) {
			(function(){
			var page = pages[i].slice(0, -6);
			var contentFile = _self.path.join(pagesDir,
							  page + ".marca");
			var url = pageUrlFunc ? pageUrlFunc(_self, page)
					      : page + ".html";
			var outFile = _self.path.join("build", "out",
					pageOutFileFunc
					? pageOutFileFunc(_self, page)
					: page + ".html");
			var depFile = _self.path.join("build", "deps",
						      page + ".json");

			_self.Crea.createFileTaskWithDeps(outFile,
				[_self.pageTemplateFile, contentFile],
				function () {
					_self.parsePageTemplate();
					parsePage(page, url, contentFile);
					console.log("Generating static page "
						    + page);
					_self.generatePage(url,
						pageData[page].dom, outFile);
				},
				depFile,
				function () {
					parsePage(page, url, contentFile);
					return _self.getPageDeps(
							pageData[page].dom);
				});
			pageTargets.push(outFile);
			})();
		}
		this.Crea.createPhonyTask("pages", pageTargets);

		var extraTargets = [];
		var extra = this.Crea.fs.readdirSync(this.getTopPath("extra"));
		for (var i = 0; i < extra.length; i++) {
			(function(){
			var url = extra[i];
			var src = _self.path.join("extra", url);
			var dest = _self.path.join("build", "out", url);
			_self.Crea.createFileTask(dest, src,
				function () {
					console.log("Copying extra content "
						    + url);
					_self.Crea.fs.copySync(
						_self.getTopPath(src), dest);
				});
			extraTargets.push(dest);
			})();
		}
		this.Crea.createPhonyTask("extra", extraTargets);

		this.Crea.createPhonyTask("clean", [],
			function () {
				console.log("Cleaning up");
				_self.Crea.fs.removeSync("build");
			});
	},

	getTopPath: function (path) {
		return this.path.join(this.Crea.topDirectory, path);
	},

	parsePageTemplate: function () {
		if (this.pageTemplate)
			return;

		console.log("Parsing page template");
		this.pageTemplate = this.doT.template(this.Crea.fs.readFileSync(
					this.getTopPath(this.pageTemplateFile),
					"utf8"));
	},

	getPageDeps: function (dom) {
		var ret = dom.meta.cssincludes ? dom.meta.cssincludes.slice()
					       : [];
		if (dom.meta.jsincludes)
			ret = ret.concat(dom.meta.jsincludes);
		return ret;
	},

	generatePage: function (url, dom, outFile, dataProcess)
	{
		var data = Object.create(dom.meta);
		data.url = url;
		data.dom = dom;
		data.Webba = this;
		if (dataProcess)
			dataProcess(data);
		this.Crea.fs.outputFileSync(outFile, this.pageTemplate(data));
	}
};

module.exports.doT.templateSettings.strip = false;
