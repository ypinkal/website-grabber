let Processor = require('./processor');

class ImagesProcessor extends Processor {
    constructor(folderFullPath, url) {
        super(folderFullPath, url);

        this._IMAGES_FOLDER_NAME = "images";
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
            let imageStream = this.fs.createWriteStream(file.name);

            imageStream.on('close', function() {
                console.log('file done');
                resolve(file.name);
            });

            console.log(file.path);

            this.request.get(file.path)
                .on('error', (err) => {
                    console.log(err);
                    reject();
                })
                .pipe(imageStream);
        })
    }
}

module.exports = ImagesProcessor;