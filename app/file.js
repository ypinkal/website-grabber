let fs = require('fs');

class File {
    constructor({path, data}) {
        this.path = path;
        this.data = data;
    }

    write() {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.path, this.data,  function(err) {
                if (err) {
                    return reject(err);
                }

                resolve();
            });
        });
    }
}

module.exports = File;