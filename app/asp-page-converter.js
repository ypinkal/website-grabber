let fs = require('fs');
let Page = require('./page');

class ASPPageConverter {
    constructor() {
        /**
         * Array of pages to convert
         * @type {Array}
         * @private
         */
        this._aspPages = [];

        this._convertedPages = [];

        this._OUTPUT_DIR = 'output';
    }

    convert(aspPages) {
        this._aspPages = aspPages;

        console.log(`Convert ${this._aspPages.length} pages`);

        this.prepareOutputFolder();

        this._aspPages.forEach(aspPage => {
            let page = new Page(aspPage, this._OUTPUT_DIR);
            page.convert();
            this._convertedPages.push(page);
        });
    }

    prepareOutputFolder() {
        if (fs.existsSync(this._OUTPUT_DIR)){
            this.deleteFolderRecursive(this._OUTPUT_DIR);
        }

        fs.mkdirSync(this._OUTPUT_DIR);
    }

    deleteFolderRecursive(path) {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach((file, index) => {
                let curPath = path + "/" + file;
                if(fs.lstatSync(curPath).isDirectory()) { // recurse
                    this.deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });

            fs.rmdirSync(path);
        }
    }
}

module.exports = ASPPageConverter;