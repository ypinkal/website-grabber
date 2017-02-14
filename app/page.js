let request = require('request');
let fs = require('fs');
let cheerio = require('cheerio');
let File = require('./file');

class Page {
    constructor(aspPage, baseDir) {
        this._baseDir = baseDir;
        this.url = aspPage.url;
        this.folderName = aspPage.folderName;
        this.folderFullPath = `${this._baseDir}/${this.folderName}`;

        this.html = '';
        this.$ = null;

        this._IMAGES_FOLDER_NAME = "images";
        this._STYLES_FOLDER_NAME = "css";
        this._STYLE_FILES_NAME_TEMPLATE = 'style_';
        this._SCRIPT_FOLDER_NAME = 'js';
        this._SCRIPT_FILES_NAME_TEMPLATE = 'script_';
    }

    convert() {
        this.createFolder(this._baseDir, this.folderName)
            .then(() => this.requestPage(this.url))
            .then(html => this.processRawHTML(html))
            .catch(error => { console.log(error) })
            .then(() => this.processImages())
            .catch(error => { console.log(error) })
            .then(() => this.processStyles())
            .catch(error => { console.log(error) })
            .then(() => this.processScripts())
            .catch(error => { console.log(error) });
    }

    createFolder(baseDir, folderName) {
        let folderFullPath = `${baseDir}/${folderName}`;
        return new Promise((resolve, reject) => {
            fs.mkdir(folderFullPath, (err) => {
                if (err) {
                    reject(err);
                }

                resolve(folderFullPath);
            });
        });

    }

