var express = require('express');
var fs = require('fs');
var express = require('express');
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
		//var list = [];
		console.log(req.query.artist);
		console.log(req.query.song);
		var artist = req.query.artist;
		var song = req.query.song;


		getList2(artist, song, function(list) {
				res.writeHead(200, {
						'Content-Type': 'text/html'
						});
				list = JSON.stringify(list);
				console.log(list);
				res.end(list);
				});
		});

function getList2(artist, song, callback) {

	lyrics.fetch(artist, song, function(err, lyrics) {
			if (err) throw err;

			//console.log(artist, trackList[]);
			//console.log(artist, selectedTrack);
			//console.log(lyrics);
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
				//if (cloud[word] > 0) {
				list.push([word, cloud[word]]);
				//}
			}
			var searchArtist = artist;
			var searchSong = song;
			searchArtist.replace(/\s/g, "+");
			searchSong.replace(/\s/g, "+");

			getArtist2(searchArtist, searchSong, function(result) {
					getAlbum(result.tracks.items[0].album.id, function(album) {
							getAlbumColors(album.images[0], function(colors) {
									list.push(colors);
									callback(list);
									});

							});
					});
	});
}

app.get('/list2', function(req, res) {
		//var list = [];
		console.log(req.query.artist);
		console.log(req.query.song);
		var artist = req.query.artist;
		var searchArtist = artist;

		var song = req.query.song;
		var searchSong = song;

		searchArtist.replace(/\s/g, "+");
		searchSong.replace(/\s/g, "+");


		getList(artist, song, function(list) {
				res.writeHead(200, {
						'Content-Type': 'text/html'
						});
				list = JSON.stringify(list);
				//console.log(list);
				res.end(list);
				});

		//  JSON.stringify(list);

});



var spotify = new Spotify({
id: process.env.SPOTIFYID,
secret: process.env.SPOTIFYSECRET
});



function getList(artist, callback) {
	getArtist2(artist, function(id) {
			getAlbums(id, function(albums) {
					var discoGraphy = [];
					albums.items.forEach(function(album) {
							//console.log(album);
							//console.log(album.images[2].url);
							//console.log(album.name);
							discoGraphy.push({
									"name": album.name,
									"id": album.id,
									"image": album.images[0].url
									});
							});
					//array with entire spotify discography of artist
					discoGraphy = _.uniqBy(discoGraphy, "name");
					//console.log(discoGraphy);
					//console.log(discoGraphy);
					//lets get all the tracks for the first album for now
					var trackList = [];
					var selectedAlbum = discoGraphy[7];
					//console.log(selectedAlbum);
					getTracks(selectedAlbum.id, function(tracks) {
							tracks.items.forEach(function(track) {
									trackList.push(track.name);
									});
							selectedTrack = trackList[2];
							selectedTrack = selectedTrack.replace(/ *\([^)]*\) */g, "");
					selectedTrack = selectedTrack.replace(/- remastered.*/ig, "");
					//console.log(selectedTrack);
					//trackList now contains all tracks for first album, lets try get lyrics for the song.
					lyrics.fetch(artist, selectedTrack, function(err, lyrics) {
							//console.log(artist, trackList[]);
							//console.log(artist, selectedTrack);
							//console.log(lyrics);
							var cloud = {};
							lyrics = lyrics.split("\n");
							lyrics.forEach(function(line) {
									line = line.replace(/\"\'.*:\"\'/g, "");
									line = line.split(" ");
									line.forEach(function(word) {
											word = word.replace(/\W/g, '');
											if (word != "I") {
											word = word.toLowerCase();
											}
											if (word != "") {
											cloud[word] = (cloud[word] + 1) || 1;
											}
											});
									});
							var list = [];
							for (var word in cloud) {
								if (cloud[word] > 1) {
									list.push([word, cloud[word]]);
								}
							}
							//console.log("image:");
							//console.log(selectedAlbum.image);
							getAlbumColors(selectedAlbum.image, function(colors) {
									list.push(colors);
									callback(list);
									//console.log("returning list");
									});
							//callback(list);
							//console.log("returning list");
							//return list;
					});
					});
			});
	});
}


function getArtist(artist, callback) {
	spotify.search({
type: 'artist',
query: artist
}, function(err, data) {
if (err) {
return console.log('Error occurred: ' + err);
}

data.artists.items.forEach(function(id) {
	if (id.name == artist) {
	callback(id.id);
	}
	});

});
}

function getArtist2(artist, song, callback) {
	//var url = 'https://api.spotify.com/v1/search?q=artist:' + artist + '&type=track&market=SE';
	var url = 'https://api.spotify.com/v1/search?q=track:' + song + '%20artist:' + artist + '&type=track&market=SE';
	//var url = 'https://api.spotify.com/v1/search?q=tania%20bowra&type=artist';
	//console.log(url);
	spotify
		.request(url)
		.then(function(data) {
				//console.log(data.artists.items[0]);
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
			//console.log(songText)
			callback(songText);
			//);
	});
}

function getAlbumColors(url, callback) {
	request.get(url, function(err, res, body) {
			data = "data:" + res.headers["content-type"] + ";base64," + new Buffer.from(body).toString('base64');
			getColors(data, 'image/jpg').then(colors => {
					// `colors` is an array of color objects
					var hexColors = [];
					colors.map(color => color.hex());
					colors.forEach(function(color) {
							hexColors.push(color.hex());
							})
					//console.log(colors);
					//console.log(colors[0].hex());
					callback(hexColors);
					});
			});
}

app.listen(8080);
console.log("server up on port 8080");
//getLyrics(artist, song, function(songText) {
//  console.log(songText);
//});

