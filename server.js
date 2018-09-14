var express = require('express');
var fs = require('fs');
var app = express();
var lyrics = require('lyrics-fetcher');
var Spotify = require('node-spotify-api');
var _ = require('lodash');
const path = require('path');
const getColors = require('get-image-colors');
const request = require('request').defaults({
	encoding: null
});
var bodyParser = require("body-parser");

var index = 'www/index.html';
var css = 'css/style.css';
var spotifyID = process.env.SPOTIFYID;
var spotifySecret = process.env.SPOTIFYSECRET;
var port = process.env.SONGCLOUDPORT;

var spotify = new Spotify({
	id: spotifyID,
	secret: spotifySecret
});

app.use('/js', express.static(__dirname + '/js'));
app.use('/file', express.static(__dirname + '/file'));
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());


app.get('/songcloud', function(req, res) {
	var html = fs.readFileSync(index);
	res.writeHead(200, {
		'Content-Type': 'text/html'
	});
	res.end(html);
});

app.get('/songcloud/css/style.css', function(req, res) {
	var html = fs.readFileSync(css);
	res.writeHead(200, {
		'Content-Type': 'text/css'
	});
	res.end(html);
});

app.get('/songcloud/list', function(req, res) {
	var artist = req.query.artist;
	var song = req.query.song;
	getList(artist, song, function(list) {
		res.writeHead(200, {
			'Content-Type': 'text/html'
		});
		list = JSON.stringify(list);
		console.log(list);
		res.end(list);
	});
});

function getList(artist, song, callback) {
	lyrics.fetch(artist, song, function(err, lyrics) {
		if (err) throw err;
		var cloud = {};
		lyrics = lyrics.split("\n");
		lyrics.forEach(function(line) {
			line = line.replace(/\"\'.*:\"\'/g, "");
			line = line.split(" ");
			line.forEach(function(word) {
				word = word.replace(/[^a-zA-Z\']/g, "");
				if (word != "") {
					if (cloud.hasOwnProperty(word.toLowerCase())) {
						word = word.toLowerCase();
					}
					cloud[word] = (cloud[word] + 1) || 1;
				}
			});
		});
		var list = [];
		for (var word in cloud) {
			list.push([word, cloud[word]]);
		}
		var searchArtist = artist;
		var searchSong = song;
		searchArtist.replace(/\s/g, "+");
		searchSong.replace(/\s/g, "+");

		getArtist(searchArtist, searchSong, function(result) {
			getAlbum(result.tracks.items[0].album.id, function(album) {
				getAlbumColors(album.images[0], function(colors) {
					list.push(colors);
					callback(list);
				});

			});
		});
	});
}

function getArtist(artist, song, callback) {
	var url = 'https://api.spotify.com/v1/search?q=track:' + song + '%20artist:' + artist + '&type=track&market=SE';
	spotify
		.request(url)
		.then(function(data) {
			callback(data);
		})
		.catch(function(err) {
			console.error('Error occurred: ' + err);
		});
}

function getAlbums(id, callback) {
	var url = 'https://api.spotify.com/v1/artists/' + id + '/albums?market=SE&limit=40';
	spotify
		.request(url)
		.then(function(data) {
			callback(data);
		})
		.catch(function(err) {
			console.error('Error occurred: ' + err);
		});
}

function getAlbum(id, callback) {
	var url = 'https://api.spotify.com/v1/albums/' + id + '?market=SE&limit=1';
	spotify
		.request(url)
		.then(function(data) {
			callback(data);
		})
		.catch(function(err) {
			console.error('Error occurred: ' + err);
		});
}

function getTracks(id, callback) {
	var url = 'https://api.spotify.com/v1/albums/' + id + '/tracks';
	spotify
		.request(url)
		.then(function(data) {
			callback(data);
		})
		.catch(function(err) {
			console.error('Error occurred: ' + err);
		});
}

function getLyrics(artist, song, callback) {
	console.log("trying to find " + artist + " " + song);
	var songText = lyrics.fetch(artist, song, function(err, lyrics) {
		if (err) throw err;
		callback(songText);
	});
}

function getAlbumColors(url, callback) {
	request.get(url, function(err, res, body) {
		data = "data:" + res.headers["content-type"] + ";base64," + new Buffer.from(body).toString('base64');
		getColors(data, 'image/jpg').then(colors => {
			var hexColors = [];
			colors.map(color => color.hex());
			colors.forEach(function(color) {
				hexColors.push(color.hex());
			})
			callback(hexColors);
		});
	});
}

app.listen(port);
console.log("server up on port: " + port);
