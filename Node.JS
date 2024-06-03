const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const PayPal = require('paypal-rest-sdk');
const User = require('./models/User'); // Define User model in models/User.js
const Item = require('./models/Item'); // Define Item model in models/Item.js

const app = express();

mongoose.connect('mongodb://localhost:27017/marketplace', { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(require('express-session')({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

PayPal.configure({
    'mode': 'sandbox', // or 'live'
    'client_id': 'YOUR_CLIENT_ID',
    'client_secret': 'YOUR_CLIENT_SECRET'
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

app.post('/sell', isLoggedIn, (req, res) => {
    const newItem = new Item({
        name: req.body.name,
        price: req.body.price,
        seller: req.user._id
    });
    newItem.save((err) => {
        if (err) {
            res.send(err);
        } else {
            res.redirect('/');
        }
    });
});

app.post('/buy/:itemId', isLoggedIn, (req, res) => {
    const itemId = req.params.itemId;
    Item.findById(itemId, (err, item) => {
        if (err) {
            res.send(err);
        } else {
            const create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": "http://return.url",
                    "cancel_url": "http://cancel.url"
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": item.name,
                            "sku": "001",
                            "price": item.price,
                            "currency": "USD",
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "currency": "USD",
                        "total": item.price
                    },
                    "description":
