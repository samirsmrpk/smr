/**
 * Created By,
 * Muhammad Zahid 20-04-2022
 * email : zahidnasim@live.com
 * ===========================
 * Including config to use in the code 
 */

 const dotenv = require('dotenv').config();
 const express = require('express');
 const app = express();
 const crypto = require('crypto');
 const cookie = require('cookie');
 const nonce = require( 'nonce')();
 const querystring = require('querystring');
 const request = require('request-promise');
 const apiKey = process.env.SHOPIFY_API_KEY;
 const apiSecret = process.env.SHOPIFY_API_SECRET;
 const scopes = 'write_products,read_orders,write_orders,read_products,write_products,read_draft_orders,write_draft_orders';
 const forwardingAddress = "https://express-joeyco.herokuapp.com"; // Repl
 const mysql = require('mysql');
 const port = process.env.PORT || 3000;
 var shop_name = ""; 
 var fs = require('fs');

/**
 * DB connection 
 */

 var pool = mysql.createPool({
    host: "127.0.0.1",
    user: "username",
    password: "password",
    database: "database_name",
    multipleStatements: true
});  


 
/**
 * index url for testing
 */

app.get('/', (req, res) => {   
    res.send('Hello world!');
});

/**
 * url for shopify app
 */

 app.get('/auth',(req,res) => {
    const shop = req.query.shop;
    if (shop) {
        const state = nonce();
        const redirectUri = forwardingAddress + '/auth/callback';
        const installUrl = 'https://' + shop + '/admin/oauth/authorize?client_id=' + apiKey +
        '&scope=' + scopes + 
        '&state='+ state +
        '&redirect_uri=' + redirectUri;
        res.cookie('state', state);
        res.setHeader(
            'Content-Security-Policy',
            `frame-ancestors https://${shop} https://admin.shopify.com`
          );
        res. redirect(installUrl);        
    } else {
        return res.status(400).send('missing shop parameter. Please add shop')
    }
    
});

/**
 * call back url for shopify app to install
 */

 app.get('/auth/callback',(req,res) => {
    const { shop, hmac, code, state } = req.query;
    const stateCookie = cookie.parse(req.headers.cookie).state;
    console.log(state+' '+stateCookie);
    if(state !== stateCookie) {
        fs.readFile('index.html',null,function(error,data){
            if(error){
                res.writeHead(404);
            }
            else{
                res.write(data);
            }
        });
        return;
    }
    if (shop && hmac && code) {
        const map = Object.assign({}, req.query);
        delete map['hmac'];
        const message = querystring.stringify(map);
        const generatedHash = crypto
        .createHmac('sha256', apiSecret)
        .update(message)
        .digest('hex');
        /**
         * matching hash and hmac
         */

        if(generatedHash !== hmac) {
            return res.status(400).send('MAC validation failed');
        }
        const accessTokenRequestUrl = 'https://'+shop +'/admin/oauth/access_token';
        const accessTokenPayload =  {
            client_id :apiKey,
            client_secret :apiSecret,
            code            
        }

        /**
         * Validating request to receive access token
         */
                    
         request.post(accessTokenRequestUrl, {json: accessTokenPayload })
         .then((accessTokenResponse) => {
             const accessToken = accessTokenResponse.access_token;
             const apiRequestUrl ='https://' + shop + '/admin/api/2022-01/webhooks.json';
             const apiRequestHeader = {
                 'X-Shopify-Access-Token' : accessToken
             }

             /**
              * Retrieving shops data 
              */

             var result = "some text";
             shop_name = shop;
             const apiRequestShopUrl='https://' + shop + '/admin/api/2022-01/shop.json';
             request.get(apiRequestShopUrl, { headers: apiRequestHeader })
             .then((apiResponse) =>{
                 var shop_data = JSON.parse(apiResponse);
                 result = shop_data.shop;
                 console.log(accessToken+' '+JSON.stringify(result));
                  
                /**
                 * Curl request to php
                 */
                const axios = require('axios')

             })
             .catch((error) =>{
                 res.status(error.statusCode).end(error.error.error_description);
             });

             /**
              * Creating Webhook for order creation
              */

             var options = {
                 'method': 'POST',
                 'url': apiRequestUrl,
                 'headers': {
                 'X-Shopify-Access-Token': accessToken,
                 'Content-Type': 'application/json'
                 },
                 body: JSON.stringify({
                 "webhook": {
                     "topic": "orders/create",
                     "address": "https://api.joeyco.com/order/create/shopify",
                     "format": "json",
                     },
                 })
             };
             request(options, function (error, response) {
                if (error) throw new Error(error);
            });


            /**
              * Create webhook for order cancel
              */
             var options_cancel = {
                'method': 'POST',
                'url': apiRequestUrl,
                'headers': {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                "webhook": {
                    "topic": "orders/cancelled",
                    "address": "https://api.joeyco.com/shopify/status/update",
                    "format": "json",
                    },
                })
               };
            request(options_cancel, function (error, response) {
                if (error) throw new Error(error);
            });

             /**
              * Create webhook for order fulfill
              */
              var options_close = {
                'method': 'POST',
                'url': apiRequestUrl,
                'headers': {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                "webhook": {
                    "topic": "orders/fulfilled",
                    "address": "https://api.joeyco.com/orders/fulfilled/shopify",
                    "format": "json",
                    },
                })
               };
            request(options_close, function (error, response) {
                if (error) throw new Error(error);
            });

            /**
             * Create webhook for order updated
             */
            var options_update = {
                'method': 'POST',
                'url': apiRequestUrl,
                'headers': {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                "webhook": {
                    "topic": "orders/updated",
                    "address": "https://api.joeyco.com/shopify/order/update",
                    "format": "json",
                    },
                })
            };
            request(options_update, function (error, response) {
                if (error) throw new Error(error);
                console.log(response.body);

            });

            /**
              * Create webhook for order deleted
              */
             var options_del = {
                'method': 'POST',
                'url': apiRequestUrl,
                'headers': {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                "webhook": {
                    "topic": "orders/delete",
                    "address": "https://api.joeyco.com/shopify/status/update",
                    "format": "json",
                    },
                })
               };
            request(options_del, function (error, response) {
                if (error) throw new Error(error);
            });
            
            /**
             * Getting installed webhook details
             */
            var options_webhooks = {
                'method': 'GET',
                'url': apiRequestUrl,
                'headers': {
                  'X-Shopify-Access-Token': accessToken,
                  'Content-Type': 'application/json',
                }
            }; 
            request(options_webhooks, function (error, response) {
                if (error) throw new Error(error);
                console.log(response.body);
            });

         })
         .catch((error) => {
             res.status(error.statusCode).send(error.error.error_description);
         });
    } 
    else {
        res.status(400).send('Required parameters nissing');
    }
    res.writeHead(301, {
        Location: "https://"+shop+"/admin/apps/express-joeyco"
      });
    res.end('Hello world');    
});

/**
 * Shopify view
 */
 app.get('https://'+shop_name+'/admin/apps/express-joeyco', (req, res) => {   
    res.send('Hello world!');
});

app.listen (port, () => {
    console.log("App is listenin at port 3000");
});