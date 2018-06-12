'use strict';

var utils = require('../lib/utils'),
    config = require('config'),
    categories = config.bbc_categories,
    lessons = [],
    fs = require('fs'),
    shell = require('shelljs'),
    _ = require('lodash'),
    path = require('path'),
    async = require('async'),
    Crawler = require('crawler');

console.log('[BBC] start');
async.waterfall([
    //crawl list
    function(done) {
        console.info('[BBC.categories] start', {
            categories: categories.length
        });
        async.eachSeries(categories, function(category, done) {
            var dir = `./data/bbc/${utils.slug(category.name)}`;
            // console.log('=====>>> dir : ', dir);
            shell.mkdir('-p', dir);
            var c = new Crawler({
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
                            var name = $(a).text();
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
                            var code = utils.slug(name);
                            shell.mkdir('-p', `${dir}/${code}`);
                            var lesson = {
                                url: url,
                                name: name,
                                code: code,
                                description: description,
                                published: date,
                                image: image
                            };
                            lessons.push(lesson);
                            shell.echo(JSON.stringify(lesson)).to(`${dir}/${code}/info.json`);
                            ok();
                        }
                    });
                }
            });
            c.queue(category.url);
        }, function(err) {
            done();
        });
    }
], function(err, result) {
    console.log('[BBC] finish');
    done();
});