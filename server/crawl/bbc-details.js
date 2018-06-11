'use strict';

var utils = require('../lib/utils'),
    config = require('config'),
    categories = config.bbc_categories,
    glob = require('glob'),
    request = require('request'),
    fs = require('fs'),
    shell = require('shelljs'),
    _ = require('lodash'),
    path = require('path'),
    async = require('async'),
    Crawler = require('crawler');

glob("./data/bbc/**/info.json", function(er, files) {
    console.log('files ::: ', files);
    async.eachSeries(files, function(file, done) {
        var article = require(path.resolve(file));
        // if (article.done) {
        var c = new Crawler({
            maxConnections: 10,
            callback: function(error, res, ok) {
                var $ = res.$;
                var pdf = $('.bbcle-download-extension-pdf').attr('href');
                if (!pdf)
                    pdf = $('a[href*=".pdf"]').first().attr('href');
                if (pdf)
                    pdf = pdf.toLowerCase();
                if (!utils.isValidPdf(pdf))
                    pdf = '';

                var audio = $('.bbcle-download-extension-mp3').attr('href');
                if (!audio)
                    audio = $('a[href*=".mp3"]').first().attr('href');
                if (!audio)
                    audio = $('a[href*=".wav"]').first().attr('href');
                if (audio)
                    audio = audio.toLowerCase();
                if (!utils.isValidAudio(audio))
                    audio = '';

                if (audio)
                    article.audio = audio;
                if (pdf)
                    article.pdf = pdf;
                if (!pdf) {
                    var content = $('.widget-richtext').html();
                    if (content)
                        article.content = content;
                }
                delete article.crawl_failed;
                article.done = true;
                shell.echo(JSON.stringify(article)).to(file);
                if (article.audio) {
                    var extension = _.last(article.audio.split('.')),
                        name = `${article.code}.${extension}`;
                    request
                        .get(article.audio)
                        .on('error', function(err) {
                            console.log(err);
                        })
                        .pipe(fs.createWriteStream(`${file.replace('info.json', name)}`))
                }
                ok();
                done();
            }
        });
        c.queue(article.url);
        // } else {
        //     done();
        // }
    }, function() {
        done();
    });
})