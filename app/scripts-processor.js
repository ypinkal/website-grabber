let Processor = require('./processor');

class ScriptsProcessor extends Processor {
    constructor(folderFullPath, url) {
        super(folderFullPath, url);

        this._SCRIPT_FOLDER_NAME = 'js';
        this._SCRIPT_FILES_NAME_TEMPLATE = 'script_';
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
                .then((updatedHtml) => {
                    console.log();
                    console.log('Processing scripts completed');
                    resolve(updatedHtml);
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
            this.request(fullScriptPath, (error, response, body) => {
                if (error) {
                    console.log(error);
                    reject();
                }

                this.fs.writeFile(scriptSavePath, body, () => {
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
            this.fs.writeFile(path, scriptTagData, () => {
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
            this.updateHtmlSource(result);
        });

        return new Promise((resolve, reject) => {
            let filename = `${this.folderFullPath}/index_afterRemovingInjectedScripts.html`;
            this.fs.writeFile(filename, this.$.html(), () => {
                let filename = `${this.folderFullPath}/index.html`;
                this.fs.writeFile(filename, this.$.html(), () => {
                    resolve(this.$.html());
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

module.exports = ScriptsProcessor;