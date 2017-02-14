let ASPPageConverter = require('./app/index');

let aspPages = [
    {
        url: 'https://learntest.centennialcollege.ca',
        folderName: 'dd49d4cd-6dfa-4ad7-8e24-fca8f2cb8990'
    },
    {
        url: 'https://cnaqatartest.brightspace.com',
        folderName: 'test'
    }
];

let aspPageConverter = new ASPPageConverter();

aspPageConverter.convert(aspPages);

