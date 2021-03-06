const mongoose = require('mongoose');

// Schemas
const User = require('./models/User');
const Party = require('./models/Party');
const PartyUser = require('./models/PartyUser');
const Counter = require('./models/Counter');
const Song = require('./models/Song');
const Album = require('./models/Album');

// Database connection
const dbUrl = require('./config/keys.js').mongoURI;
mongoose
    .connect(dbUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(db = mongoose.connection)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

///////////////////////////////////////////////
// USER METHODS
///////////////////////////////////////////////

// Store users to DB with the same signature as previous User() function
async function makeNewUser(name, spotifyId, uri, accessToken, refreshToken) {
    var tempId = await getNextCounter('users');
    var newUser = new User({
        _id: tempId,
        name: name,
        spotifyId: spotifyId,
        uri: uri,
        parties: [],
        accessToken: accessToken,
        refreshToken: refreshToken
    });
    await newUser.save().then(result => console.log('Saved to DB: ', result));
    return tempId;
}

async function makeNewParty(host, playlistName, playlistId, genres, duration) {
    console.log('Making new party');
    const tempId = await getNextCounter('parties');
    const tempData = {
        _id: tempId,
        members: [host],
        host: host,
        playlistName: playlistName,
        playlistId: playlistId,
        genres: genres,
        duration: duration
    };
    var newParty = new Party(tempData);
    await newParty.save().then(result => console.log('Party saved to DB: ', result))
    return tempId;
}

async function updateParty(playlistName, playlistId, genres, duration) {
    console.log("Info on genres at dbMethod:updateParty")
    console.log(typeof genres)
    console.log(genres)
    await Party.updateOne({
        playlistId: playlistId
    }, {
        $set: {
            playlistName: playlistName,
            genres: genres,
            duration: duration
        }
    })
}

async function makeNewPartyUser(spotifyId, role) {
    console.log('Making new party user');
    const userInfo = await getUserInfoFromSpotifyId(spotifyId);
    var newPartyUser = {
        name: userInfo.name,
        spotifyId: spotifyId,
        role: role,
        uri: userInfo.uri,
        joinTime: Date.now()
    };
    return newPartyUser;
}

async function getUsers(id) {
    const users = await User.findOne({
        spotifyId: id
    });
    return typeof users !== 'undefined' && users;
}

async function getNextCounter(collection) {
    var result = await Counter.findOne({
        _id: collection
    });
    var promise = await Counter.updateOne({
        _id: collection
    }, {
        $inc: { 'value': 1 }
    });
    return result.value;
}

async function getUserId(spotifyId) {
    var result = await User.findOne({
        spotifyId: spotifyId
    });
    return result._id;
}

async function getUserInfo(id) {
    const info = await User.findOne({
        _id: id
    });
    return info;
}

async function getUserInfoFromSpotifyId(spotifyId) {
    const info = await User.findOne({
        spotifyId: spotifyId
    });
    return info;
}

async function getAccessToken(id) {
    const info = await User.findOne({
        _id: id
    });
    return info.accessToken;
}

async function getPartyInfo(playlistId) {
    console.log(`* getPartyInfo called with playlistId: ${playlistId} `);
    const info = await Party.findOne({
        playlistId: playlistId
    });
    console.log(`* getPartyInfo returning info NOW`);
    return info;
}

async function updateTokens(spotifyId, accessToken, refreshToken) {
    await User.updateOne({
        spotifyId: spotifyId
    }, {
        $set: {
            accessToken: accessToken,
            refreshToken: refreshToken
        }
    })
}

async function addParty(userId, playlistId) {
    await User.updateOne({ _id: userId }, {
        $push: { parties: playlistId }
    })
}

async function joinParty(spotifyId, playlistId) {
    const newUser = await makeNewPartyUser(spotifyId, 'guest');
    await Party.updateOne({ playlistId: playlistId }, {
        $push: {
            members: newUser
        }
    });
    await User.updateOne({ spotifyId: spotifyId }, {
        $push: {
            parties: spotifyId
        }
    });
}

async function getCurrentStats() {
    const listeners = await User.count();
    const parties = await Party.count();
    const ret = {
        "users": listeners,
        "parties": parties
    }
    return ret;
}

// TODO: Update party function (new spotify link, host, etc)

///////////////////////////////////////////////
// SONG/PLAYLIST METHODS
///////////////////////////////////////////////

// Retrieve song bank for a party
async function getSongBank(playlistId) {
    var result = await Party.findOne({
        playlistId: playlistId
    });
    return result.songs;
}

// Append new user's songs to party's song bank
async function addSongs(songList, playlistId) {
    var songBank = {};
    const currSongs = await getSongBank(playlistId);
    currSongs.forEach(song => {
        songBank[song.link] = song;
    });
    songList.forEach(song => {
        if (song.link in songBank) {
            songBank[song.link].score++;
        } else {
            songBank[song.link] = song;
        }
    });
    await Party.updateOne({ playlistId: playlistId }, {
        $set: {
            songs: []
        }
    });
    Object.keys(songBank).forEach(async song => {
        await Party.updateOne({ playlistId: playlistId }, {
            $push: {
                songs: songBank[song]
            }
        });
    });
}

// Get the current albums in the database
async function getAlbums() {
    console.log("* getAlbums called")
    const albums = await Album.find();
    return albums;
}

// Adds user's top tracks' albums to database
async function addAlbums(body) {
    console.log("* addAlbums called");
    var songList = JSON.parse(body).items;
    for (const song of songList) {
        var exists = await Album.findOne({ id: song.album.id });
        if (exists) {
            await Album.updateOne({ id: song.album.id }, {
                $inc: {
                    count: 1
                }
            });
        } else {
            const newAlbum = new Album({
                id: song.album.id,
                name: song.album.name,
                artist: song.album.artists[0].name,
                count: 1,
                art: song.album.images[1].url,
                link: song.album.external_urls.spotify
            });
            await newAlbum.save().then(result => console.log('Saved to DB: ', result));
        }
    }
}

// Get 20 most popular albums
async function getMostPopularAlbums() {
    var albums = await Album.find().sort({
        count: -1
    }).limit(12);
    return albums;
}

module.exports = {
    makeNewUser: makeNewUser,
    makeNewParty: makeNewParty,
    updateParty: updateParty,
    makeNewPartyUser: makeNewPartyUser,
    getUsers: getUsers,
    getNextCounter: getNextCounter,
    getUserId: getUserId,
    getUserInfo: getUserInfo,
    getUserInfoFromSpotifyId: getUserInfoFromSpotifyId,
    getAccessToken: getAccessToken,
    getPartyInfo: getPartyInfo,
    updateTokens: updateTokens,
    addParty: addParty,
    joinParty: joinParty,
    getCurrentStats: getCurrentStats,
    getSongBank: getSongBank,
    addSongs: addSongs,
    getAlbums: getAlbums,
    addAlbums: addAlbums,
    getMostPopularAlbums: getMostPopularAlbums
}