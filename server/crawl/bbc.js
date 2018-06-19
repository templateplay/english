'use strict';

var utils = require('../lib/utils'),
    config = require('config'),
    categories = config.bbc_categories,
    fs = require('fs'),
    shell = require('shelljs'),
    Crawler = require('crawler');

const crawl = (category) => {
    console.log(`========>>> [START] ${category.name}`);
    var dir = `./data/bbc/${utils.slug(category.name)}`;
    shell.mkdir('-p', dir);
    return new Promise(resolve => {
        new Crawler({
            maxConnections: 10,
            callback: function(error, res, ok) {
                var $ = res.$,
                    elm = $('.widget h2 a'),
                    length = elm ? elm.length : 0;
                $('.widget h2 a').each(function(index, a) {
                    var lastItem = index === length - 1;
                    var url = $(a).attr('href');
                    if (url && url.indexOf('http:') === -1) {
                        url = 'http://www.bbc.co.uk' + url;
                        url = url.toLowerCase();
                        var name = $(a).text(),
                            code = utils.slug(name),
                            filePath = `${dir}/${code}/info.json`;
                        if (fs.existsSync(filePath)) {
                            console.log(`========>>> ${code} :: existed`);
                            ok();
                            resolve();
                        } else {
                            var box = $(a).parent().parent();
                            var description = $(box).find('p').first().text();
                            var image = $(box).parent().find('.img img').first().attr('src');
                            var date = $(box).find('.widget-bbcle-coursecontentlist .text .details h3').first().text();
                            if (date && date.split('/').length > 0) {
                                date = date.split('/')[1].trim() + ' GMT+0000';
                                date = new Date(date).toISOString();
                            } else {
                                date = null;
                            }
                            shell.mkdir('-p', `${dir}/${code}`);
                            var lesson = {
                                url: url,
                                name: name,
                                code: code,
                                description: description,
                                published: date,
                                image: image
                            };
                            console.log(`========>>> ${code} :: added`);
                            shell.echo(JSON.stringify(lesson)).to(filePath);
                            ok();
                            resolve();
                        }
                    }
                });
            }
        }).queue(category.url);
    });
};

(async () => {
    for (let category of categories) {
        await crawl(category);
    };
})();