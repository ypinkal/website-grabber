let ASPPageConverter = require('./app/index');

let aspPages = [
    {
        url: 'https://learntest.centennialcollege.ca',
        folderName: 'test'
    },
    {
        url: 'https://cnaqatartest.brightspace.com',
        folderName: 'test2'
    }
];

let aspPageConverter = new ASPPageConverter();

aspPageConverter.convert(aspPages);

