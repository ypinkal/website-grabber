let request = require('request');
let fs = require('fs');
let cheerio = require('cheerio');
let File = require('./file');

//TODO remove dependencies
let StylesProcessor = require('./styles-processor');
let ImagesProcessor = require('./images-processor');
let ScriptsProcessor = require('./scripts-processor');

class Page {
    constructor(aspPage, baseDir) {
        this._baseDir = baseDir;
        this.url = aspPage.url;
        this.folderName = aspPage.folderName;
        this.folderFullPath = `${this._baseDir}/${this.folderName}`;

        this.html = '';
        this.$ = null;

        this._stylesProcessor = new StylesProcessor(this.folderFullPath, this.url);
        this._imagesProcessor = new ImagesProcessor(this.folderFullPath, this.url);
        this._scriptsProcessor = new ScriptsProcessor(this.folderFullPath, this.url);
    }

    convert() {
        this._stylesProcessor.createFolder(this._baseDir, this.folderName)
            .then(() => this.requestPage(this.url))
            .then(html => this.processRawHTML(html))
            .catch(error => { console.log(error) })
            .then(() => this.processImages())
            .catch(error => { console.log(error) })
            .then(() => this.processStyles())
            .catch(error => { console.log(error) })
            .then((editedHTML) => {
                this.updateParsedHtml(editedHTML);
                return this.processScripts();
            })
            .catch(error => { console.log(error) })
            .then((editedHTML) => {
                this.updateParsedHtml(editedHTML);
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
        console.log(updatedHtml);

        this.html = updatedHtml;
        this.$ = cheerio.load(updatedHtml);
    }

    processImages() {
        this._imagesProcessor.setCheerioObject(this.$);
        return this._imagesProcessor.processImages();
    }

    processStyles() {
        this._stylesProcessor.setCheerioObject(this.$);
        return this._stylesProcessor.processStyles();
    }

    processScripts() {
        this._scriptsProcessor.setCheerioObject(this.$);
        return this._scriptsProcessor.processScripts();
    }

    refactorAfterGrabbing(inputFolderName) {
        console.log('Refactoring after grabbing - Started');

        this.readFilesInFolder(inputFolderName)
            .then(files => this.changeStylesPath(files))
            .catch(error => { console.log(error) })
            // .then(() => this.readFilesInFolder(inputFolderName))
            // .then(files => this.changeScriptsPath(files))
            // .catch(error => { console.log(error) })
            // .then(() => this.readFilesInFolder(inputFolderName))
            // .then(files => this.changeImagesPath(files))
            // .catch(error => { console.log(error) })
            .then(() => {
                console.log('path correction is performed');
            });




    }

    readFilesInFolder(inputFolderName) {
        fs.readdir(inputFolderName,function(err, files){
            if (err) {
                return console.error(err);
            }
            files.forEach( function (file){
                console.log( file );
            });
        });
    }
}

module.exports = Page;