    requestPage(url) {
        return new Promise((resolve, reject) => {
            request(url, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    resolve(body);
                } else {
                    reject(error);
                }
            });
        });
    };

    processRawHTML(html) {
        this.updateParsedHtml(html);

        let filename = `${this.folderFullPath}/index_beforeParsing.html`;

        return new Promise((resolve, reject) => {
            fs.writeFile(filename, this.$.html(), (err) => {
                if (err) {
                    reject(err);
                }

                resolve(filename);
            });
        });
    }

    updateParsedHtml(updatedHtml) {
        console.log(`updateParsedHtml:`);

        this.html = updatedHtml;
        this.$ = cheerio.load(updatedHtml);
    }

    processImages() {
        console.log("Processing images");

        return new Promise((resolve, reject) => {
            this.analyzeImgTags()
                .then((imagesToDownload) => this.downloadImages(imagesToDownload))
                .then((downloadedImages) => {
                    console.log(downloadedImages);
                    console.log('Processing images completed');
                    resolve();
                });
        });
    }

    analyzeImgTags() {
        let images = this.$('img');

        let imagesToDownload = this.getImagesToDownload(images);

        return new Promise((resolve, reject) => {
            resolve(imagesToDownload);
        });
    }

    getImagesToDownload(images) {
        let _imageSrc = '';
        let _imagesToDownload = [];
        let _downloadPath = '';
        let _savePath = '';
        let _imageName = '';

        for (let i = 0; i < images.length; i++) {
            _imageSrc = images[i].attribs.src;

            if (_imageSrc.startsWith("/d2l/")) {
                console.log(`getImagesToDownload: skipping ${_imageSrc}`);
            } else {
                _imageName = _imageSrc.split("/").pop();
                _downloadPath = `${this.url}/${images[i].attribs.src}`;
                _savePath = `${this.folderFullPath}/${this._IMAGES_FOLDER_NAME}/${_imageName}`;

                console.log('getImagesToDownload:');
                console.log(`_imageName: ${_imageName}`);
                console.log(`_downloadPath: ${_downloadPath}`);
                console.log(`_savePath: ${_savePath}`);
                console.log('------------------------------------');

                _imagesToDownload.push({
                    path: _downloadPath,
                    name: _savePath
                });
            }
        }

        return _imagesToDownload;
    }

    downloadImages(images) {
        let downloads = [];

        return new Promise((resolve, reject) => {
            this.createFolder(this.folderFullPath, this._IMAGES_FOLDER_NAME)
                .then(() => {
                    for (let i = 0; i < images.length; i++) {
                        downloads.push(this.downloadImage(images[i]));
                    }})
                .then(() => {
                    Promise.all(downloads)
                        .then((data) => {
                            resolve(data);
                    });
            });
        })
    }

    downloadImage(file) {
        return new Promise((resolve, reject) => {
            let imageStream = fs.createWriteStream(file.name);

            imageStream.on('close', function() {
                console.log('file done');
                resolve(file.name);
            });

            console.log(file.path);

            request.get(file.path)
                .on('error', (err) => {
                    console.log(err);
                    reject();
                })
                .pipe(imageStream);
        })
    }

    processStyles() {
        console.log("Processing styles");

        return new Promise((resolve, reject) => {
            this.downloadLinkedStylesheets()
                .then(() => this.getStyleTags())
                .then((styleTags) => this.createStyles(styleTags))
                .then((stylePaths) => this.changeStylesToLinkTag(stylePaths))
                .then(() => {
                    console.log('Processing styles completed');
                    resolve();
                });

        });
    }

    downloadLinkedStylesheets() {
        console.log(`downloadLinkedStylesheets:`);

        let linkTags = this.$('link[rel="stylesheet"]');

        console.log(`downloadLinkedStylesheets: found ${linkTags.length} links to css stylesheets`);

        let downloads = [];

        for (let i = 0; i < linkTags.length; i++) {
            let linkPath = linkTags[i].attribs.href;

            if (!linkPath
                || linkPath.startsWith('/d2l/')
                || linkPath.startsWith('http')
                || linkPath.startsWith('https')) {

                console.log(`Stylesheet link is rejected: ${linkPath}`);
                continue;
            }

            downloads.push(this.downloadStylesheet(linkTags[i]));
        }

        return new Promise((resolve, reject) => {
            this.createFolder(this.folderFullPath, this._STYLES_FOLDER_NAME)
                .then(
                    Promise.all(downloads)
                        .then(() => {
                        resolve();
                    })
                );
        });
    }

    downloadStylesheet(linkTag) {
        console.log(`downloadStylesheet: ${linkTag.attribs.href}`);

        let stylesheetLink = linkTag.attribs.href;
        let stylesheetName = stylesheetLink.split("/").pop();

        let fullStylesheetPath = `${this.url}/${stylesheetLink}`;
        let stylesheetSavePath = `${this.folderFullPath}/${this._STYLES_FOLDER_NAME}/${stylesheetName}`;

        return new Promise((resolve, reject) => {
            request(fullStylesheetPath, (error, response, body) => {
                if (error) {
                    console.log(error);
                    reject();
                }

                fs.writeFile(stylesheetSavePath, body, () => {
                    resolve();
                });
            });

        });
    }

    getStyleTags() {
        let styleTags = this.$('style');

        console.log(`Number of found style tags in html page: ${styleTags.length}`);

        return new Promise((resolve, reject) => {
            resolve(styleTags);
        });
    }

    createStyles(styleTags) {
        let styles = [];

        return new Promise((resolve, reject) => {
            for (let i = 0; i < styleTags.length; i++) {
                styles.push(this.createStyle(styleTags[i], i));
            }

            Promise.all(styles).then((data) => {
                console.log(data);
                resolve(data);
            });
        })
    }

    createStyle(styleTag, index) {
        let styleTagData = styleTag.children[0].data;

        console.log(`createStyle with index : ${index}`);

        let styleName = `${this._STYLE_FILES_NAME_TEMPLATE}${index}.css`;
        let relativePath = `${this._STYLES_FOLDER_NAME}/${styleName}`;
        let path = `${this.folderFullPath}/${relativePath}`;

        return new Promise((resolve, reject) => {
            fs.writeFile(path, styleTagData, () => {
                // relativePath - because link tags will use relative paths
                resolve(relativePath);
            });

        })
    }

    changeStylesToLinkTag(stylePathArray) {
        console.log('Changing style tags to link tags');

        let closingTagNameLength = 8; // </style>
        let linkTagPrefix = '<link rel="stylesheet" type="text/css" href="';
        let linkTagSufix = '"/>';

        stylePathArray.forEach((path) => {
            let startIndex = this.html.search(/<style/i);
            let endIndex = this.html.search(/<\/style>/i);

            if (startIndex === -1 || endIndex === -1) {
                console.log('changeStylesToLinkTag: Replacement error');
                return;
            }

            let linkTag = `${linkTagPrefix}${path}${linkTagSufix}`;
            let htmlBeforeStyleTag = this.html.slice(0, startIndex);
            let htmlAfterStyleTag = this.html.slice(endIndex + closingTagNameLength);
            let result = `${htmlBeforeStyleTag}${linkTag}${htmlAfterStyleTag}`;

            this.updateParsedHtml(result);
        });

        return new Promise((resolve, reject) => {
            let filename = `${this.folderFullPath}/index_afterRemovingStyleTags.html`;
            fs.writeFile(filename, this.$.html(), () => {
                resolve();
            });
        });
    }

    processScripts() {
        console.log("Processing scripts");

        return new Promise((resolve, reject) => {
            this.downloadLinkedScripts()
                .then(() => this.getInjectedScripts())
                .catch(error => { console.log(error) })
                .then((injectedScripts) => this.createScripts(injectedScripts))
                .catch(error => { console.log(error) })
                .then((scriptPaths) => this.linkCreatedScripts(scriptPaths))
                .catch(error => { console.log(error) })
                .then(() => {
                    console.log();
                    console.log('Processing scripts completed');
                    resolve();
                });
        });
    }

    downloadLinkedScripts() {
        let scripts = this.$('script[src]');

        console.log(`Linked scripts found: ${scripts.length}`);

        let downloads = [];

        for (let i = 0; i < scripts.length; i++) {
            let srcPath = scripts[i].attribs.src;

            if (!srcPath
                || srcPath.startsWith('/d2l/')
                || srcPath.startsWith('http')
                || srcPath.startsWith('https')) {

                console.log(`Script is rejected - Global resource: ${srcPath}`);
                continue;
            }

            downloads.push(this.downloadLinkedScript(scripts[i]));
        }

        return new Promise((resolve, reject) => {
            this.createFolder(this.folderFullPath, this._SCRIPT_FOLDER_NAME)
                .then(() => {
                    Promise.all(downloads)
                        .then((data) => {
                            console.log(data);
                            resolve(data);
                        })
                });
        });
    }

    downloadLinkedScript(script) {
        console.log(`downloadLinkedScript: ${script.attribs.src}`);

        let scriptLink = script.attribs.src;
        let scriptName = scriptLink.split("/").pop();

        let fullScriptPath = `${this.url}/${scriptLink}`;
        let scriptSavePath = `${this.folderFullPath}/${this._SCRIPT_FOLDER_NAME}/${scriptName}`;

        return new Promise((resolve, reject) => {
            request(fullScriptPath, (error, response, body) => {
                if (error) {
                    console.log(error);
                    reject();
                }

                fs.writeFile(scriptSavePath, body, () => {
                    resolve(fullScriptPath);
                });
            });
        });
    }

    getInjectedScripts() {
        let injectedScripts = this.$('script:not([src])');

        console.log(`Injected scripts found: ${injectedScripts.length}`);

        return new Promise((resolve, reject) => {
            resolve(injectedScripts);
        });
    }

    createScripts(injectedScripts) {
        let scripts = [];

        return new Promise((resolve, reject) => {
            for (let i = 0; i < injectedScripts.length; i++) {
                scripts.push(this.createScript(injectedScripts[i], i));
            }

            Promise.all(scripts).then((data) => {
                console.log(data);
                resolve(data);
            });
        });
    }

    createScript(script, index) {
        let scriptTagData = script.children[0].data;

        console.log(`createScript with index : ${index}`);

        let scriptName = `${this._SCRIPT_FILES_NAME_TEMPLATE}${index}.js`;
        let relativePath = `${this._SCRIPT_FOLDER_NAME}/${scriptName}`;
        let path = `${this.folderFullPath}/${relativePath}`;

        return new Promise((resolve, reject) => {
            fs.writeFile(path, scriptTagData, () => {
                // relativePath - because link tags will use relative paths
                resolve(relativePath);
            });

        })
    }

    linkCreatedScripts(scriptPaths) {
        console.log('Linking created scripts and clearing injected scripts');

        let scriptTagPrefix = ' src="';
        let scriptTagSufix = '"><\/script>';

        scriptPaths.forEach((path) => {
            let {
                openingTagStart,
                openingTagEnd,
                closingTagStart,
                closingTagEnd
            } = this.findFirstInjectedScriptIndexes();


            if (openingTagStart === -1
                || openingTagEnd === -1
                || closingTagStart === -1
                || closingTagEnd === -1) {
                console.log(`linkCreatedScripts: Replacement error: ${path}`);

                return;
            }

            let htmlBeforeSrcAttr = this.html.slice(0, openingTagEnd);
            let htmlAfterScriptTag = this.html.slice(closingTagEnd);
            let result = `${htmlBeforeSrcAttr}${scriptTagPrefix}${path}${scriptTagSufix}${htmlAfterScriptTag}`;

            console.log(result);
            this.updateParsedHtml(result);
        });

        return new Promise((resolve, reject) => {
            let filename = `${this.folderFullPath}/index_afterRemovingInjectedScripts.html`;
            fs.writeFile(filename, this.$.html(), () => {
                let filename = `${this.folderFullPath}/index.html`;
                fs.writeFile(filename, this.$.html(), () => {
                    resolve();
                });
            });
        });
    }

    findFirstInjectedScriptIndexes() {
        // let scriptTagsNumber = this.$('script').length || 0;
        let scriptTagsNumber = this.countManuallyScriptTags();

        console.log(`findFirstInjectedScriptIndexes: Total number of script tags: ${scriptTagsNumber}`);

        let nextSearchStartIndex = 0;
        let openingTagNameLength = 8; // <script
        let closingTagNameLength = 9; // </script>

        let openingTagStart = -1;
        let openingTagEnd = -1;
        let closingTagStart = -1;
        let closingTagEnd = -1;

        let srcAttrIndex = -1;

        for (let i = 0; i < scriptTagsNumber; i++) {
            openingTagStart = this.html.indexOf('<script', nextSearchStartIndex);
            openingTagEnd = this.html.indexOf('>', openingTagStart);
            closingTagStart = this.html.indexOf('<\/script>', openingTagEnd);
            closingTagEnd = closingTagStart + closingTagNameLength;

            srcAttrIndex = this.html.indexOf('src=', openingTagStart);

            nextSearchStartIndex = closingTagEnd;

            console.log(`Iteration number: ${i}`);
            console.log(`srcAttrIndex: ${srcAttrIndex}`);

            console.log({
                openingTagStart,
                openingTagEnd,
                closingTagStart,
                closingTagEnd
            });

            if (srcAttrIndex === -1 || srcAttrIndex > openingTagEnd) {
                console.log('Injected script was found');
                console.log(`Index of script tag: ${i}`);

                return {
                    openingTagStart,
                    openingTagEnd,
                    closingTagStart,
                    closingTagEnd
                };
            }
        }

        return {
            openingTagStart: -1,
            openingTagEnd: -1,
            closingTagStart: -1,
            closingTagEnd: -1
        };
    }

    countManuallyScriptTags() {
        let openingTagNameLength = 8; // length of '<script' string
        let scriptOpeningTagIndex = -1;
        let nextSearchStartIndex = 0;
        let counter = 0;

        do {
            scriptOpeningTagIndex = this.html.indexOf('<script', nextSearchStartIndex);

            if (scriptOpeningTagIndex !== -1) {
                counter++;
                nextSearchStartIndex = scriptOpeningTagIndex + openingTagNameLength;
            }
        } while (scriptOpeningTagIndex !== -1);

        return counter;
    }
}

module.exports = Page;