const express = require('express')
const app = express()
const port = process.env.PORT || 3000
require('dotenv').config()

const cors = require('cors')
const cookieParser = require('cookie-parser')
const querystring = require('querystring')

const clientId = process.env.clientID
const clientSecret = process.env.clientSecret
const redirectUri = 'http://localhost:3000/callback'

const generateRandomString = function (length) {
    let text = ''
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
}

const stateKey = 'spotify_auth_state'
app.use(express.static(__dirname + 'static'))
app.use(cors())
app.use(cookieParser)

app.get('/', (req, res) => res.send('Hello World!'))
app.get('/login', function (req, res) {
    const state = generateRandomString(16)
    res.cookie(stateKey, state)

    const scope = 'user-read-private user-read-email'
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: clientId,
            scope: scope,
            redirect_uri: redirectUri,
            state: state
        })
    )
})
app.get('/callback', function (req, res) {
    const code = req.query.code || null
    const state = req.query.state || null
    const storedState = req.cookies ? req.cookies[stateKey] : null

    if(state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }))
    } else {
        res.clearCookie(stateKey)
        const authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(clientId + clientSecret).toString('base64'))
            },
            json: true
        }

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                const access_token = body.access_token,
                      refresh_token = body.refresh_token

                const options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token},
                    json: true
                }

                request.get(options, function (error, response, body) {
                    console.log(body)
                })

                res.redirect('/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }))
            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    })
                )
            }
        })
    }
})

app.get('/refresh_token', function (req, res) {
    const refresh_token = req.query.refresh_token
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(clientId + ':' + clientSecret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    }

    request.post(authOptions, function (error, response, body) {
        if(!error && response.statusCode === 200) {
            const access_token = body.access_token
            res.send({
                'access_token': access_token
            })
        }
    })
})

app.listen(port, function () {
    // eslint-disable-next-line no-console
    console.log('Listening on port', port)
})
