let request = require('request');
let fs = require('fs');

class Processor {
    constructor(folderFullPath, url) {
        this.$ = null;
        this.html = '';

        this.request = request;
        this.fs = fs;

        this.folderFullPath = folderFullPath;
        this.url = url;
    }

    setCheerioObject($) {
        this.$ = $;
        this.html = this.$.html();
    }

    createFolder(baseDir, folderName) {
        let folderFullPath = `${baseDir}/${folderName}`;
        return new Promise((resolve, reject) => {
            this.fs.mkdir(folderFullPath, (err) => {
                if (err) {
                    reject(err);
                }

                resolve(folderFullPath);
            });
        });
    }

    updateHtmlSource(updatedHtml) {
        this.html = updatedHtml;
        this.$.load(updatedHtml);
    }
}

module.exports = Processor;