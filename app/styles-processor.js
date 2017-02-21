let Processor = require('./processor');

class StylesProcessor extends Processor {
    constructor(folderFullPath, url) {
        super(folderFullPath, url);

        this._STYLES_FOLDER_NAME = "css";
        this._STYLE_FILES_NAME_TEMPLATE = 'style_';
    }

    processStyles() {
        console.log("Processing styles");

        return new Promise((resolve, reject) => {
            this.downloadLinkedStylesheets()
                .then(() => this.getStyleTags())
                .then((styleTags) => this.createStyles(styleTags))
                .then((stylePaths) => this.changeStylesToLinkTag(stylePaths))
                .then((updatedHtml) => {
                    console.log('Processing styles completed');
                    resolve(updatedHtml);
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
            this.request(fullStylesheetPath, (error, response, body) => {
                if (error) {
                    console.log(error);
                    reject();
                }

                this.fs.writeFile(stylesheetSavePath, body, () => {
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
            this.fs.writeFile(path, styleTagData, () => {
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

            this.updateHtmlSource(result);
        });

        return new Promise((resolve, reject) => {
            let filename = `${this.folderFullPath}/index_afterRemovingStyleTags.html`;
            let html = this.$.html();
            this.fs.writeFile(filename, html, () => {
                resolve(html);
            });
        });
    }
}

module.exports = StylesProcessor;