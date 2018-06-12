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
    async.eachSeries(files, function(file, done) {
        var infoFilePath = path.resolve(file),
            article = require(infoFilePath),
            htmlFilePath = infoFilePath.replace('info.json', 'content.html'),
            pdfFilePath = infoFilePath.replace('info.json', article.code + '.pdf'),
            audioFilePath = infoFilePath.replace('info.json', article.code + '.mp3'),
            pdfFilePathExist = fs.existsSync(pdfFilePath),
            audioFilePathExist = fs.existsSync(audioFilePath),
            htmlFilePathExist = fs.existsSync(htmlFilePath);
        console.log(`========================= ::: ${article.code} ::: =========================`);
        if (!(pdfFilePathExist && audioFilePathExist && htmlFilePathExist)) {
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
                    var content = $('.widget-richtext').html();
                    if (content && !htmlFilePathExist) {
                        console.log('======>>>> write content to : ', htmlFilePath);
                        shell.echo(content).to(htmlFilePath);
                    }
                    delete article.crawl_failed;
                    article.done = true;
                    shell.echo(JSON.stringify(article)).to(file);
                    if (article.audio && !audioFilePathExist) {
                        console.log('======>>>> download : ', article.audio, ' to : ', audioFilePath);
                        request
                            .get(article.audio)
                            .pipe(fs.createWriteStream(audioFilePath))
                    }
                    if (article.pdf && !pdfFilePathExist) {
                        console.log('======>>>> download : ', article.pdf, ' to : ', pdfFilePath);
                        request
                            .get(article.pdf)
                            .pipe(fs.createWriteStream(pdfFilePath))
                    }
                    ok();
                    done();
                }
            });
            c.queue(article.url);
        } else {
            done();
        }
    }, function() {
        console.log(`========================= ::: DONE ::: =========================`);
    });
})